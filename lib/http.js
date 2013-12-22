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

    var headers = function (xhr, headers, contentType, dataType) {
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

    var stateChange = function (req, url, dataType, type, http) {
        return function () {
            var xhr = req.xhr;
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
                if (!err && _.isObject(data) && type === defaults.type && http.cache) {
                    http.memo(url, dataType, data);
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
            } else if (dataType === "xml") {
                response = xhr.responseXML;
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
            _.debug('Request ready with response:' + JSON.stringify(data) + ' and error:' + err);
            if (this.fn) {
                _.safeCall(this.fn, this, data, err);
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
        var clearUrl = url.substring(0, index != -1 ? index : url.length);
        var splits = clearUrl.split('/');
        _.forEach(splits, function (split) {
            if (split.charAt(0) === ':') {
                var name = split.substr(1);
                var val = params[ name];
                if (_.isDefined(val)) {
                    url = url.replace(split, val);
                    delete  params[name];
                } else {
                    url = url.replace(split, '');
                }
            }
        });
        return url;
    };

    var gatherParams = function (params, url) {
        var sign = "";
        if (url) {
            sign = url.contains("?") ? "&" : "?";
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

    var prepareOpts = function (opts, params) {
        var res = {};
        var app = opts.app;
        var appURL = app && app.url ? app.url : '';
        if (/\{url\}/ig.test(appURL)) {
            res.url = appURL.replace(/\{url\}/ig, (opts.url || ''));
        } else {
            res.url = opts.url ? (appURL + opts.url) : appURL;
        }
        if (!res.url) {
            throw new Error("URL is not defined");
        }
        var appParams = app && app.params ? app.params : {};
        res.params = opts.params ? _.extend(appParams, opts.params) : appParams;
        if (params) {
            _.extend(res.params, params);
        }
        res.url = prepareURL(res.url, res.params);
        var appHeaders = app && app.headers ? app.headers : {};
        res.headers = opts.headers ? _.extend(appHeaders, opts.headers) : appHeaders;
        res.type = opts.type ? opts.type : (app && app.type ? app.type : defaults.type);
        res.contentType = opts.contentType ? opts.contentType : (app && app.contentType ? app.contentType : null);
        res.dataType = opts.dataType ? opts.dataType : (app && app.dataType ? app.dataType : defaults.mime);
        return res;
    };

    var getReadyFn = function (onReady) {
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

    var ajax = function (opts, http, onReady, refetch) {
        var type = opts.type;
        var url = opts.url;
        var params = opts.params;
        var dataType = opts.dataType;
        var contentType = opts.contentType;
        var heads = opts.headers;
        var cached = null;
        _.debug("Ajax call to " + url);
        if (type === defaults.type) {
            url += gatherParams(params, url);
            params = null;
            if (http.cache && !refetch) {
                cached = http.memo(url, dataType);
            }
        } else {
            params = gatherParams(params);
        }
        if (/=\$JSONP/ig.test(url)) {
            return http.jsonp(url, params, onReady, refetch);
        }
        var xhr = new window.XMLHttpRequest();
        var req = new request(xhr, getReadyFn(onReady));
        if (cached) {
            _.debug("Got cached result");
            req.done(cached, null);
        } else {
            xhr.onreadystatechange = stateChange(req, url, dataType, type, http);
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

    var jsonp = function (opts, http, onReady, refetch) {
        var url = opts.url;
        var params = opts.params;
        var head = window.document.getElementsByTagName("head")[0];
        var script = window.document.createElement("script");
        url = prepareURL(url, params);
        url += gatherParams(params, url);
        _.debug("JSONP call to " + url);
        var cached = null;
        if (http.cache && !refetch) {
            cached = http.memo(url, defaults.mime);
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
                http.memo(url, defaults.mime, response);
                return req.done(response, null);
            };

            _.debug("Create JSONP request");
            script.type = "text/javascript";
            script.src = url.replace(/=\$JSONP/ig, "=" + callbackName);
            head.appendChild(script);
        }
        return req;
    };

    var form = function (http, type, params, onReady) {
        var opts = prepareOpts(http, params);
        opts.type = type;
        opts.contentType = "application/x-www-form-urlencoded";
        return ajax(opts, http, onReady);
    };

    var http = function (options, ownConfig, appConfig) {
        this.memoize = {};
        this.cache = true;
        this.app = appConfig;
        //skip app config now, it will be used later in prepareOpts
        if (options && ownConfig) {
            if (_.isString(options)) {
                options = {url: options};
            }
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
            var opts = {};
            opts.url = url;
            opts.params = params;
            return jsonp(opts, this, onReady, refetch);
        },

        get: function (params, onReady, refetch) {
            var opts = prepareOpts(this, params);
            opts.type = defaults.type;
            opts.contentType = null;
            return ajax(opts, this, onReady, refetch);
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

    handle("http", function (obj, config, observer, appConfig) {
        return new http(config, _.isDefined(obj.$http), appConfig);
    }, ['view'], true);

})(window);