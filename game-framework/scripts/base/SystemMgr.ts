import { js } from "cc";
import { BaseSystem } from "./BaseSystem";

export interface ISystemRegisterInfo {
    clazz?: Constructor<BaseSystem>;
    className: string;
    priority?: number;
}

class SystemMgr {
    private _regInfo: { [index: string]: ISystemRegisterInfo } = {};
    private _instances: BaseSystem[] = [];

    reg(params: ISystemRegisterInfo) {
        if (params.priority == null) params.priority = 1000;
        this._regInfo[params.className] = params;
    }

    prepare() {
        const instances = this._instances;
        for (let instance of instances) {
            instance.dispose();
        }
        instances.length = 0;

        for (let key in this._regInfo) {
            const instance = this.instantiate(this._regInfo[key]);

            let i = instances.length;
            instances.push(instance);
            while (i > 0 && instances[i - 1]._priority > instance._priority) {
                instances[i] = instances[i - 1];
                i--;
            }
            instances[i] = instance;
        }
    }

    instantiate(info: ISystemRegisterInfo) {
        const res = new info.clazz();
        res._priority = info.priority;

        _global[varName(info.className)] = res;
        return res;
    }

    init() {
        for (let instance of this._instances) {
            if (!!instance.init) {
                instance.init();
            }
            instance._inited = true;
        }
    }

    reconnect() {
        for (let instance of this._instances) {
            if (!!instance.reconnect) {
                instance.reconnect();
            }
        }
    }

    reset() {
        let instances = this._instances;
        for (let instance of instances) {
            _global[varName(js.getClassName(instance))] = null;
            instance.dispose();
        }
        instances.length = 0;
    }
}

function varName(className: string) {
    return className[0].toLocaleLowerCase() + className.slice(1);
}

const _global: any =
    typeof window === "object"
        ? window
        : typeof self === "object"
        ? self
        : this;

export const systemMgr = new SystemMgr();
