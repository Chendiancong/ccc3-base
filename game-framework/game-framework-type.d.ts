
declare type Constructor<T = any> = { new(...args): T };

type RecursiveReadonly<T> = {
    readonly [K in keyof T]: T[K] extends number | string | boolean | Function ? T[K] : RecursiveReadonly<T[K]>
};

declare namespace gFramework {
    //type defines

    //usable fields
    export const systemMgr: typeof import("../game-framework/scripts/base/SystemMgr").systemMgr;
    export const net: typeof import("../game-framework/scripts/net/GameNet");
    export const timerCenter: import("../game-framework/scripts/timer/PriorityTimer").PriorityTimer;
    export const localStorage: IStorage;
    export const globalEvent: import("cc").EventTarget;
    export const waiter: import("../game-framework/scripts/utils/AsyncWaiter").AsyncWaiter;
    export const soundPlayer: IGameSoundPlayer;
    export const useGM: boolean;

    export function log(message: any, ...args: any[]): void;
    export function forceLog(message: any, ...args: any[]): void;
    export function warn(message: any, ...args: any[]): void;
    export function error(message: any, ...args: any[]): void;
    export function assert(condition: any, message?: string): void;
}

declare namespace gFramework {
    //types
    export interface IBigNumberLike {
        radix: number;
        exp: number;
    }

    export interface IPoolItem {
        onPoolCreate(...args: any[]): void;
        onPoolReuse(...args: any[]): void;
        onPoolRestore(): void;
        onPoolDispose(): void;
    }

    export type ObjectPoolOption<T extends IPoolItem> = {
        /** 对象池有效时间，毫秒，5000的倍数，对象池多长时间后没有被使用则进行清除，默认为0，<=0为永远不清除 */
        expireMs?: number;
        /** 创建函数 */
        ctor: () => T;
        /** 创建时参数获取 */
        ctorArgs?: () => any[];
        /** 重用时参数获取 */
        reuseArgs?: () => any[];
    }

    export interface IStorage {
        setItem(key: string, value: string);
        getItem(key: string): string;
        removeItem(key: string);
        clear();
    }

    export type PromiseDefer<T> = {
        promise: Promise<T>,
        resolve: (arg: T) => void,
        reject: (err?: any) => void,
    }

    export interface IResHolder {
        onResUnuse(): void;
    }

    interface IGameSoundPlayer {
        playSound: (soundName: string, option?: any) => void;
        playMusic: (musicName: string, option?: any) => void;
        playUISound: (soundName: string, option?: any) => void;
    }
}

/** 小游戏的api定义 */
declare namespace wx {
    type APICallback = {
        /** 接口调用成功的回调函数 */
        success?: Function;
        /** 接口调用失败的回调函数 */
        fail?: Function;
        /** 接口调用结束的回调函数（调用成功、失败都会执行） */
        complete?: Function;
    }
    type WXStorageData = APICallback & {
        /** 本地缓存中指定的key */
        key: string;
        /** 需要存储的对象，只支持原生类型、Date、及能通过JSON.stringify序列化的对象 */
        data: any;
        /**
         * 是否开启加密存储。只有异步的 setStorage 接口支持开启加密存储。
         * 开启后，将会对 data 使用 AES128 加密，接口回调耗时将会增加
         * 若开启加密存储，setStorage 和 getStorage 需要同时声明 encrypt 的值为 true。
         * 此外，由于加密后的数据会比原始数据膨胀1.4倍，因此开启 encrypt 的情况下，单个 key 允许存储的最大数据长度为 0.7MB，所有数据存储上限为 7.1MB
         */
        encrypt?: boolean;
    }

    type WXClearStorageOption = APICallback & {}
    type WXRemoveStorageOption = APICallback & {
        /** 本地缓存中指定的key */
        key: string;
    }
    type WXBounding = {
        /** 宽度px */
        width: number;
        /** 高度px */
        height: number;
        /** 上边界坐标px */
        top: number;
        /** 右边界坐标px */
        right: number;
        /** 下边界坐标px */
        bottom: number;
        /** 坐边界坐标px */
        left: number;
    }

    type WXSystemInfo = {
        /** 设备像素比 */
        pixelRatio: number;
        /** 屏幕宽度 */
        screenWidth: number;
        /** 屏幕高度 */
        screenHeight: number;
        /** 设备名称 */
        brand: string;
        /**
         * 客户端平台：
         * ios ios微信（包含IPhone、iPad）
         * android Android微信
         * windows Windows微信
         * mac macOS微信
         * devtools 微信开发者工具
         */
        platform: 'ios'|'android'|'windows'|'mac'|'devtools';
    }

    type WXUserInfo = {
        nickName: string;
        avatarUrl: string;
    }

