import { Component, Constructor, js, Node } from "cc";
import { defer } from "../base/promise";

export function getOrAddComponent(component: Component | Node, className: string)
export function getOrAddComponent<T extends Component>(component: Component | Node, classConstructor: Constructor<T>): T
export function getOrAddComponent(component: Component | Node, param: any) {
    if (!component)
        return;
    let res: any;
    if (!(res = component.getComponent(param)))
        res = component.addComponent(param);

    return res;
}

export function getLocalDate(i: number, time: number) {
    // 参数i为时区值数字，比如北京为东八区则输入8，纽约为西5区输-5
    if (typeof i !== 'number') return;
    let d = new Date(time);
    let len = d.getTime();
    let offset = d.getTimezoneOffset() * 60000;
    let utcTime = len + offset;
    return new Date(utcTime + 3600000 * i);
}

export function localDate(time: number) {
    return getLocalDate(8, time);
}

export const numCharStr = ["", `一`, `二`, `三`, `四`, `五`, `六`, `七`, `八`, `九`, `十`, `十一`, `十二`, `十三`, `十四`, `十五`, `十六`, `十七`, `十八`, `十九`, `二十`];

export const weekDayCharStr = ["", `周一`, `周二`, `周三`, `周四`, `周五`, `周六`, `周日`];

export function secFormat(sec: number, fmt: string = 'dd天hh时mm分ss秒') {
    let colonFlag = fmt.search(/h+:/g) != -1 || fmt.search(/m+:/g) != -1 || fmt.search(/s+:/g) != -1;
    sec = Math.floor(sec);
    let day = Math.floor(sec / (3600 * 24));
    let hours = Math.floor(sec / 3600);
    if (fmt.includes('d')) {
        if (day <= 0) {
            fmt = fmt.replace(/d+天?/g, "");
        } else if (day < 10) {
            fmt = fmt.replace(/d+/g, "d");
        }
        hours %= 24;
    }
    let minutes = Math.floor(sec / 60);
    if (fmt.includes('h')) {
        if (!colonFlag) {
            if (hours <= 0 && !fmt.includes('d')) {
                fmt = fmt.replace(/h+时?/g, "");
            } else if (hours < 10) {
                fmt = fmt.replace(/h+/g, "h");
            }
        }
        minutes %= 60;
    }
    let seconds = sec;
    if (fmt.includes('m')) {
        if (!colonFlag) {
            if (minutes <= 0 && !fmt.includes('h')) {
                fmt = fmt.replace(/m+分?/g, "");
            } if (minutes < 10) {
                fmt = fmt.replace(/m+/g, "m");
            }
        }
        seconds %= 60;
    }
    if (minutes < 10) {
        fmt = fmt.replace(/s+/g, "s");
    }
    var o = {
        "d+": day, //日 
        "h+": hours, //小时 
        "m+": minutes, //分 
        "s+": seconds, //秒 
    };

    let a: string, b: string;
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            a = RegExp.$1;
            b = "" + o[k];
            fmt = fmt.replace(a, (a.length <= b.length ? "" : ("0".repeat(a.length - b.length))) + b);
        }
    }
    return fmt;
}

