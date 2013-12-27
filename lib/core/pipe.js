var pipesRegistry = {};

var pipes = function (name, fn, dependencies, sealed) {
    var p = pipesRegistry[name];
    if (_.isUndefined(fn)) {
        return p;
    }
    if (p && p.$sealed) {
        throw new Error(name + ' pipe already registered and sealed. Please choose another name for your pipe');
    }
    if (!name || name[0] == '.') {
        throw new Error(name + ' is not valid name for your pipe');
    }
    p = pipe(name, fn, dependencies || []);
    _.define(p, name, sealed, dependencies);
    p = _.extend(p, _);
    _.defineImmutable(p, '$async', fn.length == 3);
    pipesRegistry[name] = p;
    _.debug("Pipe was registered " + name);
    return p;
};

var pipe = function (name, fn, dependencies) {
    var p = function (obj, params, next) {
        _.debug("Process pipe " + name);
        _.forEach(dependencies, function (item) {
            p[DEP_PREFIX + item] = pipesRegistry[item];
        });
        if (_.isString(params) && params.length > 0) {
            var array = _.convert(params, obj);
            params = [];
            _.forEach(array, function (param) {
                param = _.trim(param);
                params.push(param);
            });
        }
        if (fn && _.isFunction(fn)) {
            obj = _.safeCall(fn, p, obj, params, next);
        }
        _.debug("Ready pipe " + name);
        return obj;
    };
    return p;
};

var getPipe = function (p) {
    if (_.isString(p)) {
        p = pipesRegistry[p];
    } else if (_.isFunction(p)) {
        p = pipes('%tmp%', p);
    }
    return p;
};

var pipeModel = function (obj) {
    observe(obj);
    return chain(obj);
};

var chain = function (obj) {
    var rr = [];
    var async = false;

    var r = function () {
        if (arguments.length == 0) {
            return obj;
        }
        var p = arguments[0];
        p = getPipe(p);
        if (!p) {
            throw new Error('Pipe ' + arguments[0] + ' not found');
        }
        var params = args2Array(arguments, 1);
        var fn = function (res) {
            obj = res;
            var n = next();
            if (p.$async) {
                p(obj, params, n);
            } else {
                obj = p(obj, params);
                n(obj);
            }
        };
        rr.push(fn);
        if (p.$async || async) {
            if (!async) {
                next()(obj);
            }
            async = true;
        } else {
            obj = p(obj, params);
        }
        return r;
    };

    function next() {
        var fn = rr.shift();
        return function (res) {
            _.nextTick(function () {
                fn && fn(res);
            });
        }
    }

    return r;
};

var observe = function (obj) {
    var o = new observer(obj);
    o.apply = function (prop, ready) {
        if (_.isHandle(prop)) {
            var name = prop.substring(1);
            var h = handlesRegistry[name];
            if (h) {
                _.debug("Check handle " + name);
                var config = obj[prop];
                var appConfig = app ? app.obj[name] : undefined;
                if (_.isUndefined(config) && _.isDefined(appConfig)) {
                    config = appConfig;
                }
                _.debug("Got handle config " + config);
                if (_.isDefined(config)) {
                    this.remove(h._uid);
                    obj[prop] = h(obj, config, this, appConfig);
                }
            }
        }
        if (prop) {
            this.onChange(prop, ready);
        }
    };
    o.observe();
};