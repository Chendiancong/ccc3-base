import { CustomEvent } from "../events/Event";
import { bufferPool, NetworkHandler } from "./NetWorkHandler";
import { ByteArray } from "./ByteArray";
import { EventTarget, director, game, Scheduler, ISchedulable, Game, macro } from "cc";
import { DEBUG } from "cc/env";
import { log } from "../base/debugUtil";
import { getUuid } from "../base/uuid";
// import { EnumGameAppState, GameAppState } from "../../../first-scene/scripts/GameAppState";
// import { kGameIternalOpenUIEvents } from "../../../first-scene/scripts/FirstSceneConst";

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
}

export let NET_DEBUG = DEBUG;
//Protocol
let innerP: any;

export class GameNet extends EventTarget implements ISchedulable {
    private _cmd2Protocol: { [cmd: number]: string } = {};
    private _pendingCallbacks: { [seq: number]: INetPendingCallback } = {};
    private _timeoutCallBacks: { [seq: number]: INetPendingCallback } = {};

    private _keepAliveRecord: { seq: number, time: number }[] = [];

    private _protobufReader: any = (<any>window).protobuf.Reader.create(new Uint8Array(0));
    private _protobufWriter: any = (<any>window).protobuf.Writer.create();

    public c2sLogFilters: { [cmd: number]: true } = {};
    public s2cLogFilters: { [cmd: number]: true } = {};
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

    private _tryConnectCnt: number = 0;

    public constructor() {
        super();
        this.id = 'GameNet';
        this.uuid = getUuid();
        Scheduler.enableForTarget(this);
        this._initCmd2Protocol();
        let ins = this.network = new NetworkHandler();
        ins.on("onSocketData", this._onSocketData, this);
        ins.on("connect", this._connetedFun, this);
        ins.on("ioError", function () {
            this.emit("ioError");
            this._showWaitLayer("ioError");
        }, this);

        ins.on("close", function () {
            this.emit("close");
            this._showWaitLayer("close");
            // if (gameInternal.appState.curState === EnumGameAppState.Loading) {
            //     gFramework.globalEvent.emit(kGameIternalOpenUIEvents.NET_LOST);
            // }
        }, this);

        ins.on("connectionLost", function () {
            this.emit("connectionLost");
            this._showWaitLayer("connectionLost");
        }, this);

        let func = () => {
            this._checkTimeOut();
            this._timeoutTimer = <any>setTimeout(func, 500);
        }
        this._timeoutTimer = <any>setTimeout(func, 500);

        Object.assign(this.c2sLogFilters, _c2sFilters);
        Object.assign(this.s2cLogFilters, _s2cFilters);

        game.on(Game.EVENT_HIDE, this._onGameHide, this);
        game.on(Game.EVENT_SHOW, this._onGameShow, this);
    }

    private _initCmd2Protocol(): void {
        let _P = innerP;
        for (let key in _P) {
            if (_P[key].cmd)
                this._cmd2Protocol[_P[key].cmd] = key;
        }
    }

    private _onGameHide() {
        log("on hide!!!");
        this._pauseTryToSilentConnect = true;
    }

    private _onGameShow() {
        log("on show!!!");
        this._pauseTryToSilentConnect = false;
        this._gameShowTimer = <any>setTimeout(() => {
            this._gameShowTimer = null;
            if (!this.network.connected()) {
                this.tryToSilentConnect();
            }
        }, 500);
    }

    private _duplicate(source: any) {
        if (source == void 0)
            return source;
        if (typeof source === "object") {
            if (Array.isArray(source)) {
                return (source as Array<any>).map(v => this._duplicate(v));
            } else {
                const propNames = Object.getOwnPropertyNames(source);
                const target = {};
                for (const pname of propNames)
                    target[pname] = this._duplicate(source[pname]);
                return target;
            }
        } else {
            return source;
        }
    }

