var defaults = {
    type: "GET",
    mime: "json"
};
var mimeTypes = {
    script: "text/javascript, application/javascript",
    json: "application/json",
    xml: "application/xml, text/xml",
    html: "text/html",
    text: "text/plain"
};

var connect = function (options) {
    if (options) {
        _.extend(this, options);
    }
};

var params = function (params, url) {
    var sign = "";
    if (url) {
        sign = url.indexOf("?") + 1 ? "&" : "?";
    }
    var res = sign;
    _.forIn(params, function (param, name) {
        if (res !== sign) {
            res += "&";
        }
        res += name + "=" + param;
    });
    if (res === sign) {
        return "";
    }
    return res;
};

var status = function (xhr, dataType, fn) {
    var status = xhr.status;
    if ((status >= 200 && status < 300) || status === 0) {
        callback(response(xhr, dataType, fn), null, fn);
    } else {
        callback(xhr.responseText, status, fn);
    }
};

var callback = function (response, error, fn) {
    safeCall(fn, obj, true, response, error);
};

var headers = function (xhr, headers, dataType, contentType) {
    if (contentType) {
        headers["Content-Type"] = contentType;
    }
    if (dataType) {
        headers["Accept"] = mimeTypes[dataType];
    }
    _.forIn(headers, function (header, name) {
        xhr.setRequestHeader(name, header);
    });
};

var response = function (xhr, dataType, fn) {
    var response;
    response = xhr.responseText;
    if (response) {
        if (dataType === defaults.mime) {
            try {
                response = JSON.parse(response);
            } catch (error) {
                callback(response, error, fn);
            }
        } else {
            if (dataType === "xml") {
                response = xhr.responseXML;
            }
        }
    }
    return response;
};

var thisOrApp = function (obj, property, defaultValue) {
    if (obj[property]) {
        return obj[property];
    }
    if (app && app.connect && app.connect[property]) {
        return app.connect[property];
    }
    return defaultValue;
};

var apply = function (obj, opts) {
    _.forIn(opts, function (value, prop) {
        if (value) {
            obj[prop] = value;
        }
    });
};

connect.prototype = {

    ajax: function () {
        var type = this.getType();
        var url = this.getUrl();
        var data = this.getData();
        var dataType = this.getDataType();
        var contentType = this.getContentType();
        var heads = this.getHeaders();
        var fn = this.getCallback();
        if (type === defaults.type) {
            url += params(data, url);
        } else {
            data = params(data);
        }
        if (/=\$JSONP/ig.test(url)) {
            return this.jsonp(url, data, fn);
        }
        var xhr = new window.XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                return status(xhr, dataType, fn);
            }
            return null;
        };
        xhr.open(type, url);
        headers(xhr, heads, contentType, dataType);
        try {
            xhr.send(data);
        } catch (error) {
            xhr = error;
            callback(null, error, fn);
        }
        return xhr;
    },
    jsonp: function (url, data, callback) {
        var head = window.document.getElementsByTagName("head")[0];
        var script = window.document.createElement("script");
        url += this.params(data, url);

        var callbackName = "jsonp" + _.uid();
        window[callbackName] = function (response) {
            head.removeChild(script);
            delete window[callbackName];
            return callback(response);
        };

        script.type = "text/javascript";
        script.src = url.replace(/=\$JSONP/ig, "=" + callbackName);
        head.appendChild(script);
    },
    get: function (url, data, dataType, callback) {
        apply(this, {
            type: defaults.type,
            url: url,
            data: data,
            callback: callback,
            dataType: dataType
        });
        return this.ajax();
    },
    post: function (url, data, dataType, callback) {
        return this.form("POST", url, data, dataType, callback);
    },
    put: function (url, data, dataType, callback) {
        return this.form("PUT", url, data, dataType, callback);
    },
    del: function (url, data, dataType, callback) {
        return this.form("DELETE", url, data, dataType, callback);
    },
    delete: function (url, data, dataType, callback) {
        return this.form("DELETE", url, data, dataType, callback);
    },
    form: function (method, url, data, dataType, callback) {
        apply(this, {
            type: method,
            url: url,
            data: data,
            callback: callback,
            dataType: dataType,
            contentType: "application/x-www-form-urlencoded"
        });
        return this.ajax();
    },

    getUrl: function () {
        var url = thisOrApp(this, 'url', '');
        if (!url) {
            throw new Error("URL is not defined");
        }
    },

    getData: function () {
        return thisOrApp(this, 'data', {});
    },

    getType: function () {
        return thisOrApp(this, 'type', defaults.type);
    },

    getContentType: function () {
        return thisOrApp(this, 'contentType', null);
    },

    getDataType: function () {
        return thisOrApp(this, 'dataType', defaults.mime);
    },

    getHeaders: function () {
        return thisOrApp(this, 'header', []);
    },

    getCallback: function () {
        return thisOrApp(this, 'callback', []);
    }
};
