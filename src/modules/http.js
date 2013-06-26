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


/**
 * Reads status, response and callback with results.
 *
 * @param {request} request
 * @param {string} dataType
 * @returns {Array}
 */
var status = function (request, dataType) {
    var xhr = request.xhr;
    var status = xhr.status;
    var err, data;
    if ((status >= 200 && status < 300) || status === 0) {
        data = response(request, xhr, dataType);
    } else {
        data = xhr.responseText;
        err = status;
    }
    return [data, err];
};

/**
 * Calls request with results
 *
 * @param {request} request
 * @param {Object|string} data
 * @param {Error|string} err
 */
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

var stateChange = function (req, xhr, url, dataType, type, opts) {
    return function () {
        if (xhr.readyState === 4) {
            _.debug("Process response");
            var st = status(req, dataType);
            var data = st[0];
            var err = st[1];
            if (!err && _.isObject(data) && type === defaults.type && opts.cache) {
                opts.memo(url, dataType, data);
            }
            callback(req, data, err);
        }
        return null;
    }
};

/**
 * Process response
 *
 * @param {request} request
 * @param {XMLHttpRequest} xhr
 * @param {string} dataType
 * @returns {String|Object}
 */
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

var thisOrApp = function (obj, property, defaultValue) {
    var res = defaultValue;
    if (app && app.connect && app.connect[property]) {
        var a = app.connect[property];
        if (_.isObject(res)) {
            res = _.extend(res, a);
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
            console.error(err);
        } else if (_.isObject(data)) {
            _.extend(model, data);
            model._fetched = true;
        } else {
            console.log('Response received:' + data);
        }
    };
};


/**
 * Replaces '/:id' like parts of URL with parameter value.<br/>
 * It removes parameter from list of parameters to avoid duplications.
 *
 * @param {string} url
 * @param {Object} params
 * @returns {string}
 */
var prepareURL = function (url, params) {
    if (!url) {
        return url;
    }
    var index = url.indexOf('?');
    var clearUrl = url.substring(0, index + 1 ? index : url.length);
    var splits = clearUrl.split('/');
    _.forEach(splits, function (split) {
        if (split[0] === ':') {
            var name = split.substr(1);
            var val = params[ name];
            if (_.isDefined(val)) {
                url.replace(split, val);
                delete  params[name];
            }
        }
    });
    return url;
};

/**
 * Merges parameters with exiting parameters
 *
 * @param {Object} opts
 * @param {Object} params
 */
var prepareParams = function (opts, params) {
    if (params) {
        if (opts.params) {
            _.extend(opts.params, params);
        } else {
            opts.params = params;
        }
    }
};

/**
 * Return parameters body string. If url is passed - calculate value to be appended to url.
 *
 * @param {Object} params
 * @param {string} [url]
 * @returns {string}
 */
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
    url = prepareURL(url, params);
    _.debug("Ajax call to " + url);
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
    var req = new request(xhr, fn);
    if (cached) {
        _.debug("Got cached result");
        callback(req, cached, null);
    } else {
        xhr.onreadystatechange = stateChange(req, xhr, url, dataType, type, opts);
        xhr.open(type, url);
        headers(xhr, heads, contentType, dataType);
        try {
            _.debug("Send request");
            xhr.send(params);
        } catch (error) {
            xhr = error;
            callback(req, null, error);
        }
    }
    return req;
};

/**
 * Executes JSONP request
 *
 * @param {Object} opts request options
 * @param {model|Function} onReady function to be called when response received
 * or model to be updated with response values
 * @param {boolean} [refetch] whether to explicitly fetch data from sever even if cached copy exists.
 * Setting http.cache to false will make refetch default behavior
 * @return request
 */
var jsonp = function (opts, onReady, refetch) {
    var url = opts.url;
    var params = opts.params;
    var head = window.document.getElementsByTagName("head")[0];
    var script = window.document.createElement("script");
    url = prepareURL(url, params);
    url += gatherParams(params, url);
    _.debug("JSONP call to " + url);
    var cached = null;
    if (opts.cache && !refetch) {
        cached = opts.memo(url, defaults.mime);
    }
    var fn = null;
    if (_.isFunction(onReady)) {
        fn = onReady;
    } else if (_.isObject(onReady)) {
        fn = defaultResponder(onReady);
    }
    var req = new request(null, fn);
    if (cached) {
        _.debug("Got cached result");
        req.done(cached, null);
    } else {
        var callbackName = "jsonp" + _.uid();
        window[callbackName] = function (response) {
            head.removeChild(script);
            delete window[callbackName];
            _.debug("Process response");
            opts.memo(url, defaults.mime, response);
            return req.done(response, null);
        };

        _.debug("Create JSONP request");
        script.type = "text/javascript";
        script.src = url.replace(/=\$JSONP/ig, "=" + callbackName);
        head.appendChild(script);
    }
    return req;
};

/**
 * Executes form url encoded content request
 *
 * @param {Object} opts request options
 * @param {string} type request type ('POST', 'PUT', 'DELETE')
 * @param {Object} params request params to be set in request body
 * @param {model|Function} onReady function to be called when response received
 * or model to be updated with response values
 * @return request
 */
var form = function (opts, type, params, onReady) {
    opts.type = type;
    opts.contentType = "application/x-www-form-urlencoded";
    prepareParams(opts, params);
    return ajax(opts, onReady);
};

/**
 * Http prototype
 */
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
        var opts = _.extend({}, this);
        opts.url = url;
        opts.params = params;
        return jsonp(opts, onReady, refetch);
    },

    /**
     * Executes GET request
     *
     * @this http
     * @param {Object} params request params to be joined to URL
     * @param {model|Function} onReady function to be called when response received
     * or model to be updated with response values
     * @param {boolean} [refetch] whether to explicitly fetch data from sever even if cached copy exists.
     * Setting http.cache to false will make refetch default behavior
     * @return request
     */
    get: function (params, onReady, refetch) {
        this.type = defaults.type;
        delete this.contentType;
        prepareParams(this, params);
        return ajax(this, onReady, refetch);
    },

    /**
     * Executes POST request
     *
     * @this http
     * @param {Object} params request params to be set in request body
     * @param {model|Function} onReady function to be called when response received
     * or model to be updated with response values
     * @return request
     */
    post: function (params, onReady) {
        return form(this, "POST", params, onReady);
    },

    /**
     * Executes PUT request
     *
     * @this http
     * @param {Object} params request params to be set in request body
     * @param {model|Function} onReady function to be called when response received
     * or model to be updated with response values
     * @return request
     */
    put: function (params, onReady) {
        return form(this, "PUT", params, onReady);
    },

    /**
     * Executes DELETE request
     *
     * @this http
     * @param {Object} params request params to be set in request body
     * @param {model|Function} onReady function to be called when response received
     * or model to be updated with response values
     * @return request
     */
    "delete": function (params, onReady) {
        return form(this, "DELETE", params, onReady);
    },

    getUrl: function () {
        var url = thisOrApp(this, 'url', '');
        if (!url) {
            throw new Error("URL is not defined");
        }
        return url;
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

    /**
     * Memoizes cache value or return existed
     *
     * @param {string} url
     * @param {string} type data type
     * @param {*} [value] value to cache
     * @returns {*}
     */
    memo: function (url, type, value) {
        var hash = url + type;
        if (_.isDefined(value)) {
            this.memoize[hash] = value;
        }
        return this.memoize[hash];
    }

};
