import { ObjectPool } from "../base/ObjectPool";

export class HashList<T = any> {
    private _head: HashListNode;
    private _tail: HashListNode;
    private _dic: { [key: string|number]: HashListNode };
    private _size: number;

    get head(): Readonly<HashListNode<T>> {
        return this._head;
    }

    get tail(): Readonly<HashListNode<T>> {
        return this._tail;
    }

    get size() { return this._size; }

    constructor() {
        this._head = HashListNode.pool.getItem();
        this._tail = HashListNode.pool.getItem();
        this._head.next = this._tail;
        this._tail.prev = this._head;
        this._dic = {};
        this._size = 0;
    }

    add(key: string|number, data: T) {
        const newNode = HashListNode.pool.getItem();
        newNode.data = data;
        newNode.key = key;
        this._internalAdd(newNode);
    }

    del(key: string|number) {
        const oldNode = this._dic[key];
        if (oldNode == void 0)
            return null;
        return this._internalDel(oldNode);
    }

    get(key: string|number) {
        return this._dic[key]?.data as T;
    }

    addNode(node: HashListNode<T>) {
        if (!node.key)
            node.key = ""+Date.now();
        this._internalAdd(node);
    }

    delNode(node: HashListNode<T>) {
        if (this._dic[node.key])
            return this._internalDel(node);
    }

    clear() {
        this.forEachNode(n => {
            this.delNode(n);
        });
        const head = this._head;
        const tail = this._tail;
        head.next = tail;
        tail.prev = head;
        this._size = 0;
    }

    forEach(func: (data: T) => void) {
        let cur = this._head.next;
        let tail = this._tail;
        while (cur != tail) {
            const curNode = cur;
            cur = cur.next;
            func(curNode.data);
        }
    }


    forEachNode(func: (n: HashListNode<T>) => void) {
        let cur = this._head.next;
        let tail = this._tail;
        while (cur != tail) {
            const curNode = cur;
            cur = cur.next;
            func(curNode);
        }
    }

    private _internalAdd(node: HashListNode<T>) {
        const oldNode = this._dic[node.key];
        if (oldNode == node)
            return;
        if (oldNode != void 0)
            this._internalDel(oldNode);
        const last = this._tail.prev;
        last.next = node;
        node.prev = last;
        node.next = this._tail;
        this._tail.prev = node;
        this._dic[node.key] = node;
        ++this._size;
    }

    private _internalDel(node: HashListNode<T>) {
        const prev = node.prev;
        const next = node.next;
        prev.next = next;
        next.prev = prev;
        const data = node.data;
        delete this._dic[node.key];
        this._size = Math.max(0, this._size - 1);
        HashListNode.pool.pushItem(node);
        return data;
    }
}

export class HashListNode<T = any> implements gFramework.IPoolItem {
    static readonly pool = ObjectPool.create({
        ctor: () => new HashListNode()
    });

    next: HashListNode<T>;
    prev: HashListNode<T>;
    key: string|number;
    data: T;

    onPoolCreate() {}

    onPoolRestore() {
        this.next = null;
        this.prev = null;
        this.data = null;
        this.key = null;
    }

    onPoolReuse() {}

    onPoolDispose() {
        this.onPoolRestore();
    }
}