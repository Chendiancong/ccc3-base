export class Counter {
    cur: number;
    total: number;

    get isComplete() { return this.cur >= this.total; }
    get progress() { return this.cur/this.total; }

    setup(total: number, cur: number) {
        this.total = total;
        this.cur = cur;
        return this;
    }

    complete() {
        this.cur = this.total;
        return this;
    }

    reset() {
        this.cur = 0;
        return this;
    }

    delta(value: number) {
        this.cur += value;
        return this.cur >= this.total;
    }

    repeatDelta(value: number) {
        this.cur += value;
        if (this.cur > this.total)
            this.cur %= value;
    }
}