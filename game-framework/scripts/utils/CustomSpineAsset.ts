import { Asset, assetManager, BufferAsset, CCObject, Component, isValid, Node, sp, Texture2D, _decorator } from "cc";
import { EDITOR } from "cc/env";
import { editorUtil } from "../editor/EditorUtil";
import { getOrAddComponent } from "./util";

const { ccclass, property, executeInEditMode } = _decorator;

@ccclass("CustomSpineAsset")
@executeInEditMode
export class CustomSpineAsset extends Component {
    @property({ range: [1, 4] })
    scale: number = 1;
    @property
    premultipliedAlpha: boolean = true

    @property({ type: Asset, visible: true })
    private get __skeData() { return this._skeData; }
    private set __skeData(value: Asset) {
        if (EDITOR) {
            this._skeData = value;
            this._onAssetUpdate();
        }
    }

    @property({ type: Asset, visible: true })
    private get __atlasData() { return this._atlasData; }
    private set __atlasData(value: Asset) {
        if (EDITOR) {
            this._atlasData = value;
            this._onAssetUpdate();
        }
    }

    @property({ type: Texture2D, visible: true })
    private get __texture() { return this._texture; }
    private set __texture(value: Texture2D) {
        if (EDITOR) {
            this._texture = value;
            let uuid = value.uuid;
            if (uuid.includes('@'))
                uuid = uuid.substring(0, uuid.indexOf('@'));
            editorUtil.queryAssetInfo(uuid)
                .then(ret => {
                    const name = Editor.Utils.Path.basename(ret.file);
                    this._textureName = name;
                    this._onAssetUpdate();
                })
                .catch(e => console.log(e));
        }
    }

    @property({ visible: true })
    private get _rebuild() { return false; }
    private set _rebuild(value: boolean) {
        if (value) {
            if (isValid(this._model)) {
                this._model.destroy();
                this._model = null;
            }
            this._onAssetUpdate();
        }
    }

    @property({ serializable: true })
    private _skeData: Asset = null;
    @property({ serializable: true })
    private _atlasData: Asset = null;
    @property({ serializable: true })
    private _texture: Texture2D = null;
    @property({ serializable: true, displayName: "textureName", visible: true, readonly: true })
    private _textureName: string = "";

    private _model: Node;

    private get _isValid() {
        return isValid(this._skeData) &&
            isValid(this._atlasData) &&
            isValid(this._texture) &&
            !!this._textureName;
    }

    onLoad() {
        this._onAssetUpdate();
    }

    private _onAssetUpdate() {
        if (!this._isValid)
            return;

        let node: Node;
        if (isValid(this._model))
            node = this._model;
        else
            node = this._model = new Node("SpineBody");
        node.parent = this.node;
        node.layer = this.node.layer;
        node.setScale(this.scale, this.scale, this.scale);
        if (EDITOR)
            node._objFlags |= CCObject.Flags.DontSave;
        const spine = getOrAddComponent(node, sp.Skeleton);
        const skeleton = new sp.SkeletonData();
        skeleton._nativeAsset = this._skeData._nativeAsset;
        skeleton.atlasText = this._atlasData._nativeAsset;
        skeleton.textures = [this._texture];
        skeleton.textureNames = [this._textureName];
        skeleton._uuid = this._skeData.uuid;
        skeleton._nativeUrl = this._skeData._nativeUrl;
        spine.skeletonData = skeleton;
        spine.setAnimation(0, "idle", true);
        spine.premultipliedAlpha = this.premultipliedAlpha;
    }

    private static _inited = false;
    /**
     * 注册特定后缀的资源下载和工厂策略
     */
    static init() {
        if (this._inited)
            return;
        this._inited = true;
        // assetManager.downloader.register(
        //     ".mixskel",
        //     (url: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: any | null) => void)) => {
        //         options.xhrResponseType = "arraybuffer";
        //         assetManager.downloader.downloadFile(url, options, options.onFileProgress, onComplete);
        //     }
        // )
        // assetManager.factory.register(
        //     ".mixskel",
        //     (id: string, data: ArrayBufferView, options: Record<string, any>, onComplete: ((err: Error | null, data?: any | null) => void)) => {
        //         const out = new BufferAsset();
        //         out._nativeUrl = id;
        //         out._nativeAsset = data;
        //         onComplete(null, out);
        //     }
        // )
    }
}

(function register() {
    //注册特定后缀的资源下载和工厂策略
    assetManager.downloader.register(
        ".mixskel",
        (url: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: any | null) => void)) => {
            options.xhrResponseType = "arraybuffer";
            assetManager.downloader.downloadFile(url, options, options.onFileProgress, onComplete);
        }
    );
    /**
     * @deprecated
     * 没有跑到这里来的
     * 实际上大部分native资源并没有使用工厂函数创建Asset，而是在资源加载完成的时候直接用asset._nativeAsset = arraybuffer的方式指定，
     */
    assetManager.factory.register(
        ".mixskel",
        (id: string, data: ArrayBufferView, options: Record<string, any>, onComplete: ((err: Error | null, data?: any | null) => void)) => {
            const out = new BufferAsset();
            out._nativeUrl = id;
            out._nativeAsset = data;
            onComplete(null, data);
        }
    );
})();