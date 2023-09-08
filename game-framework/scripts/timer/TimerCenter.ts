import { PriorityTimer, IPriorityTimerHandler } from "./PriorityTimer"

export type ITimerHandler = IPriorityTimerHandler;
export let timerCenter = new PriorityTimer();