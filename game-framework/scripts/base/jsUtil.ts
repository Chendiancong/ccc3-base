function mixinProperties(obj, proto) {
    for (var prop in proto) {
        if (!obj.hasOwnProperty(prop)) {
            obj[prop] = proto[prop];
        }
    }
    return obj;
}

/** 设置对象的原型 */
export let setPrototypeOf =
    Object.setPrototypeOf || { __proto__: [] } instanceof Array
        ? function (obj, proto) {
              obj.__proto__ = proto;
              return obj;
          }
        : mixinProperties;

/** 混入 */
export function applyMixins(derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach((baseCtor) => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
            if (name !== "constructor" && !(name in derivedCtor.prototype))
                Object.defineProperty(
                    derivedCtor.prototype,
                    name,
                    Object.getOwnPropertyDescriptor(baseCtor.prototype, name)
                );
        });
    });
}

const errorObject = { value: null };
export function trycatch(fn: Function, ctx: any, args?: any[]) {
    try {
        return fn.apply(ctx, args);
    } catch (err) {
        errorObject.value = err;
        return errorObject;
    }
}

/**
 * 深拷贝对象
 */
export function clone<T>(obj: T): T {
    var copy: any;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    if (obj instanceof dcodeIO.Long) {
        copy = new dcodeIO.Long(obj.low, obj.high, obj.unsigned);
        return copy;
    }

    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        Object.setPrototypeOf(copy, Object.getPrototypeOf(obj));
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

/**
 * 是否空对象({}, [], null, undefined)
 */
export function isEmpty(obj: any) {
    for (let k in obj) if (obj.hasOwnProperty(k)) return false;
    return true;
}

/**
 * 元素按顺序插入数据 插入排序
 */
export function arrayInsert<T>(
    arr: T[],
    element: T,
    sort: (a: T, b: T) => number
) {
    let i = arr.length;
    arr.push(element);
    while (i != 0 && sort(arr[i - 1], element) > 0) {
        arr[i] = arr[i - 1];
        i--;
    }
    arr[i] = element;
}

/** 删除数组的特定元素 */
export function arrayRemove<T>(array: T[], element: T) {

    let i = 0, j = 0, l = array.length;
    while (j < l) {
        if (array[j] !== element) {
            array[i++] = array[j];
        }
        j++;
    }
    array.length = i;
}