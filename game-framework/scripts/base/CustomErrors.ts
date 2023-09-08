function errorFrom<T extends Error>(err: any, ErrorCtor: { new(...args): T }) {
    if (err == void 0)
        return new ErrorCtor("unknown error");
    if (err instanceof Error)
        return new ErrorCtor(err.message);
    else
        return new ErrorCtor(err.errCode??err.errMsg??err);
}

export enum PlatformErrorCode {
    None,
    IOSNoPay,
    UserCancelPay,
    SdkPayErr,
    UnknownPlatform
}

const kErrMsg = {
    [PlatformErrorCode.None]: '',
    [PlatformErrorCode.IOSNoPay]: 'ios充值未开放',
    [PlatformErrorCode.UserCancelPay]: '用户取消充值',
    [PlatformErrorCode.SdkPayErr]: 'sdk支付异常',
    [PlatformErrorCode.UnknownPlatform]: '未知的支付平台',
}

/** 平台异常 */
class PlatformError extends Error {
    declare private _code: number;

    get code() { return this._code; }

    static create(code: PlatformErrorCode, msg?: string) {
        const err = new PlatformError(msg??kErrMsg[code]??'unknwon error');
        err._code = code;
        return err;
    }
}

export const CustomErrors = {
    PlatformError
}