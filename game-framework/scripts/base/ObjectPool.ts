import TimeUtil from "../utils/TimeUtil";
import { getGlobal } from "./base";

export class ObjectPool<T extends gFramework.IPoolItem> {
    private _datas: T[] = [];
    private _size: number = 0;
    private _totalCreated: number = 0;
    private _expireMs: number = 0;
    private _lastUseMs: number = 0;
    private _noManage: boolean = false;
    private _ctor: (...args: any[]) => T;
    private _ctorArgs: () => any[];
    private _reuseArgs: () => any[];

    get datas(): ReadonlyArray<T> { return this._datas; }
    get size() { return this._size; }
    get totalCreated() { return this._totalCreated; }

    protected constructor(option: gFramework.ObjectPoolOption<T>) {
        this._ctor = option.ctor;
        this._ctorArgs = option.ctorArgs;
        this._reuseArgs = option.reuseArgs;
    }

    private static _managedPools: ObjectPool<gFramework.IPoolItem>[] = [];
    private static _autoPoolId = 0;
    private static _allPools: Record<string, ObjectPool<gFramework.IPoolItem>> = Object.create(null);
    /**
     * 创建一个特定的池，并进行记录
     */
    static create<T extends gFramework.IPoolItem>(option: gFramework.ObjectPoolOption<T>, poolKey?: string) {
        const pool = new ObjectPool(option);
        if (!option.noManage) {
            poolKey = poolKey ?? `autoPoolId_${this._autoPoolId++}`;
            this._allPools[poolKey] = pool;
        }
        pool._expireMs = option.expireMs ?? 0;
        pool._noManage = option.noManage ?? false;
        pool._whenUse();
        if (pool._expireMs > 0)
            this._managedPools.push(pool);
        return pool;
    }

    /**
     * 清理所有被记录的池的内容
     */
    static clearAllPools() {
        for (const k in this._allPools) {
            const pool = this._allPools[k];
            pool.dispose();
            delete this._allPools[k];
        }
        this._managedPools.length = 0;
    }

    /**
     * 检查并自动释放池
     */
    static autoReleasePool() {
        const pools = this._managedPools;
        const curTime = TimeUtil.gameTotalTimeMs;
        for (let i = pools.length; --i >= 0; ) {
            const p = pools[i];
            if (p.size > 0 && curTime - p._lastUseMs >= p._expireMs)
                p.clear();
        }
    }

    getItem() {
        let item: T;
        if (this._size > 0) {
            item = this._datas.pop();
            --this._size;
            if (this._reuseArgs != void 0)
                item.onPoolReuse(...this._reuseArgs());
            else
                item.onPoolReuse();
        } else {
            item = this._ctor.call(this);
            if (this._ctorArgs != void 0)
                item.onPoolCreate(...this._ctorArgs());
            else
                item.onPoolCreate();
            ++this._totalCreated;
        }
        this._whenUse();
        return item;
    }

    pushItem(item: T) {
        item.onPoolRestore();
        this._datas.push(item);
        ++this._size;
        this._whenUse();
    }

    dispose() {
        this.clear();
    }

    clear() {
        for (const d of this._datas)
            d.onPoolDispose();
        this._datas.length = 0;
        this._size = 0;
    }

    private _whenUse() {
        this._lastUseMs = TimeUtil.gameTotalTimeMs;
    }
}

getGlobal().ObjectPool = ObjectPool;