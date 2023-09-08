import { CustomEvent } from "../events/Event";
import { bufferPool, NetworkHandler } from "./NetWorkHandler";
import { ByteArray } from "./ByteArray";
import { EventTarget, director, game, Scheduler, ISchedulable, Game, macro } from "cc";
import { DEBUG } from "cc/env";
import { log } from "../base/debugUtil";
import { getUuid } from "../base/uuid";

export class NetEvent extends CustomEvent {
    public cmd: number;
    public seq: number;
    public msg: any;
}

export interface INetSuccessCallback {
    (event: NetEvent): void
}

export interface INetFailureCallback {
    (code: number): void
}

interface INetPendingCallback {
    timeout: number,
    startTime: number,
    success: Function,
    failure: Function,
    noLayer: boolean
}

export let NET_DEBUG = DEBUG;
var P; // Protocal

export class GameNet extends EventTarget implements ISchedulable {
    private _cmd2Protocol: { [cmd: number]: string } = {};
    private _pendingCallbacks: { [seq: number]: INetPendingCallback } = {};
    private _timeoutCallBacks: { [seq: number]: INetPendingCallback } = {};

    private _reconnecting: boolean = false;
    private _reconnectTimes: number = 0;

    private _keepAliveRecord: { seq: number, time: number }[] = [];

    private _protobufReader: any = (<any>window).protobuf.Reader.create(new Uint8Array(0));
    private _protobufWriter: any = (<any>window).protobuf.Writer.create();

    public network: NetworkHandler;
    public id?: string;
    public uuid?: string;

    private _nextSeq = function () {
        let seq = 0;
        return function () {
            if (seq > 0xFFFE)
                seq = 0;

            return ++seq;
        }
    }();
    private _timeoutTimer: number;
    private _gameShowTimer: number;

    public constructor() {
        super();

        // director.getScheduler().enableForTarget(this);
        this.id = 'GameNet';
        this.uuid = getUuid();
        Scheduler.enableForTarget(this);

        this._initCmd2Protocol();

        let ins = this.network = new NetworkHandler();
        ins.on("onSocketData", this._onSocketData, this);
        ins.on("connect", () => {
            this._keepAlive();
            if (this._reconnecting) {
                this._removeReconnectTimer();
                this._hideWaitLayer();
                this._reconnectTimes = 0;

                if (this.relogin) {
                    this.relogin(() => {
                        log("connect reestablished");
                        this.emit("connectReestablished", true);
                        this._reconnecting = false;
                    }, () => {
                        this.emit("connectReestablished", false);
                        this._reconnecting = false;
                    });
                } else {
                    log("connect reestablished");
                    this.emit("connectReestablished", true);
                    this._reconnecting = false;
                }
            } else {
                this.emit("connect");
            }
        }, this);

        ins.on("ioError", function () {
            this._reconnecting = false;
            this.emit("ioError");
        }, this);

        ins.on("close", function () {
            this._reconnecting = false;
            this.emit("close");
        }, this);

        let func = () => {
            this._checkTimeOut();
            this._timeoutTimer = setTimeout(func, 500);
        }
        this._timeoutTimer = setTimeout(func, 500);

        game.on(Game.EVENT_SHOW, this._onGameShow, this);
    }

    private _initCmd2Protocol(): void {
        let _P = P;
        for (let key in _P) {
            if (_P[key].cmd)
                this._cmd2Protocol[_P[key].cmd] = key;
        }
    }

    private _onGameShow() {
        log("on show!!!");
        this._gameShowTimer = setTimeout(() => {
            this._gameShowTimer = null;
            if (!this.network.connected())
                this._reconnect();
        }, 500);
    }

