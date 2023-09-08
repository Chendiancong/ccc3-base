import { autoProperty } from "../base/base-decorator";
import { applyMixins } from "../base/jsUtil";
import { MessageCenter } from "./MessageCenter";

export class ObserverClass
{
    @autoProperty(function() { return []; })
    _observed;

    public observe(obj: any, func: Function, handleFunc: Function, thiz = this) {
        let idx: number;
        if ((idx = this.getObserveIndex(obj, func)) >= 0) {
            let o = this._observed[idx];
            MessageCenter.removeListener(o[0], o[1], o[2], o[3]);

            o[0] = obj;
            o[1] = func;
            o[2] = handleFunc;
            o[3] = thiz;
        } else {
            this._observed.push([obj, func, handleFunc, thiz]);
        }

        return MessageCenter.addListener(obj, func, handleFunc, thiz);
    }

    public removeObserve(obj: any, func: Function, handleFunc: Function, thiz = this) {
        let idx: number;
        if ((idx = this.getObserveIndex(obj, func)) >= 0)
            this.removeObserveByIndex(idx);
    }

    public removeObserveByIndex?(i: number) {
        let o = this._observed[i];
        MessageCenter.removeListener(o[0], o[1], o[2], o[3]);
        this._observed.splice(i, 1);
    }

    public removeObserves() {
        for (let each of this._observed) {
            MessageCenter.removeListener(each[0], each[1], each[2], each[3]);
        }

        this._observed = [];
    }

    public getObserveIndex?(obj: any, func: Function) {
        let observed = this._observed;
        let i = observed.length - 1;
        while (i >= 0) {
            if (observed[i][0] === obj && observed[i][1] === func)
                break;
            i--;
        }
        return i;
    }
}

export function observerable(ctor: any) {
    applyMixins(ctor, [ObserverClass]);
}