    private _onSocketData(data: { cmd: number, seq: number, buf: ByteArray }) {
        let _P = innerP;

        let cmd = data.cmd;
        let seq = data.seq;
        let buf = data.buf;

        let protocolStr = this._cmd2Protocol[cmd];
        if (!protocolStr) {
            log(`unknown cmd: ${cmd} seq: ${seq}`);
            return;
        }
        let msg: any = _P[protocolStr].decode(this._createReader(buf.buffer));
        bufferPool.put(buf);
        if (NET_DEBUG && !this.s2cLogFilters[cmd]) {
            log(`received ${protocolStr} seq: ${seq} data:`, this._duplicate(msg));
        }

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
            this.emit(protocolStr, netEvent);
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
        let now = Date.now();
        for (let seq in this._pendingCallbacks) {
            let pending = this._pendingCallbacks[seq];
            if (pending.timeout <= now) {
                this._timeoutCallBacks[seq] = pending;
            }
        }
        for (let seq in this._timeoutCallBacks) {
            let pending = this._timeoutCallBacks[seq];
            delete this._timeoutCallBacks[seq];
            delete this._pendingCallbacks[seq];
            if (pending.failure) {
                log(`seq: ${seq} TimeOut ` + Net.getServerTimeSec());
            }
        }
        if (this._keepAliveRecord.length) {
            let invalidRecordCount: number = 0;
            let now = Date.now();
            for (let record of this._keepAliveRecord) {
                if (record.time + 5000 <= now) {
                    invalidRecordCount++;
                }
            }
            if (invalidRecordCount >= 2) {
                if (!this._reConnecting) {
                    this.emit("netHeartBlock");
                    gFramework.warn("netHeartBlock");
                    this._reConnecting = true;
                    this._doReLoadConnect();
                }
            }
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
        if (NET_DEBUG && !this.c2sLogFilters[cmd]) {
            log(`send ${this._cmd2Protocol[cmd]} seq: ${seq}`, data ? "data: " : "", data || "");
        }
        if (this.network.connected()) {
            this._protobufWriter.reset();
            let w = request.encode(data, this._protobufWriter);
            let buffer = w.finish();
            this.network.send(seq, cmd, buffer, w.len);
        } else {
            if (NET_DEBUG && this.c2sLogFilters[cmd]) {
                log(`send ${this._cmd2Protocol[cmd]} seq: ${seq}`, data ? "data: " : "", data || "");
            }
            this._gameShowTimer = <any>setTimeout(() => {
                this._gameShowTimer = null;
                if (!this.network.connected()) {
                    this.tryToSilentConnect();
                }
            }, 500);
        }
        return seq;
    }

    public call(request: any, data?: any, success?: INetSuccessCallback, failure?: INetFailureCallback, thiz?: any, timeout: number = 5000) {
        let seq = this.send(request, data);
        if (timeout < 0) {
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
            }
        };
        this._pendingCallbacks[seq] = pendingCallback;
        return seq;
    }

    private _pauseTryToSilentConnect: boolean = false;
    private _silentConnectTimer: boolean = false;
    /** 尝试静默重连  */
    tryToSilentConnect() {
        // todo check playing
        // if (gameInternal.appState.curState !== EnumGameAppState.Play) return;
        if (this._reConnecting) return;
        if (this._pauseTryToSilentConnect || this._rejectConnected) {
            this._removeSilentConnectTimer();
            return;
        }
        if (!this._noMoreConnected) {
            if (!this._silentConnectTimer) {
                log("*****enter silentConnect..");
                this._silentConnectTimer = true;
                director.getScheduler().schedule(this._silentConnectUpdate, <any>this, 3, macro.REPEAT_FOREVER, 0, false);
            }
        }
    }

    private _silentConnectUpdate() {
        if (!this.network.connected()) {
            if (this._tryConnectCnt <= 4) {
                log("*****silentConnect " + (this._tryConnectCnt + 1) + " times");
                this._keepAlive();
                this.network.connect();
                this._tryConnectCnt++;
            } else {
                this._doReLoadConnect();
            }
        } else {
            this._removeSilentConnectTimer();
        }
    }

    doTheReConnect() {
        this.network.reConnect();
    }

    /** 是否重连中 */
    private _reConnecting: boolean;

    /** 连上 */
    private _connetedFun() {
        if (this._silentConnectTimer) {
            log("*****silentConnect  success..");
            this._removeSilentConnectTimer();
            this._reConnetFun();
        } else {
            this._reConnecting = false;
            this._tryConnectCnt = 0;
        }
        this._keepAlive();
        this.emit("connect");
    }

    /** 重连 */
    private _reConnetFun() {
        if (this._noMoreConnected || this._reConnecting) return;
        if (this.reconnect) {
            this._reConnecting = true;
            this._keepAlive();
            this.reconnect(() => {
                this._hideWaitLayer();
                this._tryConnectCnt = 0;
                this._reConnecting = false;
            }, () => {
                this._showWaitLayer("reConnet fail");
                this._reConnecting = false;
            });
        } else {
            this._hideWaitLayer();
        }
    }

    /** 重登 */
    private _doReLoadConnect() {
        log("*****doRelogin~~！");
        this.emit("connectReestablished", true);
        this._removeSilentConnectTimer();
        if (this.relogin) {
            this._reConnecting = true;
            this._keepAlive();
            this.relogin(() => {
                log("relogin success");
                this._hideWaitLayer();
                this._reConnecting = false;
            }, () => {
                log("relogin fail");
                this._hideWaitLayer();
                this._reConnecting = false;
                this.emit("connectionLost");
            });
        }
    }

    private _removeSilentConnectTimer() {
        if (this._silentConnectTimer) {
            this._silentConnectTimer = false;
            director.getScheduler().unschedule(this._silentConnectUpdate, <any>this);
        }
    }

    private _showWaitLayer(reason: string) {
        gFramework.globalEvent.emit("openNetLostWaitUI", true, reason);
        gameNet.tryToSilentConnect();
    }

