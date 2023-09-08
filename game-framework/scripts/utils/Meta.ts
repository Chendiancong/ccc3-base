import { getGlobal } from "../base/base";

type MetaKey = string|number;

class Meta<T = any> {
    protected infos: { [key: MetaKey]: T } = Object.create(null);
    protected defaultInfo: T;

    protected regInfo(key: MetaKey, d: T) {
        this.infos[key] = d;
    }

    protected getInfo(key: MetaKey) {
        return this.infos[key]??this.defaultInfo;
    }
}

export class ClassFactory<T = any> extends Meta<Constructor<T>> {
    singleIns: { [key: MetaKey]: T } = Object.create(null);

    setDefaultClass(clazz: Constructor<T>) {
        this.defaultInfo = clazz;
    }

    regClass(key: MetaKey, clazz: Constructor<T>) {
        this.regInfo(key, clazz);
    }

    regClassDecorator<T1 extends T>(key: MetaKey) {
        const thiz = this;
        return function (clazz: Constructor<T1>) {
            thiz.regInfo(key, clazz);
        }
    }

    getClass(key: MetaKey) {
        return this.infos[key];
    }

    getSingle(key: MetaKey) {
        let ins = this.singleIns[key];
        if (ins != void 0)
            return ins;
        ins = this.singleIns[key] = new (this._tryGetCtor(key))(key);
        return ins;
    }

    createInstance(key: MetaKey) {
        return new (this._tryGetCtor(key))(key);
    }

    hasKey(key: MetaKey) {
        return key in this.infos;
    }

    private _tryGetCtor(key: string|number) {
        const ctor = this.getInfo(key);
        if (ctor == void 0)
            throw new Error(`ClassFactory._tryGetCtor: missing constructor of ${key}`);
        return ctor;
    }
}

export class FunctionFactory<T extends Function = Function> extends Meta<T> {
    defaultFunc: Function = () => {};
    defaultCaller: any;

    constructor(defaultFunc: Function = null) {
        super();
        this.defaultFunc = defaultFunc??this.defaultFunc;
    }

    regFunc(key: MetaKey, func: T) {
        this.infos[key] = func;
    }

    regFuncDecorator(key: MetaKey) {
        const thiz = this;
        return function (clazzOrProto: any, methodName: string, desc: PropertyDescriptor) {
            thiz.infos[key] = desc.value;
        }
    }

    getFunc(key: MetaKey) {
        return this.infos[key]??this.defaultFunc;
    }

    callFunc(key: MetaKey, thiz?: any, ...args: any[]) {
        this.infos[key]?.call(thiz??this.defaultCaller, ...args);
    }

    setDefaultCaller(caller: any) {
        this.defaultCaller = caller;
    }
}

type CloneOption<T> = {
    defaultValue?: any,
    copy?: (propName: string, target: T|Constructor<T>, source: T|Constructor<T>) => void
}
const emptyCloneOption = Object.create(null);
class CloneHelper<T> extends Meta<CloneOption<T>> {
    staticProp(option: CloneOption<T>);
    staticProp(clazz: any, propName: string);
    staticProp(...args: any[]) {
        let option: CloneOption<T>;

        const argLen = args.length;
        if (argLen == 1) {
            option = args[0];
            return this._internal.bind(this, true, option);
        } else {
            option = emptyCloneOption;
            this._internal(true, option, args[0], args[1]);
        }
    }

    prop(option: CloneOption<T>);
    prop(proto: any, propName: string);
    prop(...args: any[]) {
        let option: CloneOption<T>;

        const argLen = args.length;
        if (argLen == 1) {
            option = args[0];
            return this._internal.bind(this, false, option);
        } else {
            option = emptyCloneOption;
            this._internal(false, option, args[0], args[1]);
        }
    }

    clone(target: T, source: T) {
        for (let k in this.infos) {
            if (k.startsWith('static_'))
                continue;
            const option = this.infos[k];
            if (option.copy)
                option.copy(k, target, source);
            else
                target[k] = source[k]??option.defaultValue??undefined;
        }
    }

    cloneStatic(target: Constructor<T>, source: Constructor<T>) {
        for (let k in this.infos) {
            if (!k.startsWith('static_'))
                continue;
            const option = this.infos[k];
            if (option.copy)
                option.copy(k, target, source);
            else
                target[k] = source[k]??option.defaultValue??undefined;
        }
    }

    private _internal(isStatic: boolean, option: CloneOption<T>, clazzOrProto: any, propName: string) {
        this.regInfo(
            isStatic ? `static_${propName}` : propName,
            option
        );
    }
}