    type WXGetUserInfoRes = {
        /** 用户信息对象，不包含openid等敏感信息 */
        userInfo: WXUserInfo;
    }

    type WXGetUserInfoParams = {
        /**
         * 是否带上登录态信息。当withCredentials为true时，要求此前又调用过wx.login且
         * 登录态尚未过期，此时返回的数据会包含encryptedData，iv等敏感信息；当withCredentials为
         * false时，不要求有登录态，返回的数据不包含encryptedData，iv等敏感信息
         */
        withCredentials?: boolean;
        /**
         * 显示用户信息的语言
         * en 英文；zh_CN 简体中文，zh_TW 繁体中文
         */
        lang: string;
        /**
         * 接口调用成功的回调函数
         */
        success: (res: WXGetUserInfoRes) => void;
        /**
         * 接口调用失败的回调函数
         */
        fail: Function;
        /**
         * 接口调用结束的回调函数（调用成功、失败都会执行）
         */
        complete: Function;
    }

    type WXLoginOption = {
        /** 超时时间，单位ms */
        timeout?: number;
        /** 接口调用成功的回调函数 */
        success?: (res: { code?: string }) => void;
        /** 接口调用失败的回调函数 */
        fail?: (err: any) => void;
        /** 接口调用结束的回调函数（调用成功、失败都会执行） */
        complete?: () => void;
    }

    type WXMidasPaymentOption = {
        /** 支付的类型，game：游戏支付 */
        mode: "game",
        /** 环境配置，0米大师正式环境，1米大师沙箱环境 */
        env: 0|1,
        /** 在米大师测申请的应用id */
        offerId: string,
        /** 币种，CNY：人民币 */
        currencyType: "CNY",
        /** 申请接入时的平台，platform与应用id有关 */
        platform?: 'android'|'windows',
        /** 支付数量，只支持特定数量，具体可见https://developers.weixin.qq.com/minigame/dev/api/midas-payment/wx.requestMidasPayment.html#buyQuantity-%E9%99%90%E5%88%B6%E8%AF%B4%E6%98%8E*/
        buyQuantity: number,
        /** 分区id */
        zoneId?: number,
        /**
         * 业务订单号，每个订单号只能使用一次，重复使用会失败。
         * 开发者需要确保该订单号在对应游戏下的唯一性，平台会尽可能校验该唯一性约束，
         * 但极端情况下可能会跳过对该约束的校验。
         * 要求32个字符内，只能是数字、大小写字母、符号_-|*组成，不能以下划线（)开头。
         * 建议每次调用wx.requestMidasPayment都换新的outTradeNo。
         * 若没有传入，则平台会自动填充一个，并以下划线开头
         */
        outTradeNo?: string,
        /** 接口调用成功的回调函数 */
        success?: (res: { errMsg: string }) => void,
        /** 接口调用失败的回调函数 */
        fail?: (err: { errMsg: string, errCode: number }) => void,
        /** 接口调用结束的回调函数（调用成功，失败都会执行） */
        complete?: () => void,
    }

    type WXShowModalOption = {
        /** 提示的标题 */
        title: string,
        /** 提示的内容 */
        content: string,
        /** 是否显示取消按钮，默认true */
        showCancel?: boolean,
        /** 取消按钮的文字，最多4个字符，默认取消 */
        cancelText?: string,
        /** 取消按钮的文字颜色，必须是16进制格式的颜色字符串，默认#000000 */
        cancelColor?: string,
        /** 确认按钮的文字，最多4个字符，默认确定 */
        confirmTxt?: string,
        /** 确认按钮的文字颜色，必须是16进制格式的颜色字符串，默认#000000 */
        confirmColor?: string,
        /**
         * @version 2.17.1
         * 是否显示输入框，默认false
         */
        editable?: boolean,
        /**
         * @version 2.17.1
         * 显示输入框时的提示文本
         */
        placeholderText?: string,
        /** 接口调用成功的回调函数 */
        success?: (res: WXShowModalSuccessRes) => void,
        /** 接口调用失败的回调函数 */
        fail?: (err) => void,
        /** 接口调用结束的回调函数（调用成功、失败都会执行） */
        complete?: () => void,
    }

    type WXShowModalSuccessRes = {
        /** editable为true时，用户输入的文本 */
        content?: string,
        /** 为true时，表示用户点击了确定按钮 */
        confirm?: boolean,
        /** 为true时，表示用户点击了取消（用于Android系统区分点击蒙层关闭还是点击取消按钮关闭） */
        cancel?: boolean,
    }

