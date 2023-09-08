export function defer<T>() {
    let resolve: (param: T) => void, reject;
    let promise = new Promise<T>(function () {
        resolve = arguments[0];
        reject = arguments[1];
    });

    return {
        promise: promise,
        resolve: resolve,
        reject: reject
    }
}

export function promisify(fn: Function) {
    return function (...args) {
        return new Promise<any>((resolve, reject) => {
            function customCallback(err, ...results) {
                if (err) {
                    return reject(err);
                }
                return resolve(results.length === 1 ? results[0] : results);
            }
            args.push(customCallback);
            fn.apply(this, args);
        });
    }
}

export function sequence(values: Array<any>): Promise<any> {
    return values.reduce(function (p: Promise<any>, value: any) {
        if ("function" === typeof value)
            return p.then(() => value());
        else
            return p.then(() => value);
    }, Promise.resolve());
}

export function parallel(values: Array<Promise<any> | Function>) {
    return Promise.all(values.map(value => {
        if ("function" === typeof value)
            return value();
        else
            return value;
    }));
}