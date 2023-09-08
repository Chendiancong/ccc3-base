import { game } from "cc"

type TimeUtilType = {
    readonly gameTotalTimeMs: number;
    readonly gameTotalTimeSec: number;
    readonly gameDeltaTime: number;
    readonly gameDeltaTimeMs: number;
    readonly gameUnscaleDeltaTime: number;
    timeSpeed: number;
}

let _timeSpeed = 1;

export default <TimeUtilType>{
    get gameTotalTimeMs() {
        return game.totalTime;
    },

    get gameTotalTimeSec() {
        return this.gameTotalTimeMs/1000;
    },

    get gameDeltaTime() {
        return game.deltaTime*_timeSpeed;
    },

    get gameDeltaTimeMs() {
        return this.gameDeltaTime * 1000;
    },

    get gameUnscaleDeltaTime() {
        return game.deltaTime;
    },

    get gameUnscaleDeltaTimeMs() {
        return game.deltaTime * 1000;
    },

    get timeSpeed() { return _timeSpeed; },
    set timeSpeed(value: number) { _timeSpeed = value; }
}