    private _onSocketData(data: { cmd: number, seq: number, buf: ByteArray }) {
        let _P = P;

        let cmd = data.cmd;
        let seq = data.seq;
        let buf = data.buf;

        let protocolStr = this._cmd2Protocol[cmd];
        if (!protocolStr) {
            log(`unknown cmd: ${cmd} seq: ${seq}`);
            return;
        }
        let msg: any = _P[protocolStr].decode(this._createReader(buf.buffer));
        // buf.position = 0;
        // buf.length = 0;
        // ObjectPool.push(buf);
        bufferPool.put(buf);

        if (NET_DEBUG && cmd != P.net_heart_s2c.cmd && cmd != _P.public_success_s2c.cmd)
            log(`received ${protocolStr} seq: ${seq} data:`, msg.toJSON());

        let pending = this._pendingCallbacks[seq];
        if (pending) {
            delete this._pendingCallbacks[seq];
            if (cmd == _P.public_failure_s2c.cmd) {
                // 请求失败
                pending.failure && pending.failure(msg.ecode);
                this.emit("errorCode", msg);
            } else if (pending.success) {
                // 请求成功
                let netEvent = CustomEvent.create(NetEvent, protocolStr);
                netEvent.cmd = cmd;
                netEvent.seq = seq;
                netEvent.msg = msg;
                pending.success(netEvent);
                netEvent.msg = undefined;
                CustomEvent.release(netEvent);
            } else {
                let netEvent = CustomEvent.create(NetEvent, protocolStr);
                netEvent.cmd = cmd;
                netEvent.seq = seq;
                netEvent.msg = msg;
                this.emit(protocolStr, netEvent);
                netEvent.msg = undefined;
                CustomEvent.release(netEvent);
            }
        } else if (cmd == _P.public_failure_s2c.cmd) {
            // 请求失败
            this.emit("errorCode", msg);
        } else if (this.hasEventListener(protocolStr)) {
            // 后端推送协议
            let netEvent = CustomEvent.create(NetEvent, protocolStr);
            netEvent.cmd = cmd;
            netEvent.seq = seq;
            netEvent.msg = msg;
            // try {
            this.emit(protocolStr, netEvent);
            // } catch (err) {
            //     error(err);
            // }
            netEvent.msg = undefined;
            CustomEvent.release(netEvent);
        } else if (cmd == _P.net_heart_s2c.cmd) {
            // 心跳包
            while (this._keepAliveRecord.length) {
                let r = this._keepAliveRecord[0];
                let _seq = r.seq;
                if (seq == _seq) {
                    let now = Date.now();
                    let diff = now - r.time;
                    this._serverDTime = Math.floor(0.5 + (Number(msg.nowMs) + 0.5 * diff - now));
                    this._netDelay = diff;
                    this._keepAliveRecord.shift();
                } else {
                    if (_seq > seq)
                        break;
                    this._keepAliveRecord.shift();
                }
            }
        } else if (cmd != _P.public_success_s2c.cmd) {
            log(`${protocolStr} hasn't listener`);
        }

        for (let _ in this._pendingCallbacks)
            return;

        this._hideWaitLayer();
    }

    private _checkTimeOut() {
        let hasLayer = false;
        let now = Date.now();
        for (let seq in this._pendingCallbacks) {
            let pending = this._pendingCallbacks[seq];
            if (pending.timeout <= now) {
                this._timeoutCallBacks[seq] = pending;
            } else {
                if (!pending.noLayer) {
                    hasLayer = true;
                }
            }
        }

        for (let seq in this._timeoutCallBacks) {
            let pending = this._timeoutCallBacks[seq];
            delete this._timeoutCallBacks[seq];
            delete this._pendingCallbacks[seq];
            if (pending.failure) {
                log(`seq: ${seq} TimeOut`);
                pending.failure(100);
            }
        }

        if (!hasLayer)
            this._hideWaitLayer();

        if (this._keepAliveRecord.length) {
            let invalidRecordCount: number = 0;
            let now = Date.now();
            for (let record of this._keepAliveRecord) {
                if (record.time + 6000 <= now) {
                    invalidRecordCount++;
                }
            }
            if (invalidRecordCount >= 2)
                this.emit("netHeartBlock");
        }
    }

    public pause() {
        this.network.pause();
    }

    public resume() {
        this.network.resume();
    }

    public send(request: any, data?: any) {
        let seq = this._nextSeq();
        let cmd = request.cmd;

        if (NET_DEBUG && cmd != P.net_heart_c2s.cmd)
            log(`send ${this._cmd2Protocol[cmd]} seq: ${seq}`, data ? "data:" : "", data || "");

        if (this.network.connected()) {
            this._protobufWriter.reset();
            let w = request.encode(data, this._protobufWriter);
            let buffer = w.finish();
            this.network.send(seq, cmd, buffer, w.len);
        } else {
            this._reconnect();
        }

        return seq;
    }

    public call(request: any, data?: any, success?: INetSuccessCallback, failure?: INetFailureCallback, thiz?: any, timeout: number = 6000) {
        let seq = this.send(request, data);
        let noWaitLayer = false;
        if (timeout < 0) {
            noWaitLayer = true;
            timeout = -timeout;
        }

        let now = Date.now();
        let pendingCallback: INetPendingCallback = {
            timeout: now + timeout,
            startTime: now,
            success: function (...args: any[]) {
                if (success)
                    success.apply(thiz, args);
            },
            failure: function (...args: any[]) {
                if (failure)
                    failure.apply(thiz, args);
            },
            noLayer: noWaitLayer
        };
        this._pendingCallbacks[seq] = pendingCallback;
        if (!noWaitLayer)
            this._showWaitLayer();
        return seq;
    }

