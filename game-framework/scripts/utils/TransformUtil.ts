import { UITransform } from "cc";

export const transformUtil = {
    leftX,
    rightX,
    centerX,
    anchorOffsetX,
    bottomY,
    topY,
    centerY,
    anchorOffsetY
}

/**
 * 左边界x坐标
 */
function leftX(transform: UITransform, isWorldPos?: boolean) {
    const x = isWorldPos ? 
        transform.node.worldPosition.x :
        transform.node.position.x;
    const width = transform.width;
    return x - width*transform.anchorX;
}

/**
 * 右边界x坐标
 */
function rightX(transform: UITransform, isWorldPos?: boolean) {
    return leftX(transform, isWorldPos) + transform.width;
}

/**
 * 中心点x坐标
 */
function centerX(transform: UITransform, isWorldPos?: boolean) {
    return leftX(transform, isWorldPos) + transform.width*0.5;
}

/**
 * 锚点距左边界的距离
 */
function anchorOffsetX(transform: UITransform) {
    return transform.width * transform.anchorX;
}

/**
 * 下边界y坐标
 */
function bottomY(transform: UITransform, isWorldPos?: boolean) {
    const y = isWorldPos ?
        transform.node.worldPosition.y :
        transform.node.position.y;
    const height = transform.height;
    return y - height*transform.anchorY;
}

/**
 * 上边界y坐标
 */
function topY(transform: UITransform, isWorldPos?: boolean) {
    return bottomY(transform, isWorldPos) + transform.height;
}

/**
 * 中心y坐标
 */
function centerY(transform: UITransform, isWorldPos?: boolean) {
    return bottomY(transform, isWorldPos) + transform.height*0.5;
}

/**
 * 锚点距下边界的距离
 */
function anchorOffsetY(transform: UITransform) {
    return transform.height * transform.anchorY;
}