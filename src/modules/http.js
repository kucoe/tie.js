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

var http = function (options) {
    if (options) {
        if (options.url) {
            this.url = options.url;
        }
        if (options.params) {
            this.params = options.params;
        }
        if (options.headers) {
            this.headers = options.headers;
        }
        if (options.dataType) {
            this.dataType = options.dataType;
        }
    }
};

var gatherParams = function (params, url) {
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

var status = function (promise, xhr, dataType) {
    var status = xhr.status;
    if ((status >= 200 && status < 300) || status === 0) {
        callback(promise, response(promise, xhr, dataType), null);
    } else {
        callback(promise, xhr.responseText, status);
    }
};

var callback = function (promise, data, err) {
    promise.ok(err, data)
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

var response = function (promise, xhr, dataType) {
    var response;
    response = xhr.responseText;
    if (response) {
        if (dataType === defaults.mime) {
            try {
                response = JSON.parse(response);
            } catch (error) {
                callback(promise, response, error);
            }
        } else {
            if (dataType === "xml") {
                response = xhr.responseXML;
            }
        }
    }
    return response;
};

var prepareParams = function (opts, params) {
    if (params) {
        if (opts.params) {
            _.extend(opts.params, params);
        } else {
            opts.params = params;
        }
    }
};

var thisOrApp = function (obj, property, defaultValue) {
    var res = defaultValue;
    if (app && app.connect && app.connect[property]) {
        var a = app.connect[property];
        if (_.isObject(res)) {
            res = _.extend(res, tmp);
        } else {
            res = tmp;
        }
    }
    var tmp = obj[property];
    if (tmp) {
        if (_.isObject(res)) {
            res = _.extend(res, tmp);
        } else {
            res = tmp;
        }
    }
    return res;
};

var promise = function (xhr) {
    this.xhr = xhr;
    this.done = false;
};

promise.prototype = {
    cancel: function () {
        if (this.xhr) {
            this.xhr.abort();
        }
        this.done = false;
        delete  this.data;
        delete  this.err;
    },
    ok: function (data, err) {
        this.done = true;
        this.data = data;
        this.err = err;
        if (this.fn) {
            safeCall(this.fn, this, true, data, err);
        }
    },
    ready: function (fn) {
        if (this.done && fn) {
            safeCall(this.fn, this, true, this.data, this.err);
        } else {
            this.fn = fn;
        }
    }
};

var ajax = function (opts, onReady, refetch) {
    var type = opts.getType();
    var url = opts.getUrl();
    var params = opts.getParams();
    var dataType = opts.getDataType();
    var contentType = opts.getContentType();
    var heads = opts.getHeaders();
    if (type === defaults.type) {
        url += gatherParams(data, url);
    } else {
        data = gatherParams(data);
    }
    if (/=\$JSONP/ig.test(url)) {
        return this.jsonp(url, data);
    }
    var xhr = new window.XMLHttpRequest();
    var p = promise(xhr);
    if (_.isFunction(onReady)) {
        p.ready(onReady);
    } else if (_.isObject(onReady)) {
        p.ready(function (data, err) {
            if (err) {
                console.err(err);
            } else if (_.isObject(data)) {
                _.extend(onReady, data);
            } else {
                console.log('Response received' + data);
            }
        });
    }
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            return status(p, xhr, dataType);
        }
        return null;
    };
    xhr.open(type, url);
    headers(xhr, heads, contentType, dataType);
    try {
        xhr.send(data);
    } catch (error) {
        xhr = error;
        callback(p, null, error);
    }
    return xhr;
};

http.prototype = {

    jsonp: function (url, data) {
        var head = window.document.getElementsByTagName("head")[0];
        var script = window.document.createElement("script");
        url += this.gatherParams(data, url);

        var callbackName = "jsonp" + _.uid();
        var p = new promise(null);
        window[callbackName] = function (response) {
            head.removeChild(script);
            delete window[callbackName];
            return p.ok(response, null);
        };

        script.type = "text/javascript";
        script.src = url.replace(/=\$JSONP/ig, "=" + callbackName);
        head.appendChild(script);
        return p;
    },
    get: function (params, model, refetch) {
        this.type = defaults.type;
        delete this.contentType;
        prepareParams(this, params);
        return ajax(this, model, refetch);
    },
    post: function (params, model, refetch) {
        return this.form("POST", params, model, refetch);
    },
    put: function (params, model, refetch) {
        return this.form("PUT", params, model, refetch);
    },
    del: function (params, model, refetch) {
        return this.form("DELETE", params, model, refetch);
    },
    delete: function (params, model, refetch) {
        return this.form("DELETE", params, model, refetch);
    },
    form: function (type, params, model, refetch) {
        this.type = type;
        this.contentType = "application/x-www-form-urlencoded";
        prepareParams(this, params);
        return ajax(this, model, refetch);
    },

    getUrl: function () {
        var url = thisOrApp(this, 'url', '');
        if (!url) {
            throw new Error("URL is not defined");
        }
    },

    getParams: function () {
        return thisOrApp(this, 'params', {});
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
        return thisOrApp(this, 'header', {});
    }

};
