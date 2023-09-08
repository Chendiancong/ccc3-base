import { gameEnum } from "../utils/enum";

export enum kUiSize {
    none,
    normal,
    full
}
gameEnum(kUiSize, "kUiSize");

export enum kUiJudge {
    none,
    all,
    mainUI,
    mainTabUI,
}
gameEnum(kUiJudge, "kUiJudge");


export enum kUiAlign {
    center,
    leftCenter,
}
gameEnum(kUiAlign, "kUiAlign");

export enum kUiParam {
    Replace,
    Collect,
}
gameEnum(kUiParam, "kUiParam");
