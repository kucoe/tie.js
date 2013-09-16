/**
 * Tie.js HTTP Connect handle
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */


var _;

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

var headers = function (headers, contentType, dataType) {
    if (contentType) {
        headers["Content-Type"] = contentType;
    }
    if (dataType) {
        headers["Accept"] = mimeTypes[dataType];
    }
    return headers;
};

var request = function (req, fn) {
    this.request = req;
    this.ready = false;
    this.fn = fn;
};

request.prototype = {

    cancel: function () {
        if (this.request && _.isFunction(this.request.abort)) {
            this.request.abort();
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
            _.safeCall(this.fn, this, true, data, err);
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

var connect = function (opts, http, onReady, refetch) {
    var type = opts.type;
    var url = opts.url;
    var params = opts.params;
    var dataType = opts.dataType;
    var contentType = opts.contentType;
    var heads = opts.headers;
    heads = headers(heads, contentType, dataType);
    var cached = null;
    _.debug("Connect to " + url);
    if (type === defaults.type) {
        url += gatherParams(params, url);
        params = '';
        if (http.cache && !refetch) {
            cached = http.memo(url, dataType);
        }
    } else {
        params = gatherParams(params);
    }
    var req;
    if (cached) {
        req = new request({}, getReadyFn(onReady));
        _.debug("Got cached result");
        req.done(cached, null);
    } else {
        var main = require(url.substr(0, 8) == 'https://' ? 'https' : 'http').request(opts, function (res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                _.debug("Process response");
                var status = res.statusCode;
                var err, data;
                data = chunk;
                if ((status >= 200 && status < 300) || status === 0) {
                    if (dataType === defaults.mime) {
                        try {
                            data = JSON.parse(data);
                        } catch (error) {
                            err = error;
                        }
                    }
                } else {
                    err = status;
                }
                if (!err && _.isObject(data) && type === defaults.type && http.cache) {
                    http.memo(url, dataType, data);
                }
                req.done(data, err);
            });
        });

        req = new request(main, getReadyFn(onReady));
        main.on('error', function (error) {
            req.done(null, error);
        });

        // write data to request body
        _.debug("Send request");
        main.write(params);
        main.end();
    }
    return req;
};

var form = function (http, type, params, onReady) {
    var opts = prepareOpts(http, params);
    opts.type = type;
    opts.contentType = "application/x-www-form-urlencoded";
    return connect(opts, http, onReady);
};

var http = function (options, ownConfig, appConfig) {
    this.memoize = {};
    this.cache = true;
    this.app = appConfig;
    //skip app config now, it will be used later in prepareOpts
    if (options && ownConfig) {
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

    get: function (params, onReady, refetch) {
        var opts = prepareOpts(this, params);
        opts.type = defaults.type;
        opts.contentType = null;
        return connect(opts, this, onReady, refetch);
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


module.exports = function (core) {
    init(core);
    _ = core._;
    return http;
};

var init = function (tie) {
    tie.handle("request", function (obj, config, watcher, appConfig) {
        return new http(config, _.isDefined(obj.$http), appConfig);
    }, [], true);
};