    private _reconnectTimer: boolean = false;
    private _reconnect() {
        if (!this._noMoreConnected) {
            if (this._reconnecting) {
                this.network.connect();
            } else {
                this._doReconnect();

                if (!this._reconnectTimer) {
                    this._reconnectTimer = true;

                    director.getScheduler().schedule(this._reconnectUpdate, <any>this, 1, macro.REPEAT_FOREVER, 0, false);
                    this.emit("connectionLost");
                }
            }
        }
    }

    private _removeReconnectTimer() {
        if (this._reconnectTimer) {
            this._reconnectTimer = false;
            director.getScheduler().unschedule(this._reconnectUpdate, <any>this);
        }
    }

    private _reconnectUpdate() {
        this._reconnectTimes++;
        if (this.network.connected()) {
            this._removeReconnectTimer();
        } else {
            if (this._reconnectTimes >= 8) {
                this._removeReconnectTimer();
                this._reconnectTimes = 0;
            }
        }
    }

    private _doReconnect() {
        log("reconnect");
        this._reconnecting = true;
        this.network.connect();
    }

    private _showWaitLayer() {
        // viewManager.openNetWaitUI();
    }

    private _hideWaitLayer() {
        // viewManager.closeNetWaitUI();
    }

    public initServerTime(callback?: Function, failure?: Function) {
        if (this._serverDTime)
            if (callback) callback();
        let now = Date.now();
        this.call(P.net_heart_c2s, undefined, (evt: NetEvent) => {
            let _now = Date.now();
            let diff = _now - now;
            let msg/*: P.Inet_heart_s2c*/ = evt.msg;
            this._serverDTime = Math.floor(0.5 + (Number(msg.nowMs) + 0.5 * diff - _now));
            this._netDelay = diff;
            if (callback)
                callback();
        }, function (code) {
            log(`request failed (${code})`);
            if (failure)
                failure(code);
        });
    }

    private _keepAliveTimer: boolean = false;
    private _keepAlive() {
        let scheduler = director.getScheduler();
        if (this._keepAliveTimer) {
            scheduler.unschedule(this._keepAliveUpdate, <any>this);
            this._keepAliveTimer = false;
            this._keepAliveRecord.length = 0;
        }

        this._keepAliveTimer = true;
        scheduler.schedule(this._keepAliveUpdate, <any>this, 10, macro.REPEAT_FOREVER, 0, false);
    }

    private _keepAliveUpdate() {
        let seq = this.send(P.net_heart_c2s);
        let now = Date.now();
        let arr = this._keepAliveRecord;
        arr.push({ seq: seq, time: now });
        if (arr.length >= 15)
            arr.splice(0, 6);
    }

    private _createReader(buf: ArrayBuffer) {
        let uint8Arr = new Uint8Array(buf);
        let read = this._protobufReader;
        read.buf = uint8Arr;
        read.pos = 0;
        read.len = uint8Arr.length;
        return read;
    }

    public addListener(notify: any, listener: Function, thiz?: any) {
        let protocolStr = this._cmd2Protocol[notify.cmd];
        this.on(protocolStr, listener as any, thiz);
    }

    public removeListener(notify: any, listener: Function, thiz?: any) {
        let protocolStr = this._cmd2Protocol[notify.cmd];
        this.off(protocolStr, listener as any, thiz);
    }

    private _serverDTime: number;
    public get serverDTime(): number {
        return this._serverDTime;
    }

    private _netDelay: number;
    public get netDelay(): number {
        return this._netDelay;
    }

    private _noMoreConnected: boolean;
    public set noMoreConnected(b: boolean) {
        this._noMoreConnected = b;
        if (b) {
            this._keepAliveRecord.length = 0;
            director.getScheduler().unschedule(this._keepAliveUpdate, <any>this);
        }
    }

    public relogin?(success: Function, failure: Function): void;
    public dispose() {
        if (this._timeoutTimer != null) {
            clearTimeout(this._timeoutTimer);
        }
        if (this._gameShowTimer != null) {
            clearTimeout(this._gameShowTimer);
        }
        director.getScheduler().unscheduleAllForTarget(this);
        game.off(Game.EVENT_SHOW, this._onGameShow, this);
    }
}

