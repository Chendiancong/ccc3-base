import { isValid, Node } from "cc";

export const nodeUtil = {
    toTop
}

/** 将节点移至节点树的顶端 */
function toTop(node: Node) {
    const parent = node.parent;
    if (isValid(parent)) {
        node.setSiblingIndex(parent.children.length);
    }
}