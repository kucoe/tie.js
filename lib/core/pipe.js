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
    fillSystemFields(p, name, sealed, dependencies);
    p = _.extend(p, _);
    pipesRegistry[name] = p;
    return p;
};

var pipe = function (name, fn, dependencies) {
    var p = function (obj, params, next) {
        _.debug("Process pipe " + name);
        _.forEach(dependencies, function (item) {
            p[DEP_PREFIX + item] = pipesRegistry[item];
        });
        if (params && params.length > 0) {
            var array = _.convert(params, obj);
            params = [];
            _.forEach(array, function (param) {
                param = _.trim(param);
                params.push(param);
            });
        }
        if (fn && _.isFunction(fn)) {
            obj = _.safeCall(fn, p, true, obj, params, next);
        }
        _.debug("Ready pipe " + name);
        return obj;
    };
    return p;
};

var chain = function (obj) {
    this.obj = obj;
    this.sequence = [];
    this.async = false;
};

chain.prototype = {
    next: function (res) {
        this.obj = res;
        this.started = true;
        if (this.sequence.length > 0) {
            var fn = this.sequence.shift();
            if (_.isFunction(fn)) {
                fn(res);
            }
        }
    },

    pipe: function () {
        var self = this;
        if (arguments.length == 0) {
            self.sequence = [];
            return self.obj;
        }
        var args = args2Array(arguments);
        args.push(function (res) {
            self.next(res);
        });
        var next = function (res) {
            res = pipeline.apply(res, args);
            if (_.isObject(res)) {
                self.started = false;
                self.next(res);
            } else {
                self.async = true;
            }
        };
        self.sequence.push(next);
        if (!self.async) {
            self.next(self.obj);
        }
        return self.pipe.bind(self);
    }
};

var pipeModel = function (obj) {
    obj = _.clone(obj);
    var c = new chain(obj);
    return c.pipe.bind(c);
};

var pipeline = function () {
    var p = arguments[0];
    var fn = undefined;
    var last = arguments[arguments.length - 1];
    if (_.isFunction(last)) {
        fn = last;
        Array.prototype.splice.call(arguments, arguments.length - 1);
    }
    if (_.isString(p)) {
        var name = p;
        p = pipesRegistry[p];
        if (!p) {
            throw new Error('Pipe ' + name + ' not found');
        }
    } else if (_.isFunction(p)) {
        p = pipes('%tmp%', p);
    }
    var params = args2Array(arguments, 1);
    return p(this, params, fn);
};