/**
 * ajax请求
 * @param {String|Object} url 要请求的网址和参数
 * @param {Function} success 成功的回调函数
 * @param {Function} error 失败的回调函数
 * @param {String} dataType 类型 text json
 * @param {Boolean} async 是否异步请求（ 默认是异步）
 */
export function ajax(
    url: string | any, 
    success?: Function, 
    error?: Function, 
    dataType?: "text" | "json", 
    async: boolean = true
) {
    if (typeof url != 'string') {
        success = url.success;
        error = url.error;
        dataType = url.dataType;
        async = url.async;
        url = url.url;
    }

    let xhr: XMLHttpRequest;
    if (window.navigator.userAgent.indexOf('MSIE') > 0) {
        xhr = new (<any>window).ActiveXObject('Microsoft.XMLHTTP');
    } else {
        xhr = new XMLHttpRequest();
    }

    xhr.onreadystatechange = function () {
        //4代表数据发送完毕
        if (xhr.readyState == 4) {
            //0为访问的本地，200到300代表访问服务器成功，304代表没做修改访问的是缓存
            if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 0 || xhr.status == 304) {
                var result = xhr.responseText;
                if (('' != result) && (dataType == 'json'))
                    result = JSON.parse(result);

                typeof (success) == 'function' && success(result);
            }
            else {
                typeof (error) == 'function' && error(xhr.statusText);
            }
        }
    };
    xhr.open('get', url, async === undefined ? true : async);
    // xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.send(null);
}

export function buildQueryString(obj: any) {
    var esc = encodeURIComponent;
    return Object.keys(obj).sort().map(function (k) {
        return esc(k) + '=' + esc(obj[k]);
    }).join('&');
}

export function getUrlArgs(url?: string) {
    let str = url || location.href;
    let index = str.indexOf("?");
    if (index >= 0) {
        str = str.substr(index + 1);
    }
    let decode = decodeURIComponent;

    return str.split("&").reduce(function (map, curr) {
        let index = curr.indexOf("=");
        if (index > 0) {
            map[decode(curr.substring(0, index))] = decode(curr.substr(index + 1));
        } else if (curr) {
            map[curr] = true;
        }
        return map;
    }, Object.create(null));
}