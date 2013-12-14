/**
 * Tie.js HTTP Connect handle
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */

var qs = require('querystring');
var _;
var testMode = false;

var defaults = {
    method: "GET",
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

var connection = function (req, fn) {
    this.request = req;
    this.ready = false;
    this.fn = fn;
};

connection.prototype = {

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
    var sign = '';
    if (url) {
        sign = url.indexOf('?') + 1 ? '&' : '?';
    }
    var res = qs.stringify(params);
    return  res ? sign + res: '';
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
    res.method = opts.method ? opts.method : (app && app.method ? app.method : defaults.method);
    res.contentType = opts.contentType ? opts.contentType : (app && app.contentType ? app.contentType : null);
    res.dataType = opts.dataType ? opts.dataType : (app && app.dataType ? app.dataType : defaults.mime);
    res = _.extend(res, require('url').parse(res.url));
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

var handleRequestErrors = function (e, conn, url) {
    var s = e.message || e;
    switch (e.code) {
        case 'ECONNREFUSED':
            s = 'Connection refused from address: ' + url;
            break;
        case 'ECONNRESET':
            s = 'Connection reset for address: ' + url;
            break;
        case 'ENOTFOUND':
            s = 'Could not reach server by address: ' + url;
            break;
        default:
            s = 'Connection problem for adsress: ' + url + ' - ' + s;
    }
    conn.done(null, s);
};

var connect = function (opts, http, onReady, refetch) {
    var method = opts.method;
    var url = opts.url;
    var params = opts.params;
    var dataType = opts.dataType;
    var contentType = opts.contentType;
    opts.headers = headers(opts.headers, contentType, dataType);
    var cached = null;
    _.debug("Connect to " + url);
    if (method === defaults.method) {
        opts.url = url += gatherParams(params, url);
        opts.params = params = '';
        if (http.cache && !refetch) {
            cached = http.memo(url, dataType);
        }
    } else {
        opts.params = params = gatherParams(params);
    }
    var conn;
    if (cached) {
        conn = new connection({}, getReadyFn(onReady));
        _.debug("Got cached result");
        conn.done(cached, null);
    } else {
        var connect = require(url.substr(0, 8) == 'https://' ? 'https' : 'http');
        var req = connect.request(opts);

        req.on('response', function (res) {
            res.setEncoding('utf8');
            res.body = '';
            res.on('data', function (chunk) {
                res.body += chunk;
            });
            res.on('end', function () {
                _.debug("Process response");
                var status = res.statusCode;
                var err, data;
                data = res.body;
                if ((status >= 200 && status < 300) || status === 0) {
                    if (dataType === defaults.mime) {
                        try {
                            data = JSON.parse(data);
                        } catch (error) {
                            err = 'Response not valid JSON:' + error + '\n' + res.body;
                        }
                    }
                } else {
                    err = status + ':' + data;
                }
                if (!err && _.isObject(data) && method === defaults.method && http.cache) {
                    http.memo(url, dataType, data);
                }
                if (err) {
                    handleRequestErrors(err, conn, url);
                } else {
                    conn.done(data);
                }
            });
        });

        conn = new connection(req, getReadyFn(onReady));
        if (testMode) {
            _.extend(req, opts);
        }
        req.on('error', function (error) {
            handleRequestErrors(error, conn, url);
        });

        // write data to request body
        _.debug("Send request");
        if (params) {
            req.write(params);
        }
        req.end();
    }
    return conn;
};

var form = function (request, method, params, onReady) {
    var opts = prepareOpts(request, params);
    opts.method = method;
    opts.contentType = "application/x-www-form-urlencoded";
    return connect(opts, request, onReady);
};

var request = function (options, ownConfig, appConfig) {
    this.memoize = {};
    this.cache = false;
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

request.prototype = {

    get: function (params, onReady, refetch) {
        var opts = prepareOpts(this, params);
        opts.method = defaults.method;
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


module.exports = function (core, test) {
    init(core);
    _ = core._;
    testMode = test;
    return request;
};

var init = function (tie) {
    tie.handle("request", function (obj, config, observer, appConfig) {
        return new request(config, _.isDefined(obj.$request), appConfig);
    }, [], true);
};