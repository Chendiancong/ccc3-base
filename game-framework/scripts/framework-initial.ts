import { AudioClip, EventTarget } from "cc";
import { WECHAT } from "cc/env";
import { getGlobal } from "./base/base";
import * as debugUtil from "./base/debugUtil";
import { systemMgr } from "./base/SystemMgr";
import * as net from "./net/GameNet";
import { timerCenter } from "./timer/TimerCenter";
import { AsyncWaiter } from "./utils/AsyncWaiter";
import { CommonStorage, WechatStorage } from "./utils/GameLocalStorage";

/** 框架预先初始化 */
export function initGameFramework() {
    const global = getGlobal();
    const gf = global.gFramework;
    // gf.resMgr = new ResMgr();
    // gf.layerMgr = new LayerMgr();
    gf.systemMgr = systemMgr;
    getGlobal().Net = gf.net = net;
    gf.timerCenter = timerCenter;
    if (WECHAT)
        gf.localStorage = new WechatStorage();
    else
        gf.localStorage = new CommonStorage();
    gf.globalEvent = new EventTarget();
    gf.waiter = new AsyncWaiter();

    gf.log = debugUtil.log;
    gf.forceLog = debugUtil.force_log;
    gf.warn = debugUtil.warn;
    gf.error = debugUtil.error;
    gf.assert = debugUtil.assert;
    gf.soundPlayer = new DefaultSoundPlayer();

}

export function setGameFrameworkSoundPlayer(soundPlayer: gFramework.IGameSoundPlayer) {
    const gf = getGlobal().gFramework;
    gf.soundPlayer = soundPlayer;
}

export function setGameFrameworkUseGM(flag: boolean) {
    const gf = getGlobal().gFramework;
    gf.useGM = flag;
}

class DefaultSoundPlayer implements gFramework.IGameSoundPlayer {
    playSound(soundName: string, option?: any) { }

    playMusic(soundName: string, option?: any) { }

    playUISound(soundName: string, option?: any) {}
}