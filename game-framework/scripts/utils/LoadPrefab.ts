import { _decorator, Component, Node, Prefab, isValid, instantiate, Vec3, Vec2, CCObject, UITransform, Size, UIOpacity, macro } from 'cc';
import { ResKeeper } from '../res/ResKeeper';
import { ResMgr } from '../res/ResMgr';
import { aspects } from './Aspects';
import { Lerper } from './Lerper';
import TimeUtil from './TimeUtil';
import { getOrAddComponent } from './util';
const { ccclass, property, executeInEditMode } = _decorator;
const { checkEditor } = aspects;

@ccclass('LoadPrefab')
@executeInEditMode
export class LoadPrefab extends Component {
    static readonly EventType = {
        LOADED: 'loaded'
    };

    private _prefab: Prefab = null;
    @property({ type: Prefab })
    get prefab() { return this._prefab; }
    set prefab(value: Prefab) {
        if (this._uuid === value?.uuid)
            return;
        if (isValid(value))
            this._uuid = value.uuid;
        else
            this._uuid = '';
        this._onPrefabChange(value);
        this._instantiatePrefab();
    }
    @property({ serializable: true, visible: true, readonly: true })
    private _uuid: string = '';

    @property({ displayName: '加载完成的时候渐显', visible: true, serializable: true})
    private _fadeInWhenLoaded: boolean = false;

    @property({ visible: true, readonly: true, serializable: true })
    private _propertyOk: boolean = false;
    @property({ visible: true, readonly: true, serializable: true })
    private _targetPosition: Vec3 = new Vec3();
    @property({ visible: true, readonly: true, serializable: true })
    private _targetAnchor: Vec2 = new Vec2();
    @property({ visible: true, readonly: true, serializable: true })
    private _targetSize: Size = new Size();
    @property({ visible: true, readonly: true, serializable: true })
    private _targetEulerAngles: Vec3 = new Vec3();
    @property({ visible: true, readonly: true, serializable: true })
    private _targetScale: Vec3 = new Vec3();

    private _targetNode: Node;

    onLoad() {
        if (checkEditor())
            this._watchSceneChange();
        else
            this._checkFadeInWhenLoaded();

        this._loadPrefabByUuid();
    }

    private _watchSceneChange() {
        cce.Scene.on('save', _ => this._setupTargetProperty());
    }

    private _checkFadeInWhenLoaded() {
        if (this._fadeInWhenLoaded) {
            const opacity = getOrAddComponent(this.node, UIOpacity);
            opacity.opacity = 0;
            this.node.once(
                LoadPrefab.EventType.LOADED,
                () => {
                    let lerper = new Lerper()
                        .setStartValue(opacity.opacity)
                        .setEndValue(255)
                        .setDuration(700)
                        .setLimited(true)
                        .start();
                    let func = () => {
                        lerper.delta(TimeUtil.gameDeltaTimeMs);
                        opacity.opacity = lerper.curValue;
                        if (!lerper.isRunning)
                            this.unschedule(func);
                    }
                    this.schedule(func, 0, macro.REPEAT_FOREVER);
                }
            );
        }
    }

    private _resKeeper: ResKeeper;
    private _onPrefabChange(cur: Prefab) {
        if (!checkEditor()) {
            // 非编辑器模式下加入资源管理
            if (isValid(cur))
                this._resKeeper = ResKeeper.register(this.node, cur, this._resKeeper);
        }
        this._prefab = cur;
    }

    async _loadPrefabByUuid() {
        if (!this._uuid)
            return;
        const prefab = await ResMgr.loadUuid<Prefab>(this._uuid);

        this._onPrefabChange(prefab);
        this._instantiatePrefab();

        this.node.emit(LoadPrefab.EventType.LOADED);
    }

    private _setupTargetProperty() {
        const node = this._targetNode;
        if (!isValid(node))
            return;
        this._targetPosition.set(node.position);
        this._targetEulerAngles.set(node.eulerAngles);
        this._targetScale.set(node.scale);

        const transform = node.getComponent(UITransform);
        if (isValid(transform)) {
            this._targetAnchor.set(transform.anchorPoint);
            this._targetSize.set(transform.contentSize);
        }
    }

    private _instantiatePrefab() {
        if (!isValid(this._prefab))
            return;
        const node = this._targetNode = instantiate(this._prefab);
        node.parent = this.node;
        if (this._propertyOk) {
            node.setPosition(this._targetPosition);
            node.setRotationFromEuler(this._targetEulerAngles);
            node.setScale(this._targetScale);

            const transform = node.getComponent(UITransform);
            if (isValid(transform)) {
                transform.setAnchorPoint(this._targetAnchor);
                transform.setContentSize(this._targetSize);
            }
        } else {
            this._propertyOk = true;
            this._setupTargetProperty();
        }

        if (checkEditor())
            this._dontSaveNode(node);
    }

    private _dontSaveNode(node: Node) {
        const Flags = CCObject.Flags;
        node._objFlags |= Flags.DontSave;
    }
}