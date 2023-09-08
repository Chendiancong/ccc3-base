import { js } from "cc";
import { MessageCenter } from "../events/MessageCenter";
import { applyMixins } from "./jsUtil";
import { ISystemRegisterInfo, systemMgr } from "./SystemMgr";

function gameSystemHelper(prop: ISystemRegisterInfo, classConstructor: any) {
    let className = prop.className;
    js.setClassName(className, classConstructor);

    prop = prop || <any>{};
    prop.clazz = classConstructor;
    
    systemMgr.reg(prop);
    MessageCenter.compile(classConstructor);
}

export function gameSystem(className: string)
export function gameSystem(prop: ISystemRegisterInfo)
export function gameSystem(param: any) {
    if (typeof param === "string") {
        param = { className: param };
    }
    return gameSystemHelper.bind(null, param);
}

function gameSubSystemHelper(prop: ISystemRegisterInfo, classConstructor: any) {
    let className = prop.className;
    js.setClassName(className, classConstructor);
    MessageCenter.compile(classConstructor);
}

export function gameSubSystem(className: string)
export function gameSubSystem(prop: ISystemRegisterInfo)
export function gameSubSystem(param: any) {
    if (typeof param === "string") {
        param = { className: param };
    }
    return gameSubSystemHelper.bind(null, param);
}

export function mixin(prop: { [x: string]: any })
export function mixin(ctor: Constructor)
export function mixin(ext: any) {
    if (typeof ext == "function") {
        return function (ctor: Constructor) {
            applyMixins(ctor, [ext]);
        }
    }

    return function (ctor: Constructor) {
        js.mixin(ctor.prototype, ext);
    }
}

export function static_mixin(prop: { [x: string]: any }) {
    return function (ctor: Constructor) {
        js.mixin(ctor, prop);
    }
}

export function categorize(container: Array<Constructor>) {
    return function (ctor: Constructor) {
        container.push(ctor);
    }
}

/** 能否枚举 */
export function enumerable(b: boolean) {
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        descriptor.enumerable = b;
        return descriptor;
    }
}
/** 不可枚举 */
export function nonenumerable(target: any, key: string, descriptor: PropertyDescriptor) {
    descriptor.enumerable = false;
    return descriptor;
}

/** 只执行一次 */
export function callOnce(classPrototype: any, name: string, property: PropertyDescriptor) {
    let key = "$" + name + "_callOnce";
    let func = property.value;
    property.value = function (...args: any[]) {
        if (!this[key]) {
            this[key] = true;
            return func.apply(this, args);
        }
    }
    return property;
}

/** 
 * 延迟一段时间执行  
 * delay 秒
 * */
export function callDelay(delay: number) {
    return function (classPrototype: any, name: string, property: PropertyDescriptor) {
        let func = property.value;
        let key = "$" + name + "_callDelay";
        let keyArgs = key + "_args";
        let _func = function () {
            let self = this;
            delete self[key];
            func.apply(self, self[keyArgs]);
            delete self[keyArgs];
        }

        property.value = function (...args: any[]) {
            let funcArgs = this[keyArgs];
            if (!funcArgs) {
                funcArgs = this[keyArgs] = [];
            } else {
                funcArgs.length = 0;
            }

            for (let i = 0; i < args.length; i++) {
                funcArgs[i] = args[i];
            }

            if (!this[key]) {
                if (!!this.scheduleOnce) {
                    this.scheduleOnce(_func, delay);
                } else {
                    setTimeout(_func.bind(this), delay * 1e3);
                }
                this[key] = true;
            }
        };
        return property;
    }
}

export function jsClass(className: string);
export function jsClass<T>(ctor: { new(): T });
export function jsClass(ctorOrName: any) {
    if (typeof ctorOrName == "string")
        return function <T>(ctor: { new(): T }) {
            js.setClassName(ctorOrName, ctor);
        }
    else
        js.setClassName((ctorOrName as { new(): any }).name, ctorOrName);
}

function _autoProperty(clazzOrProto: any, propertyName: string, initial?: (() => any)|number|string|null|undefined) {
    let internalKey = `_${propertyName}`;
    let desc: PropertyDescriptor = {
        get: function () {
            let value = this[internalKey];
            if (value == void 0 && initial != void 0)
                if (typeof initial == "function")
                    value = this[internalKey] = initial.call(this);
                else
                    value = this[internalKey] = initial;
            return value;
        },
        set: function (value: any) {
            this[internalKey] = value;
        },
        configurable: true,
        enumerable: true
    }
    return desc as any;
}
export function autoProperty(initial: (() => any)|number|string|null|undefined);
export function autoProperty(clazzOrProto: any, propertyName: string);
export function autoProperty(p1: any, p2?: any) {
    if (p2 != void 0)
        return _autoProperty(p1, p2, null);
    else
        return function (clazzOrProto: any, propertyName: string) {
            return _autoProperty(clazzOrProto, propertyName, p1);
        }
}