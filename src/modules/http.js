/**
 * Default values for http
 */
var defaults = {
    type: "GET",
    mime: "json"
};

/**
 * Supported MIME types
 */
var mimeTypes = {
    script: "text/javascript, application/javascript",
    json: "application/json",
    xml: "application/xml, text/xml",
    html: "text/html",
    text: "text/plain"
};

/**
 * Creates http wrapper based on user described options
 *
 * @constructor
 * @class http
 * @this http
 * @param {Object} options
 */
var http = function (options) {
    this.memoize = {};
    this.cache = true;
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
        if (_.isDefined(options.cache)) {
            this.cache = options.cache;
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

var status = function (request, xhr, dataType) {
    var status = xhr.status;
    if ((status >= 200 && status < 300) || status === 0) {
        var data = response(request, xhr, dataType);
        callback(request, data, null);
        return data;
    } else {
        callback(request, xhr.responseText, status);
    }
    return null;
};

var callback = function (request, data, err) {
    request.done(data, err);
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

var response = function (request, xhr, dataType) {
    var response;
    response = xhr.responseText;
    if (response) {
        if (dataType === defaults.mime) {
            try {
                response = JSON.parse(response);
            } catch (error) {
                callback(request, response, error);
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

/**
 * Creates http request object based on XHR
 *
 * @constructor
 * @class request
 * @this request
 * @param {XMLHttpRequest} xhr
 * @param {Function} fn callback function
 */
var request = function (xhr, fn) {
    this.xhr = xhr;
    this.ready = false;
    this.fn = fn;
};

/**
 * Request prototype
 */
request.prototype = {

    /**
     * Cancels request
     *
     * @this request
     */
    cancel: function () {
        if (this.xhr) {
            this.xhr.abort();
        }
        this.ready = false;
        delete  this.data;
        delete  this.err;
    },

    /**
     * Call callback when request is done.<br/>
     * After this called the data and error are stored in request properties.
     *
     * @this request
     * @param {Object|string} data response data
     * @param {Error|string} err response error
     */
    done: function (data, err) {
        this.ready = true;
        this.data = data;
        this.err = err;
        if (this.fn) {
            safeCall(this.fn, this, true, data, err);
        } else {
            console.log('Response received:' + data);
        }
    }
};

/**
 * Default responding function, will log error or plain response in console
 * and update model specified in case of JSON response
 *
 * @param {model} model to update with response data
 */
var defaultResponder = function (model) {
    return function (data, err) {
        if (err) {
            console.err(err);
        } else if (_.isObject(data)) {
            _.extend(model, data);
        } else {
            console.log('Response received:' + data);
        }
    };
};


/**
 * Executes AJAX request
 *
 * @param {Object} opts request options
 * @param {model|Function} onReady function to be called when response received
 * or model to be updated with response values
 * @param {boolean} [refetch] whether to explicitly fetch data from sever even if cached copy exists.
 * Setting http.cache to false will make refetch default behavior
 * @return request
 */
var ajax = function (opts, onReady, refetch) {
    var type = opts.getType();
    var url = opts.getUrl();
    var params = opts.getParams();
    var dataType = opts.getDataType();
    var contentType = opts.getContentType();
    var heads = opts.getHeaders();
    var cached = null;
    if (type === defaults.type) {
        url += gatherParams(params, url);
        if (opts.cache && !refetch) {
            cached = opts.memo(url, dataType);
        }
    } else {
        params = gatherParams(params);
    }
    if (/=\$JSONP/ig.test(url)) {
        return this.jsonp(url, data);
    }
    var xhr = new window.XMLHttpRequest();
    var fn = null;
    if (_.isFunction(onReady)) {
        fn = onReady;
    } else if (_.isObject(onReady)) {
        fn = defaultResponder(onReady);
    }
    var req = request(xhr, fn);
    if (cached) {
        callback(req, cached, null);
    } else {
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                var data = status(req, xhr, dataType);
                if(data && type === defaults.type && opts.cache) {
                    opts.memo(url, dataType, data);
                }
            }
            return null;
        };
        xhr.open(type, url);
        headers(xhr, heads, contentType, dataType);
        try {
            xhr.send(params);
        } catch (error) {
            xhr = error;
            callback(p, null, error);
        }
    }
    return req;
};

http.prototype = {

    /**
     * Executes JSONP request
     *
     * @this http
     * @param {string} url request URl (with '=$JSONP' to replace by callback name)
     * @param {Object} params request params to be joined to URL. ('$JSONP' as value also works)
     * @param {model|Function} onReady function to be called when response received
     * or model to be updated with response values
     * @param {boolean} [refetch] whether to explicitly fetch data from sever even if cached copy exists.
     * Setting http.cache to false will make refetch default behavior
     * @return request
     */
    jsonp: function (url, params, onReady, refetch) {
        var head = window.document.getElementsByTagName("head")[0];
        var script = window.document.createElement("script");
        url += this.gatherParams(params, url);
        var cached = null;
        if (this.cache && !refetch) {
            cached = this.memo(url, defaults.mime);
        }
        var fn = null;
        if (_.isFunction(onReady)) {
            fn = onReady;
        } else if (_.isObject(onReady)) {
            fn = defaultResponder(onReady);
        }
        var req = new request(null, fn);
        if (cached) {
            req.done(cached, null);
        } else {
            var callbackName = "jsonp" + _.uid();
            var that = this;
            window[callbackName] = function (response) {
                head.removeChild(script);
                delete window[callbackName];
                that.memo(url, defaults.mime, response);
                return req.done(response, null);
            };

            script.type = "text/javascript";
            script.src = url.replace(/=\$JSONP/ig, "=" + callbackName);
            head.appendChild(script);
        }
        return req;
    },

    get: function (params, onReady, refetch) {
        this.type = defaults.type;
        delete this.contentType;
        prepareParams(this, params);
        return ajax(this, onReady, refetch);
    },

    post: function (params, onReady, refetch) {
        return this.form("POST", params, onReady, refetch);
    },

    put: function (params, onReady, refetch) {
        return this.form("PUT", params, onReady, refetch);
    },

    delete: function (params, onReady, refetch) {
        return this.form("DELETE", params, onReady, refetch);
    },

    form: function (type, params, onReady, refetch) {
        this.type = type;
        this.contentType = "application/x-www-form-urlencoded";
        prepareParams(this, params);
        return ajax(this, onReady, refetch);
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
    },

    memo : function (url, type, value) {
        var hash = url + type;
        if(_.isDefined(value)) {
            this.memoize[hash] = value;
        }
        return this.memoize[hash];
    }

};
