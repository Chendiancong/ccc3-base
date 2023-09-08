import { EventTarget } from "cc";
import { ObserverClass } from "../events/ObserverClass";
import { TimerClass } from "../timer/TimerClass";
import { applyMixins } from "./jsUtil";

export class BaseSystem extends EventTarget {
    
    _priority: number = 0;
    _inited: boolean = false;
    _observed = [];
    _schedulers = [];
    
    init?(): void; 

    reconnect?(): void;
    
    protected onDispose() {
        
    }
    
    dispose() {
        this.onDispose();
        this.removeObserves();
        this.removeSchedulers();
    }
}

export interface BaseSystem extends ObserverClass, TimerClass {}
applyMixins(BaseSystem, [ObserverClass, TimerClass]);