    type WXSetKeepScreenOnOption = {
        /** 是否保持常亮 */
        keepScreenOn: boolean,
        /** 接口调用成功的回调函数 */
        success?: Function,
        /** 接口调用失败的回调函数 */
        fail?: Function,
        /** 接口调用失败的回调函数 */
        complete?: Function
    }

    type WXShareAppMessageOption = {
        /** 转发标题，不传则默认使用当前小游戏的昵称。 */
        title?: string;
        /** 转发显示图片的链接，可以是网络图片路径或本地图片文件路径或相对代码包根目录的图片文件路径。显示图片长宽比是 5:4 */
        imageUrl?: string;
        /** 查询字符串，从这条转发消息进入后，可通过 wx.getLaunchOptionsSync() 或 wx.onShow() 获取启动参数中的 query。必须是 key1=val1&key2=val2 的格式。 */
        query?: string;
        /** 审核通过的图片 ID，>2.4.3 */
        imageUrlId?: string;
        /** 是否转发到当前群。该参数只对从群工具栏打开的场景下生效，默认转发到当前群，填入false时可转发到其他会话。>2.12.2 */
        toCurrentGroup?: boolean;
        /** 独立分包路径。>2.12.2 */
        path?: string;
    }

    type WXCreateInnerAudioContextOption = {
        /**
         * 是否使用WebAudio作为底层音频驱动，默认关闭。对于段音频、
         * 播放频繁的音频建议开启此选项，开启后将获得更优的性能表现。
         * 由于开启此选项后也会带来一定的内存增长，因此对于长音频建议关闭此选项。
         */
        useWebAudioImplement?: boolean;
    }

    type WXOpenCustomerServiceConversation = {
        /** 会话来源 */
        sessionFrom?: string;
        /** 是否显示会话内消息卡片，设置此参数为 true，用户进入客服会话会在右下角显示"可能要发送的小程序"提示，用户点击后可以快速发送小程序消息 */
        showMessageCard?: boolean;
        /** 会话内消息卡片标题 */
        sendMessageTitle?: string;
        /** 会话内卡片路径 */
        sendMessagePath?: string;
        /** 会话内消息卡片图片路径 */
        sendMessageImg?: string;
        /** 接口调用成功的回调函数 */
        success?: Function;
        /** 接口调用失败的回调函数 */
        fail?: Function;
        /** 接口调用结束的回调函数（调用成功、失败都会执行） */
        complete?: Function;
    }

    type WXAccountInfo = {
        /** 小程序账号信息 */
        miniProgram: {
            /** 小程序 appId */
            appId: string;
            /**
             * 小程序版本
             * develop: 开发版
             * trial: 体验版
             * release: 正式版
             */
            envVersion: 'develop'|'trial'|'release';
            /** 线上小程序版本号 */
            version: string;
        },
        /** 插件账号信息（仅在插件中调用时包含这一项） */
        plugin: {
            /** 插件 appId */
            appId: string;
            /** 插件版本号 */
            version: string;
        }
    }

    type WXRequestOption = {
        /** 开发者服务器接口地址 */
        url: string;
        /** 请求的参数 */
        data?: string|Object|ArrayBuffer;
        /** 设置请求的header，header中不能设置Refer */
        header?: Object;
        /** 超时时间，单位为毫秒，默认值为60000 */
        timeout?: number;
        /** HTTP 请求方法 */
        method: 'OPTIONS'|'GET'|'HEAD'|'POST'|'PUT'|'DELETE'|'TRACE'|'CONNECT'
        /**
         * 返回的数据格式，默认json
         * json 返回的数据为JSON，返回后会对返回的数据进行一次JSON.parse。
         * 其他 不对返回的内容进行JSON.parse。
         */
        dataType?: 'json';
        /**
         * 响应的数据类型，默认text
         * text 响应的数据为文本
         * arraybuffer 响应的数据为ArrayBuffer
         */
        responseType?: 'text'|'arraybuffer';
        success?: (res: WXRequestSuccessResult) => void;
        fail?: (errMsg: string, errno: number) => void;
        complete?: () => void;
    }

    type WXRequestSuccessResult = {
        /** 开发者服务器返回的数据 */
        data: string|Object|ArrayBuffer;
        /** 开发者服务器返回的HTTP状态码 */
        statusCode: number;
        /** 开发者服务器返回的HTTP Response Header */
        header: Object;
        /** 开发者服务器返回的 cookies，格式为字符串数组 */
        cookies: string[];
    }

    type WXCreateRewardedVideoAdOption = {
        /** 广告单元id */
        adUnitId: string;
        /** 是否启用多例模式，默认为false */
        multiton?: boolean;
    }

