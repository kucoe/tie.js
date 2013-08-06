/**
 * Tie.js HTTP handle
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */
(function (window) {
    'use strict';

    var _ = window.tie._;

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

    var stateChange = function (req, url, dataType, type, opts) {
        return function () {
            var xhr = request.xhr;
            if (xhr.readyState === 4) {
                _.debug("Process response");
                var status = xhr.status;
                var err, data;
                if ((status >= 200 && status < 300) || status === 0) {
                    data = response(req, dataType);
                } else {
                    data = xhr.responseText;
                    err = status;
                }
                if (!err && _.isObject(data) && type === defaults.type && opts.cache) {
                    opts.memo(url, dataType, data);
                }
                req.done(data, err);
            }
            return null;
        }
    };

    var response = function (request, dataType) {
        var xhr = request.xhr;
        var response = xhr.responseText;
        if (response) {
            if (dataType === defaults.mime) {
                try {
                    response = JSON.parse(response);
                } catch (error) {
                    request.done(response, error);
                }
            } else {
                if (dataType === "xml") {
                    response = xhr.responseXML;
                }
            }
        }
        return response;
    };

    var request = function (xhr, fn) {
        this.xhr = xhr;
        this.ready = false;
        this.fn = fn;
    };

    request.prototype = {

        cancel: function () {
            if (this.xhr) {
                this.xhr.abort();
            }
            this.ready = false;
            delete  this.data;
            delete  this.err;
        },

        done: function (data, err) {
            this.ready = true;
            this.data = data;
            this.err = err;
            _.debug('Request ready with response:' + data + ' and error:' + err);
            if (this.fn) {
                safeCall(this.fn, this, true, data, err);
            } else {
                console.log('Response received:' + data);
            }
        }
    };

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
        return res === sign ? '' : res;
    };

    var prepareOpts = function(opts, params) {
        var obj = opts.obj;
        var top = obj.$$app ? obj.$app.$http : null;
        var topURL = top ? top.url : '';
        opts.url = opts.url ? (topURL + opts.url) : topURL;
        if (!opts.url) {
            throw new Error("URL is not defined");
        }
        var topParams = top ? top.params : {};
        opts.params = opts.params ? _.extend(topParams, opts.params) : topParams;
        if (params) {
            _.extend(opts.params, params);
        }
        opts.url = prepareURL(opts.url, params);
        var topHeader = top ? top.header : {};
        opts.header = opts.header ? _.extend(topParams, opts.header) : topHeader;
        opts.type = opts.type ? opts.type : (top ? top.type : defaults.type);
        opts.contentType = opts.contentType ? opts.contentType : (top ? top.contentType : null);
        opts.dataType = opts.dataType ? opts.dataType : (top ? top.dataType : defaults.mime);
        return opts;
    };

    var getReadyFn = function(onReady) {
        var fn = null;
        if (_.isFunction(onReady)) {
            fn = onReady;
        } else if (_.isObject(onReady)) {
            fn = function (data, err) {
                if (err) {
                    console.error(err);
                } else if (_.isObject(data)) {
                    _.extend(onReady, data);
                } else {
                    console.log('Response received:' + data);
                }
            };
        }
        return fn;
    };

    var ajax = function (opts, onReady, refetch) {
        var type = opts.getType();
        var url = opts.getUrl();
        var params = opts.getParams();
        var dataType = opts.getDataType();
        var contentType = opts.getContentType();
        var heads = opts.getHeaders();
        var cached = null;
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
        var req = new request(xhr, getReadyFn(onReady));
        if (cached) {
            _.debug("Got cached result");
            req.done(cached, null);
        } else {
            xhr.onreadystatechange = stateChange(req, url, dataType, type, opts);
            xhr.open(type, url);
            headers(xhr, heads, contentType, dataType);
            try {
                _.debug("Send request");
                xhr.send(params);
            } catch (error) {
                req.done(null, error);
            }
        }
        return req;
    };

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
        var req = new request(null, getReadyFn(onReady));
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

    var form = function (opts, type, params, onReady) {
        opts.type = type;
        opts.contentType = "application/x-www-form-urlencoded";
        opts = prepareOpts(opts, params);
        return ajax(opts, onReady);
    };

    var http = function (options, obj) {
        this.memoize = {};
        this.cache = true;
        this.obj = obj;
        //skip app config now, it will be used later in prepareOpts
        if (options && obj.$http){
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

    http.prototype = {

        // url with '=$JSONP' to replace by callback name or '$JSONP' as value in params
        jsonp: function (url, params, onReady, refetch) {
            var opts = _.extend({}, this);
            opts.url = url;
            opts.params = params;
            return jsonp(opts, onReady, refetch);
        },

        get: function (params, onReady, refetch) {
            this.type = defaults.type;
            delete this.contentType;
            var opts = prepareOpts(this, params);
            return ajax(opts, onReady, refetch);
        },

        post: function (params, onReady) {
            return form(this, "POST", params, onReady);
        },

        put: function (params, onReady) {
            return form(this, "PUT", params, onReady);
        },

        "delete": function (params, onReady) {
            return form(this, "DELETE", params, onReady);
        },

        memo: function (url, type, value) {
            var hash = url + type;
            if (_.isDefined(value)) {
                this.memoize[hash] = value;
            }
            return this.memoize[hash];
        }

    };

    var handle = window.tie.handle;

    handle("http", function (obj, config) {
        return new http(config, obj);
    }, ['attrs'], true);

})(window);