/** 自动更换格式 */
export function secFormatAuto(sec: number) {
    let fmt: string = "";
    let day = Math.floor(sec / (3600 * 24));
    let dayFlag = false;
    let hourFlag = false;
    let minutesFlag = false;
    fmt += (day >= 10) ? "dd天" : ((day >= 1) ? "d天" : "");
    let hours = Math.floor(sec / 3600);
    if (day == 1 && (hours % 24) == 0) {
        fmt = "";
    }
    if (fmt.includes('d')) {
        hours %= 24;
        dayFlag = true;
    }
    fmt += (hours > 10) ? "hh时" : ((dayFlag || hours > 0) ? "h时" : "");
    let minutes = Math.floor(sec / 60);
    if (hours == 1 && (minutes % 60) == 0) {
        fmt = "";
    }
    if (dayFlag || fmt.includes('h')) {
        minutes %= 60;
        hourFlag = true;
    }
    fmt += (minutes > 10) ? "mm分" : ((hourFlag || minutes > 0) ? "m分" : "");
    let seconds = sec;
    if (hourFlag || fmt.includes('m')) {
        seconds %= 60;
        minutesFlag = true;
    }
    fmt += (seconds > 10) ? "ss秒" : ((minutesFlag || seconds > 0) ? "s秒" : "");
    var o = {
        "d+": day, //日 
        "h+": hours, //小时 
        "m+": minutes, //分 
        "s+": seconds, //秒 
    };
    let a: string, b: string;
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            a = RegExp.$1;
            b = "" + o[k];
            fmt = fmt.replace(a, (a.length <= b.length ? "" : ("0".repeat(a.length - b.length))) + b);
        }
    }
    return fmt;
}
/** 自动更换格式2 (简略: x时x分    x分x秒   x秒) */
export function secFormatAuto2(sec: number) {
    let fmt: string = "";
    let day = Math.floor(sec / (3600 * 24));
    let cnt = 0;
    let dayFlag = false;
    let hourFlag = false;
    let minutesFlag = false;
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    fmt += (day >= 10) ? "dd天" : ((day >= 1) ? "d天" : "");
    hours = Math.floor(sec / 3600);
    if (day == 1 && (hours % 24) == 0) {
        fmt = "";
    }
    if (fmt.includes('d')) {
        hours %= 24;
        dayFlag = true;
        cnt++;
    }
    fmt += (hours > 10) ? "hh时" : ((dayFlag || hours > 0) ? "h时" : "");
    minutes = Math.floor(sec / 60);
    if (hours == 1 && (minutes % 60) == 0) {
        fmt = "";
    }
    if (dayFlag || fmt.includes('h')) {
        minutes %= 60;
        hourFlag = true;
        cnt++;
    }
    if (cnt < 2) {
        fmt += (minutes > 10) ? "mm分" : ((hourFlag || minutes > 0) ? "m分" : "");
        seconds = sec;
        if (hourFlag || fmt.includes('m')) {
            seconds %= 60;
            minutesFlag = true;
            cnt++;
        }
        if (cnt < 2) {
            fmt += (seconds > 10) ? "ss秒" : ((minutesFlag || seconds > 0) ? "s秒" : "");
        }
    }
    var o = {
        "d+": day, //日 
        "h+": hours, //小时 
        "m+": minutes, //分 
        "s+": seconds, //秒 
    };
    let a: string, b: string;
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            a = RegExp.$1;
            b = "" + o[k];
            fmt = fmt.replace(a, (a.length <= b.length ? "" : ("0".repeat(a.length - b.length))) + b);
        }
    }
    return fmt;
}

/** 自动更换格式3 (简略:x天, x时 , x分 ,  x秒) */
export function secFormatAuto3(sec: number) {
    let fmt: string = "";
    let day = Math.floor(sec / (3600 * 24));
    let cnt = 0;
    let dayFlag = false;
    let hourFlag = false;
    let minutesFlag = false;
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    fmt += (day >= 10) ? "dd天" : ((day >= 1) ? "d天" : "");
    hours = Math.floor(sec / 3600);
    if (day == 1 && (hours % 24) == 0) {
        fmt = "";
    }
    if (fmt.includes('d')) {
        hours %= 24;
        dayFlag = true;
        cnt++;
    }
    if (cnt < 1) {
        fmt += (hours > 10) ? "hh时" : ((dayFlag || hours > 0) ? "h时" : "");
        minutes = Math.floor(sec / 60);
        if (hours == 1 && (minutes % 60) == 0) {
            fmt = "";
        }
        if (dayFlag || fmt.includes('h')) {
            minutes %= 60;
            hourFlag = true;
            cnt++;
        }
        if (cnt < 1) {
            fmt += (minutes > 10) ? "mm分" : ((hourFlag || minutes > 0) ? "m分" : "");
            seconds = sec;
            if (hourFlag || fmt.includes('m')) {
                seconds %= 60;
                minutesFlag = true;
                cnt++;
            }
            if (cnt < 1) {
                fmt += (seconds > 10) ? "ss秒" : ((minutesFlag || seconds > 0) ? "s秒" : "");
            }
        }
    }
    var o = {
        "d+": day, //日 
        "h+": hours, //小时 
        "m+": minutes, //分 
        "s+": seconds, //秒 
    };
    let a: string, b: string;
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            a = RegExp.$1;
            b = "" + o[k];
            fmt = fmt.replace(a, (a.length <= b.length ? "" : ("0".repeat(a.length - b.length))) + b);
        }
    }
    return fmt;
}

export function dateFormat(d: Date, fmt: string) {
    //YYYY:年 MM:月 DD:日  hh:时 ii:分 ss:秒
    let month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
    let day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
    let hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
    let minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
    let second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();
    return fmt.replace('YYYY', "" + d.getFullYear())
        .replace('MM', "" + month)
        .replace('DD', "" + day)
        .replace('hh', "" + hour)
        .replace('ii', "" + minute)
        .replace('ss', "" + second);
}

