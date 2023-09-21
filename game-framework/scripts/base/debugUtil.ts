import { DEBUG } from "cc/env";

const gameLog: (...args) => void = console.log.bind(console);
const gameError: (...args) => void = console.error.bind(console);
const gameWarn: (...args) => void = console.warn.bind(console) ;

function log(message: any, ...args: any[]): void {
    if (DEBUG) {
        gameLog(message, ...args);
    }
}

function forceLog(message: any, ...args: any[]): void {
    gameLog(message, ...args);
}

function warn(message: any, ...args: any[]): void {
    gameWarn(message, ...args);
}

function error(message: any, ...args: any[]): void {
    gameError(message, ...args);
}

function assert(condition: any, message?: any) {
    if (!condition) {
        if (DEBUG)
            gameError(message ?? 'Assertion failed');
        else
            throw new Error(message ?? 'Assertion failed');
    }
}

export const debugUtil = {
    log,
    forceLog,
    warn,
    error,
    assert
}