    private _hideWaitLayer() {
        gFramework.globalEvent.emit("openNetLostWaitUI", false);
    }

    public initServerTime(callback?: Function, failure?: Function) {
        if (this._serverDTime)
            if (callback) callback();
        let now = Date.now();
        // todo
        // this.call(P.net_heart_c2s, undefined, (evt: NetEvent) => {
        //     let _now = Date.now();
        //     let diff = _now - now;
        //     let msg/*: P.Inet_heart_s2c*/ = evt.msg;
        //     this._serverDTime = Math.floor(0.5 + (Number(msg.nowMs) + 0.5 * diff - _now));
        //     this._netDelay = diff;
        //     if (callback)
        //         callback();
        // }, function (code) {
        //     log(`request failed (${code})`);
        //     if (failure)
        //         failure(code);
        // });
    }

    private _keepAliveTimer: boolean = false;
    private _keepAlive() {
        this.noMoreConnected = false;
        let scheduler = director.getScheduler();
        if (this._keepAliveTimer) {
            scheduler.unschedule(this._keepAliveUpdate, <any>this);
            this._keepAliveTimer = false;
            this._keepAliveRecord.length = 0;
        }
        this._keepAliveTimer = true;
        scheduler.schedule(this._keepAliveUpdate, <any>this, 10, macro.REPEAT_FOREVER, 0, false);
        this._keepAliveUpdate();
    }

    private _keepAliveUpdate() {
        // todo
        // let seq = this.send(P.net_heart_c2s);
        // let now = Date.now();
        // let arr = this._keepAliveRecord;
        // arr.push({ seq: seq, time: now });
        // if (arr.length >= 15)
        //     arr.splice(0, 6);
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
            director.getScheduler().unschedule(this._keepAliveUpdate, <any>this);
        }
    }

    private _rejectConnected: boolean;
    public set rejectConnected(b: boolean) {
        this._rejectConnected = b;
        if (b) {
            this.noMoreConnected = true;
            director.getScheduler().unschedule(this._silentConnectUpdate, <any>this);
            director.getScheduler().unschedule(this._keepAliveUpdate, <any>this);
        }
    }

    public relogin?(success: Function, failure: Function): void;

    public reconnect?(success: Function, failure: Function): void;

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

export function init(ip: string, port: number, gateway_flag: string) {
    gameNet.network.reset();
    gameNet.network.init(ip, port, gateway_flag);
}

export function setProtocol(protocol: any) {
    innerP = protocol;
}

let _c2sFilters = {};
export function addC2sLogFilter(cmd: number) {
    if (gameNet)
        gameNet.c2sLogFilters[cmd] = true;
    else
        _c2sFilters[cmd] = true;
}

export function delC2sLogFilter(cmd: number) {
    if (gameNet)
        delete gameNet.c2sLogFilters[cmd];
    else
        delete _c2sFilters[cmd];
}

let _s2cFilters = {};
export function addS2cLogFilter(cmd: number) {
    if (gameNet)
        gameNet.s2cLogFilters[cmd] = true;
    else
        _s2cFilters[cmd] = true;
}

export function delS2cLogFilter(cmd: number) {
    if (gameNet)
        delete gameNet.s2cLogFilters[cmd];
    else
        delete _s2cFilters[cmd];
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

export function targetOff(target: any) {
    gameNet.targetOff(target);
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

export function rejectConnect(value: boolean) {
    if (gameNet)
        gameNet.rejectConnected = value;
}


export function setRelogin(relogin: (success: Function, failure: Function) => void) {
    gameNet.relogin = relogin;
}

export function setReconnect(reconnect: (success: Function, failure: Function) => void) {
    gameNet.reconnect = reconnect;
}


export function connected() {
    return gameNet ? gameNet.network.connected() : false;
}

export function initAsync(ip: string, port: number, gateway_flag?: string) {
    return new Promise<void>(function (resolve, reject) {
        init(ip, port, gateway_flag);
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
export function save_acall<T = any>(request: any, data?: any, time?: number): Promise<{ result: number, msg: T, code: number }> {
    return acall(request, data, time)
        .then(
            (msg) => {
                return { result: kSaveACallRetSuccess, msg: msg, code: 0 };
            },
            (code) => {
                return { result: kSaveACallRetFailure, msg: null, code: code };
            }
        ) as Promise<{ result: number, msg: T, code: number }>
}

export function create_save_reject(code: number = 0) {
    return Promise.resolve({ result: kSaveACallRetFailure, msg: null, code: code })
}

export function gm(cmd: string) {
    // if (gFramework.useGM) send(P.chat_world_c2s, { parts: [{ content: '=' + cmd }] });
}

export function gmc(cmd: string) {
    // if (gFramework.useGM) return acall(P.chat_world_c2s, { parts: [{ content: '=' + cmd }] });
}
