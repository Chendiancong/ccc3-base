import { SeqQueue } from "./seq-queue";

export interface IQueueTask {
    done(): boolean;
}

export interface IQueue {
    push(fn: (task: IQueueTask) => void, ontimeout?: () => void, timeoutMs?: number): boolean;

    close(force: boolean): void;
}

let queues: { [key: number]: IQueue } = {};

export let timeout = 3000;

/**
 * Add tasks into task group. Create the task group if it dose not exist.
 */
export function addTask(
    key: number,
    fn: (task: IQueueTask) => void,
    ontimeout?: () => void,
    timeoutMs?: number
) {
    let queue = queues[key];
    if (!queue) {
        queue = SeqQueue.createQueue(timeout);
        queues[key] = queue;
    }

    return queue.push(fn, ontimeout, timeoutMs);
}

/**
 * Destroy task group
 */
export function closeTask(key: number, force: boolean) {
    if (!queues[key]) {
        return;
    }

    queues[key].close(force);
    queues[key] = undefined;
}