export function parseQueryString(out: Object, str: string, separator: string = "&") {
    return str.split(separator).reduce((map, curr) => {
        let index = curr.indexOf("=");
        if (index > 0) {
            map[curr.substring(0, index)] = curr.substr(index + 1);
        } else if (curr) {
            map[curr] = true;
        }
        return map;
    }, out || Object.create(null));
}

/** 获取icon 包里的资源路径 */
export function getIconURL(name: string) {
    return gFramework.viewMgr.getItemURL("icon_auto", name);
}


/** 到午夜 0 点的秒数 */
export function getZero() {
    new Date()
}


// /** 服务端的状态转换 成客户端的 "在线"" 或 "离线" 文本 */
// export function transLineStatusTxt(lastLogoutTime?: number): string {
//     if (!lastLogoutTime) {
//         return "在线";//在线 
//     } else {
//         return transTimeStatusTxt(lastLogoutTime);
//     }
// }

// /** 转换时间描述 主要用于聊天,邮件的接收发送时间 如: xx分钟前 */
// export function transTimeStatusTxt(targetSec: number): string {
//     let chaSec = Net.getServerTimeSec() - targetSec;
//     let daySec = 3600 * 24;
//     let hourSec = 3600;
//     let minue5Sec = 60 * 5;
//     if (chaSec > daySec) {
//         return Math.floor(chaSec / daySec) + `天前`;
//     } else if (chaSec > hourSec) {
//         return Math.floor(chaSec / hourSec) + `小时前`;
//     } else if (chaSec > minue5Sec) {
//         return Math.floor(chaSec / 60) + `分钟前`;
//     } else {
//         return `5分钟内`;
//     }
// }

/** 常用剩余时间展示 (小于1分钟展示成1分钟)*/
export function transComomTimeTxt(cutTime: number): string {
    if (cutTime <= 0) return "";
    let daySec = 3600 * 24;
    let hourSec = 3600;
    let minue1Sec = 60 * 1;
    if (cutTime > daySec) {
        return Math.floor(cutTime / daySec) + `天`;
    } else if (cutTime > hourSec) {
        return Math.floor(cutTime / hourSec) + `小时`;
    } else if (cutTime > minue1Sec) {
        return Math.floor(cutTime / 60) + `分钟`;
    } else {
        return `1分钟`;
    }
}

/** 获取当日零点的时间戳 */
export function getNextDayZeroTimestamp(): number {
    var date = new Date(Net.getServerTime());
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    let oneDaySec = 24 * 60 * 60;
    return Math.floor((date.getTime() / 1000) + oneDaySec);
}

/** 获取下一个五点的时间戳 */
export function getNextDayFiveTimestamp(): number {
    var date = new Date(Net.getServerTime());
    let fiveFlag = date.getHours() < 5;
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    let oneDaySec = fiveFlag ? 0 : (24 * 60 * 60);
    let fiveHoursSec = 60 * 60 * 5;
    return Math.floor((date.getTime() / 1000) + fiveHoursSec + oneDaySec);
}


var gDescPattern = /(%s|%d|%f|%[0-9][sdf]?)/g
/** 解析描述 */
export function parseDesc(str: string, nArgs?: (number | Long)[], sArgs?: string[], n = 0, s = 0) {
    if (str) {
        str = str.replace(gDescPattern, function (match, p1) {
            if (sArgs && p1 === '%s') {
                return sArgs[s++] || "";
            } else if (nArgs) {
                if (p1 === '%d') {
                    let value = nArgs[n++];
                    return "" + (value == void 0 ? "" : value);
                } else if (p1 === '%f') {
                    let value = nArgs[n++];
                    return "" + (value == void 0 ? "" : +value / 10000);
                } else {
                    // %[0-9][sdf]?
                    let c = p1.charAt(1);
                    let d = p1.charAt(2);
                    let value = (d === 's' ? sArgs[c] : nArgs[c]);
                    return "" + (value == void 0 ? "" : d === 'f' ? +value / 10000 : value);
                }
            }
            return "";
        });
    }
    return str;
}

/**将方法绑定到类或者类原型的某个属性上，以便查表调用 */
export function bindHandle(key: any, propName: string) {
    return function (classOrProto: any, methodName: string, desc: PropertyDescriptor) {
        let handles = classOrProto[propName];
        if (handles == void 0)
            handles = classOrProto[propName] = {};
        const f = desc.value;
        js.get(f, "methodName", () => methodName);
        handles[key] = f;
    }
}

/**
 * 等待一段时间，使用setTimeout
 * @param ms 等待的毫秒数
 */
export function waitTimeout(ms: number) {
    const d = defer<void>();
    setTimeout(() => d.resolve(), ms);
    return d.promise;
}