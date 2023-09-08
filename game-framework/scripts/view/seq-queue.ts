import { director, EventTarget } from "cc";
import { error } from "../base/debugUtil";

const DEFAULT_TIMEOUT = 3000;
const INIT_ID = 0;
const EVENT_CLOSED = "closed";
const EVENT_DRAINED = "drained";

type TaskHandle = (task: { done: () => boolean }) => void;
type TimeoutHandle = () => void;

export class SeqQueue extends EventTarget {

    /**
     * Queue status: idle, welcome new tasks
     */
    static STATUS_IDLE = 0;

    /**
     * Queue status: busy, queue is working for some tasks now
     */
    static STATUS_BUSY = 1;

    /**
     * Queue status: closed, queue has closed and would not receive task any more 
     * 					and is processing the remaining tasks now.
     */
    static STATUS_CLOSED = 2;

    /**
     * Queue status: drained, queue is ready to be destroy
     */
    static STATUS_DRAINED = 3;

    status: number;
    queue: {
        id?: number;
        fn: TaskHandle,
        ontimeout?: TimeoutHandle,
        timeout?: number;
    }[];

    curId: number;
    timerId: NodeJS.Timeout;
    timeout: number;

    constructor(timeout: number) {
        super();
        if (timeout && timeout > 0) {
            this.timeout = timeout;
        } else {
            this.timeout = DEFAULT_TIMEOUT;
        }

        this.status = SeqQueue.STATUS_IDLE;
        this.curId = INIT_ID;
        this.queue = [];
    }

    /**
     * Add a task into queue.
     * 
     * @param fn new request
     * @param ontimeout callback when task timeout
     * @param timeout timeout for current request. take the global timeout if this is invalid
     * @returns true or false
     */
    push(fn: TaskHandle, ontimeout?: TimeoutHandle, timeout?: number) {
        if (this.status !== SeqQueue.STATUS_IDLE && this.status !== SeqQueue.STATUS_BUSY) {
            return false;
        }

        if (typeof fn !== "function") {
            throw new Error("fn should be a function.");
        }

        this.queue.push({ fn: fn, ontimeout: ontimeout, timeout: timeout });

        if (this.status === SeqQueue.STATUS_IDLE) {
            this.status = SeqQueue.STATUS_BUSY;
            this.next(this.curId);
        }
        return true;
    }

    /**
     * Close queue
     * 
     * @param force if true will close the queue immediately else will execute the rest task in queue
     */
    close(force: boolean) {
        if (this.status !== SeqQueue.STATUS_IDLE && this.status !== SeqQueue.STATUS_BUSY) {
            return;
        }

        if (force) {
            this.status = SeqQueue.STATUS_DRAINED;
            if (this.timerId) {
                clearTimeout(this.timerId);
                this.timerId = undefined;
            }
        } else {
            this.status = SeqQueue.STATUS_CLOSED;
        }
    }

    private next(tid: number) {
        // let now = performance.now();
        // let delta = now - director. ._lastUpdate;
        // if (delta >= this.animationInterval)
        //     setTimeout(() => { this._next(tid) });
        // else

        Promise.resolve().then(() => { this._next(tid) });
    }

    /**
     * Invoke next task
     * 
     * @param tid last executed task id
     */
    private _next(tid: number) {
        if (tid !== this.curId || this.status !== SeqQueue.STATUS_BUSY && this.status !== SeqQueue.STATUS_CLOSED) {
            return;
        }

        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = undefined;
        }

        let task = this.queue.shift();
        if (!task) {
            if (this.status === SeqQueue.STATUS_BUSY) {
                this.status = SeqQueue.STATUS_IDLE;
                this.curId++;
            } else {
                this.status = SeqQueue.STATUS_DRAINED;
            }
            return;
        }

        task.id = ++this.curId;

        let timeout = task.timeout > 0 ? task.timeout : this.timeout;
        timeout = timeout > 0 ? timeout : DEFAULT_TIMEOUT;

        this.timerId = setTimeout(() => {
            if (task.ontimeout) {
                task.ontimeout();
            }
            this.next(task.id);
        }, timeout);


        try {
            task.fn({
                done: () => {
                    let res = task.id === this.curId;

                    this.next(task.id);

                    return res;
                }
            });
        } catch (err) {
            error(err);
            this.next(task.id);
        }
    }

    /**
     * Create Sequence queue
     * 
     * @param timeout a global timeout for the new queue instance
     * @returns SeqQueueManager
     */
    static createQueue(timeout: number) {
        return new SeqQueue(timeout);
    }
}