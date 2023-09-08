import { director } from "cc";
import { aspects } from "../utils/Aspects";
import { supportVersions } from "./SupportVersions";

let isBatcherWalking = false;
let walkDepth = 0;

function init() {
    aspects.checkEngineVersion(supportVersions._3_7_x, true);

    const batcher = director.root.batcher2D;
    //@ts-ignore
    const walkDesc = Object.getOwnPropertyDescriptor(batcher.__proto__, "walk");

    Object.defineProperty(
        batcher,
        "walk",
        {
            configurable: true,
            value: function (node: Node, level: number = 0) {
                if (walkDepth++ == 0) {
                    isBatcherWalking = true;
                    try {
                        walkDesc.value.call(this, node, level);
                    } catch (e) {
                        throw e;
                    } finally {
                        if (--walkDepth == 0)
                            isBatcherWalking = false;
                    }
                } else {
                    walkDesc.value.call(this, node, level);
                    if (--walkDepth == 0)
                        isBatcherWalking = false;
                }
            }
        }
    )
}

export const injectBatcher2D = {
    init,
    get isBatcherWalking() { return isBatcherWalking; }
}