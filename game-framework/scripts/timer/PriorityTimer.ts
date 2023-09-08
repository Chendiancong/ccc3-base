import { director } from "cc";
import { assert } from "../base/debugUtil";

export interface IPriorityTimerHandler {
    method: Function,
    methodObj: any,
    execTime: number,
    time: number,
    stop: () => void,
    start: () => void,
    reset: () => void,
    isstop: () => boolean,
    once: boolean,
}

interface ITimerHandler extends IPriorityTimerHandler { }

export class PriorityTimer {
    private _currentTime: number;
    private _handlers: Array<ITimerHandler> = [];
    private _nextFrameHandlers: Array<ITimerHandler> = [];
    private _currentHandler: ITimerHandler;
    private _toDeleteCurrentHandler: boolean;

    init() {
        this._currentTime = director.getTotalTime();
    }

    update(dt: number): boolean {
        this._currentTime = director.getTotalTime();
        for (let i = this._nextFrameHandlers.length; i--;) {
            let handler = this._nextFrameHandlers[i];
            handler.method.call(handler.methodObj);
        }
        this._nextFrameHandlers.length = 0;

        if (!this._handlers.length)
            return false;

        let handler = this._handlers[this._handlers.length - 1];
        while (handler.execTime <= this._currentTime) {
            this._currentHandler = handler = this._handlers.pop();
            let deltaTime = this._currentTime - handler.execTime + handler.time;
            let result = handler.method.call(handler.methodObj, deltaTime);
            if (this._toDeleteCurrentHandler || result === true || handler.once) {
                this._currentHandler = null;
                this._toDeleteCurrentHandler = null;
                if (!this._handlers.length)
                    break;

                handler = this._handlers[this._handlers.length - 1];
                continue;
            }

            this._currentHandler = null;
            if (typeof result == "number")
                handler.time = result;
            if (!handler.time)
                handler.time = 1;

            handler.execTime = this._currentTime + handler.time;
            this._insertHandler(handler);
            handler = this._handlers[this._handlers.length - 1];
        }
        return false;
    }

    private _createHandler(method: Function, methodObj: any, time: number, execTime: number, once: boolean = false): ITimerHandler {
        let timer = this;
        return {
            time: time,
            method: method,
            methodObj: methodObj,
            execTime: execTime,
            once: once,
            start: function () {
                if (this.isstop())
                    timer._insertHandler(this);
            },
            reset: function () {
                this.execTime = timer._currentTime + this.time;
            },
            stop: function () {
                if (!this.isstop())
                    timer.stop(this);
            },
            isstop: function () {
                if (timer._handlers.indexOf(this) >= 0)
                    return false;
                if (timer._currentHandler === this)
                    return false;

                return true;
            }
        }
    }

    private _insertHandler(handler: ITimerHandler) {
        let handlers = this._handlers;
        handlers.push(handler);
        let i = handlers.length - 1;
        while (i && handler.execTime >= handlers[i - 1].execTime) {
            handlers[i] = handlers[i - 1];
            --i;
        }
        handlers[i] = handler;
    }

    doDelay(delay: number, method: Function, methodObj?: any) {
        assert(!isNaN(delay), "delay method no delay ...");
        assert(method, "delay method no method ...");

        let handler = this._createHandler(method, methodObj, 0, delay + this._currentTime, true);
        this._insertHandler(handler);
        return handler;
    }

    schedule(method: Function, methodObj?: any, time?: number): ITimerHandler {
        assert(method, "schedule no method ...");

        if (time == void 0)
            time = 0;

        let handler = this._createHandler(method, methodObj, time, /** time + */this._currentTime);
        this._insertHandler(handler);
        return handler;
    }

    scheduleDelay(delay: number, method: Function, methodObj?: any, time?: number): ITimerHandler {
        assert(delay != undefined, "delay schedule no delay ...");
        assert(method, "delay schedule no method ...");

        if (time == void 0)
            time = 0;

        let handler = this._createHandler(method, methodObj, time, delay + this._currentTime);
        this._insertHandler(handler);
        return handler;
    }

    doNextFrame(method: Function, methodObj?: any) {
        assert(method, "do next frame no method ...");

        let handler = this._createHandler(method, methodObj, 0, 0, true);
        this._nextFrameHandlers.push(handler);
    }

    stop(handler: ITimerHandler) {
        if (handler === this._currentHandler) {
            this._toDeleteCurrentHandler = true;
            return;
        }
        let index = this._handlers.indexOf(handler);
        if (index >= 0) {
            this._handlers.splice(index, 1);
        }
    }

    getCurrentTime() { return this._currentTime; }

    removeObjSchedule(obj: any) {
        assert(obj, "remove obj(null) schedule...");
        if (this._currentHandler && this._currentHandler.methodObj === obj)
            this._toDeleteCurrentHandler = true;

        for (let i = this._handlers.length - 1; i >= 0; i--) {
            let handler = this._handlers[i];
            if (handler.methodObj === obj)
                this.stop(handler);
        }
    }

    reset() {
        this._handlers.length = 0;
        this._nextFrameHandlers.length = 0;
        this._currentHandler = null;
        this._toDeleteCurrentHandler = null;
    }
}