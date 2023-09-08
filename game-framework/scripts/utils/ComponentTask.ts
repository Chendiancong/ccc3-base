import { Component } from "cc";
import { defer } from "../base/promise";

export class ComponentTask {
    static waitSec(comp: Component, sec: number) {
        const d = defer<void>();
        comp.scheduleOnce(() => d.resolve(), sec);
        return d.promise;
    }

    static waitNextFrame(comp: Component) {
        const d = defer<void>();
        comp.scheduleOnce(() => d.resolve(), 0);
        return d.promise;
    }

    static waitUntil(comp: Component, predict: () => boolean) {
        const d = defer<void>();
        const func = () => {
            if (predict()) {
                comp.unschedule(func);
                d.resolve();
            }
        }
        comp.schedule(func);
        return d.promise;
    }
}