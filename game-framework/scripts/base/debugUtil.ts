import { DEBUG } from "cc/env";
import { log as cclog, error as ccerror, warn as ccwarn } from "cc";

var trace_log: Function = function (message: any, ...args: any[]) {cclog(message, ...args)};


export function log(message: any, ...args: any[]): void {
    if (DEBUG) {
        trace_log(message, ...args);
    }
}

export function warn(message: any, ...args: any[]): void {
    ccwarn(message, ...args);
}

export function error(message: any, ...args: any[]): void {
    ccerror(message, ...args);
}

export function assert(condition: any, message?: string) {
    if (DEBUG) {
        if (!condition) {
            throw new Error(message || "Assertion failed");
        }
    }
}

export function tap(value: any, fn = x => x) {
    log(fn(value))
    return value;
}

// export let showDynamicAtlas = CC_DEBUG && function (show: boolean) {
//     cc.dynamicAtlasManager.showDebug(show);
// }


// let _textureSize = 2048;
// let _debugNode: cc.Node = null;

// export let showLetterAtlas = CC_DEBUG && function (show: boolean) {
//     if (show) {
//         if (!_debugNode || !_debugNode.isValid) {
//             let width = cc.visibleRect.width;
//             let height = cc.visibleRect.height;

//             _debugNode = new cc.Node('DYNAMIC_LETTER_ATLAS_DEBUG_NODE');
//             _debugNode.width = width;
//             _debugNode.height = height;
//             _debugNode.x = width / 2;
//             _debugNode.y = height / 2;
//             _debugNode.zIndex = cc.macro.MAX_ZINDEX;
//             _debugNode.parent = cc.director.getScene();

//             //@ts-ignore
//             _debugNode.groupIndex = cc.Node.BuiltinGroupIndex.DEBUG;
//             //@ts-ignore
//             cc.Camera._setupDebugCamera();

//             let scroll = _debugNode.addComponent(cc.ScrollView);

//             let content = new cc.Node('CONTENT');
//             let layout = content.addComponent(cc.Layout);
//             layout.type = cc.Layout.Type.VERTICAL;
//             layout.resizeMode = cc.Layout.ResizeMode.CONTAINER;
//             content.parent = _debugNode;
//             content.width = _textureSize;
//             content.anchorY = 1;
//             content.x = _textureSize;

//             scroll.content = content;

//             let node = new cc.Node('ATLAS');
//             let spriteFrame = new cc.SpriteFrame();
//             spriteFrame.setTexture(cc.Label._shareAtlas.getTexture());
//             let sprite = node.addComponent(cc.Sprite);
//             sprite.spriteFrame = spriteFrame;
            
//             node.parent = content;
//         }
//         return _debugNode;
//     }
//     else {
//         if (_debugNode) {
//             _debugNode.parent = null;
//             _debugNode = null;
//         }
//     }
// }