    type WXRewardedVideoAd = {
        /** 加载视频激励广告 */
        load: () => Promise<void>;
        /** 显示激励视频广告。激励视频广告将从屏幕下方推入 */
        show: () => Promise<void>;
        /** 摧毁激励视频广告实例 */
        destroy: () => void;
        /** 监听激励视频广告加载事件 */
        onLoad: (listener: (res: any) => void) => void;
        /** 移除激励视频广告加载事件的监听函数 */
        offLoad: (listener: (res: any) => void) => void;
        /** 监听激励视频错误事件 */
        onError: (listener: (err: WXRewardedVideoError) => void) => void;
        /** 移除激励视频错误事件的监听函数 */
        offError: (listener: (err: WXRewardedVideoError) => void) => void;
        /** 监听用户点击 关闭广告 按钮的事件 */
        onClose: (listener: (res: WXRewardedVideoAdResult) => void) => void;
        /** 移除用户点击 关闭广告 按钮的事件的监听函数 */
        offClose: (listener: (res: WXRewardedVideoAdResult) => void) => void;
    }

    type WXRewardedVideoError = {
        /** 错误信息 */
        errMsg: string;
        /**
         * 错误码
         * 1000: 后端接口调用失败
         * 1001: 参数错误
         * 1002: 广告单元无效
         * 1003: 内部错误
         * 1004: 无合适广告
         * 1005: 广告组件审核中
         * 1006: 广告组件被驳回
         * 1007: 广告组件被禁封
         * 1008: 广告单元已关闭
         * 错误码信息及解决方案见：https://developers.weixin.qq.com/minigame/dev/api/ad/RewardedVideoAd.onError.html
         */
        errCode: number;
    }

    type WXRewardedVideoAdResult = {
        /** 是否播放完成 */
        isEnded: boolean;
    }

    type WXShowToastOption = {
        /** 提示的内容 */
        title: string;
        /** 提示的延迟事件，默认1500ms */
        duration?: number;
        /** 是否显示提示透明蒙层，防止触摸穿透，默认false */
        mask?: boolean;
        /**
         * 图标
         * success 显示成功图标，此时 title 文本最多显示 7 个汉字长度；
         * error 显示失败图标，此时 title 文本最多显示 7 个汉字长度；
         * loading 显示加载图标，此时 title 文本最多显示 7 个汉字长度；
         * none 不显示图标，此时 title 文本最多可显示两行，1.9.0及以上版本支持；
         */
        icon?: 'success'|'error'|'loading'|'none';
    }&APICallback;

    type WXShowLoadingOption = {
        /** 提示的内容 */
        title: string;
        /** 是否显示透明蒙层，防止触摸穿透，默认false */
        mask?: boolean;
    }&APICallback;

    type WXHideLoadingOption = {
        /** 目前toast和loading相关接口可以相互混用，此参数可用于取消混用特性 */
        noConflict?: boolean;
    }&APICallback;

    function setStorageSync(key: string, data: string): void;
    function getStorageSync(key: string): string;
    function clearStorageSync(): void;
    function removeStorageSync(key: string): void;
    function setStorage(data: WXStorageData): void;
    function getStorage(data: WXStorageData): void;
    function clearStorage(callback: WXClearStorageOption): void;
    function removeStorage(callback: WXRemoveStorageOption): void;

    function login(option: WXLoginOption): void;
    function request(option: WXRequestOption): void;
    function getAccountInfoSync(): WXAccountInfo;
    function createRewardedVideoAd(option: WXCreateRewardedVideoAdOption): WXRewardedVideoAd;
    function getMenuButtonBoundingClientRect(): WXBounding;
    function getSystemInfoSync(): WXSystemInfo;
    function getUserInfo(): void;
    function onMemoryWarning(listener: Function): void;
    function offMemoryWarning(listener: Function): void;
    function requestMidasPayment(option: WXMidasPaymentOption): void;
    /** 显示弹窗 */
    function showModal(option: WXShowModalOption): void;
    function setKeepScreenOn(option: WXSetKeepScreenOnOption): void;
    function shareAppMessage(option: WXShareAppMessageOption): void;
    /** 创建音效组件 */
    function createInnerAudioContext(option: WXCreateInnerAudioContextOption): void;
    /** 打开客服 */
    function openCustomerServiceConversation(option: WXOpenCustomerServiceConversation): void;
    /** 显示消息提示框 */
    function showToast(option: WXShowToastOption): Promise<void>;
    /** 显示loading提示框。需主动调用wx.hideLoading才能关闭提示框 */
    function showLoading(option: WXShowLoadingOption): Promise<void>;
    /** 隐藏loading提示框 */
    function hideLoading(option?: WXHideLoadingOption): Promise<void>;
}

/** 游戏网络层*/
declare let Net: typeof import("../game-framework/scripts/net/GameNet");