export let gameNet: GameNet;
export function enable(iswss: boolean = false) {
    if (!gameNet) {
        gameNet = new GameNet();
        gameNet.network.iswss = iswss;
    }
}

export function init(ip: string, port: number) {
    gameNet.network.reset();
    gameNet.network.init(ip, port);
}

export function disable() {
    if (gameNet) {
        gameNet.network.reset();
        gameNet.dispose();
        gameNet = null;
    }
}

export function addListener(notify: any, listener: Function, thiz?: any) {
    if (!notify) return;
    gameNet.addListener(notify, listener, thiz);
}

export function removeListener(notify: any, listener: Function, thiz?: any) {
    if (!notify) return;
    gameNet.removeListener(notify, listener, thiz);
}

// 增加事件监听（socket连接、socket错误、socket关闭、错误码、心跳包阻塞、断开连接、重新建立连接）
export function addEventListener(
    type: "connect" | "ioError" | "close" | "errorCode" | "netHeartBlock" | "connectionLost" | "connectReestablished",
    listener: Function,
    thisObject?: any,
    once?: boolean) {
    gameNet.on(type, listener as any, thisObject, once);
}

export function removeEventListener(
    type: "connect" | "ioError" | "close" | "errorCode" | "netHeartBlock" | "connectionLost" | "connectReestablished",
    listener: Function,
    thisObject?: any
) {
    gameNet.off(type, listener as any, thisObject);
}

export function send(request: any, data?: any) {
    gameNet.send(request, data);
}

export function call(request: any, data?: any, success?: INetSuccessCallback, failure?: INetFailureCallback, thiz?: any, timeout: number = 6) {
    gameNet.call(request, data, success, failure, thiz, timeout * 1000);
}

export function getServerTime() {
    return gameNet != void 0 ?
        Date.now() + gameNet.serverDTime :
        new Date().getTime();
}

export function getServerTimeSec() {
    return getServerTime() * 1e-3 >> 0;
}

export function getServerTimeFloatSec() {
    return getServerTime() * 1e-3;
}

export function getServerDTime() {
    return gameNet.serverDTime;
}

export function pause() {
    gameNet.pause();
}

export function resume() {
    if (gameNet)
        gameNet.resume();
}

export function initServerTime(callback?: Function, failure?: Function) {
    gameNet.initServerTime(callback, failure);
}

export function noMoreConnect(value: boolean) {
    if (gameNet)
        gameNet.noMoreConnected = value;
}

export function setRelogin(relogin: (success: Function, failure: Function) => void) {
    gameNet.relogin = relogin;
}

export function connected() {
    return gameNet ? gameNet.network.connected() : false;
}

export function initAsync(ip: string, port: number) {
    return new Promise<void>(function (resolve, reject) {
        init(ip, port);
        function unregister() {
            removeEventListener("connect", onConnect, null);
            removeEventListener("connectReestablished", onConnect, null);
            removeEventListener("close", onError, null);
            removeEventListener("ioError", onError, null);
        }
        function onConnect() {
            unregister();
            resolve();
        }
        function onError() {
            unregister();
            reject();
        }
        addEventListener("connect", onConnect, null);
        addEventListener("connectReestablished", onConnect, null);
        addEventListener("close", onError, null);
        addEventListener("ioError", onError, null);
    });
}

export function initServerTimeAsync() {
    return new Promise<void>(function (resolve, reject) {
        initServerTime(resolve, reject);
    });
}

export function acall(request: any, data?: any, time?: number): Promise<any> {
    return new Promise(function (resolve, reject) {
        call(request, data, function (evt: NetEvent) {
            resolve(evt.msg);
        }, function (code) {
            reject(code);
        }, undefined, time);
    });
}

export const kSaveACallRetSuccess = 1;
export const kSaveACallRetFailure = 0;
export function save_acall<T = any>(request: any, data?: any, time?: number): Promise<{result: number, msg: T, code: number}> {
    return acall(request, data, time)
        .then(
            (msg) => {
                return {result: kSaveACallRetSuccess, msg: msg, code: 0};
            },
            (code) => {
                return {result: kSaveACallRetFailure, msg: null, code: code};
            }
        ) as Promise<{result: number, msg: T, code: number}>
}

export function create_save_reject(code: number = 0) {
    return Promise.resolve({result: kSaveACallRetFailure, msg: null, code: code})
}

export function gm(cmd: string) {
    send(P.chat_world_c2s, { parts: [{ content: '=' + cmd }] });
}

export function gmc(cmd: string) {
    return acall(P.chat_world_c2s, { parts: [{ content: '=' + cmd }] });
}
