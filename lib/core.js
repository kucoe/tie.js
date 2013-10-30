/**
 * Tie.js
 * Simple model driven binding library
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */
(function (module) {
    'use strict';

    var APP = 'app';
    var VALUE = 'value';
    var DEPS = '$deps';
    var DEP_PREFIX = '$$';
    var HANDLE_PREFIX = '$';

    var app = null;
    var ties = {};
    var pipesRegistry = {};
    var handlesRegistry = {};

    /**
     * Allow convert array to configuration object extending object passed with array values as properties
     *
     * @returns {Object}
     */
    Array.prototype._ = function (obj) {
        _.forEach(this, function (item) {
            if (!obj.hasOwnProperty(item)) {
                obj[item] = {'_item_name': item};
            }
        });
        return obj;
    };

    //###UTIL###

    var proxy = function (bind) {

        var observe = function (obj, desc, prop, top) {
            if (desc && desc._proxyMark) {
                return false; //proxy already set
            }
            var fullProp = top ? top + '.' + prop : prop;
            var newGet = function () {
                if (desc) {
                    if (desc.get) {
                        return desc.get.call(obj);
                    }
                    return desc.value;
                }
                return bind.watcher.onGet(fullProp, bind.obj);
            };
            var changed = function (val) {
                var prev = newGet();
                return !_.isEqual(prev, val);
            };
            var newSet = function (val) {
                if (!changed(val)) {
                    return;
                }
                if (desc) {
                    if (desc.set) {
                        desc.set.call(this, val);
                    } else {
                        desc.value = val;
                    }
                }
                bind.apply(fullProp);
            };
            var enumerable = desc ? desc.enumerable : false;
            Object.defineProperty(obj, prop, {
                get: newGet,
                set: newSet,
                configurable: true,
                enumerable: enumerable,
                _proxyMark: true
            });
            return true;
        };

        var explore = function (obj, top) {
            var added = [];
            var watcher = bind.watcher;
            var main = bind.obj;
            var ready = main.$ready();
            _.forIn(obj, function (value, prop) {
                props.push(prop);
                if ('prototype' == prop) {
                    return true;// skip prototype
                }
                var desc = Object.getOwnPropertyDescriptor(obj, prop);
                if (desc._proxyMark) {
                    return true; //skip already processed
                }
                if (!desc.configurable || (desc.value === undefined && !desc.set) || desc.writable === false) {
                    return true; // skip readonly
                }
                var dep = prop.indexOf(DEP_PREFIX) == 0 && bind.obj.$deps.indexOf(prop.substring(2)) != -1;
                if (_.isObject(value) && !dep && prop != DEPS && prop !== (DEP_PREFIX + APP)) {
                    _.debug("Exploring " + prop);
                    _.extend(added, explore(value, prop));
                }
                _.debug("Observing " + prop);
                if (observe(obj, desc, prop, top)) {
                    added.push(prop);
                    var fullProp = top ? top + '.' + prop : prop;
                    watcher.onChange(fullProp, main, ready);
                }
                return true;
            });
            return added;
        };

        var obj = bind.obj;
        var props = [];
        _.debug("Exploring " + bind.name);
        var added = explore(obj);
        if (bind.newDynamicProps) {
            _.forEach(bind.newDynamicProps, function (prop) {
                _.debug("Observing dynamic property " + prop);
                if (observe(obj, null, prop)) {
                    added.push(prop);
                }
                props.push(prop);
            });
            bind.newDynamicProps = [];
        }
        _.forEach(bind.props, function (prop) {
            if (_.isUndefined(bind.obj.$prop(prop))) {
                _.debug("Notify deleted property " + prop);
                bind.watcher.onDelete(prop, bind.obj);
            }
        }, this);
        return added;
    };

    function fillSystemFields(obj, name, sealed, dependencies) {
        _.defineImmutable(obj, '$name', name);
        _.defineImmutable(obj, '$sealed', sealed || false);
        _.defineImmutable(obj, '$deps', Object.freeze(dependencies || []));
        _.defineImmutable(obj, '_uid', _.uid());
    }

    /**  PIPE **/

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
            [].prototype.splice.call(arguments, arguments.length - 1);
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

    var parser = function (string, fn, obj) {
        string = _.trim(string || "");
        var tokens = string.split('|');
        var t = tokens[0];
        var dot = t.indexOf('.');
        if (dot != -1) {
            tokens[0] = t.substring(dot);
            t = t.substring(0, dot);
        } else {
            tokens = tokens.splice(1);
        }
        if (!obj) {
            obj = tie(t);
        } else {
            obj = pipeModel(obj);
        }
        _.forEach(tokens, function (item) {
            var p = parser.prototype.parse(item);
            var args = [p.name];
            args = _.extend(args, p.params);
            _.debug("Parsed pipe" + JSON.stringify(args));
            obj = obj.apply(obj, args);
        });
        if (_.isFunction(fn)) {
            return obj.apply(obj, [fn]);
        } else {
            return obj();
        }
    };

    parser.prototype = {
        parse: function (str) {
            var index = str.indexOf(':');
            var pipe = {};
            pipe.name = _.trim(index + 1 ? str.substr(0, index) : str);
            pipe.params = [];
            if (pipe.name[0] == '.') {
                pipe.params = [pipe.name.substring(1)];
                pipe.name = 'property';
                index = -1;
            }
            if (index >= 0) {
                var p = _.trim(str.substr(++index));
                p = '[' + p + ']';
                var array = _.convert(p, {});
                _.forEach(array, function (param) {
                    param = _.trim(param);
                    pipe.params.push(param);
                });
            }
            return pipe;
        }
    };

    /**  HANDLE **/

    var handles = function (name, fn, dependencies, sealed) {
        var h = handlesRegistry[name];
        if (_.isUndefined(fn)) {
            return  h;
        }
        if (h && h.$sealed) {
            throw new Error(name + ' handle already registered and sealed. Please choose another name for your handle');
        }
        h = handle(name, fn, dependencies || []);
        fillSystemFields(h, name, sealed, dependencies);
        h = _.extend(h, _);
        handlesRegistry[name] = h;
        return h;
    };

    var handle = function (name, fn, dependencies) {
        var h = function (obj, config, watcher, appConfig) {
            _.debug("Process handle " + name);
            _.forEach(dependencies, function (item) {
                h[DEP_PREFIX + item] = handlesRegistry[item];
            });
            if (fn && _.isFunction(fn)) {
                obj = _.safeCall(fn, h, true, obj, config, watcher, appConfig);
            }
            _.debug("Ready handle " + name);
            return obj;
        };
        return h;
    };

    /**  MODEL **/

    var modelUtil = {
        $prop: function (name, value) {
            var res = this;
            var split = name.split('.');
            var i = 1;
            var length = split.length;
            while (i < length) {
                res = res[split[i - 1]];
                i++;
                if (_.isUndefined(res)) {
                    return undefined;
                }
            }
            var last = split[length - 1];
            if (_.isUndefined(value)) {
                return res[last];
            } else {
                res[last] = value;
            }
            return undefined;
        },

        $ready: function () {
            var ready = true;
            _.forEach(this.$deps, function (dep) {
                var d = this[DEP_PREFIX + dep];
                if (!d || d._empty) {
                    ready = false;
                    return false;
                }
                return true;
            }, this);
            return ready;
        }
    };

    var handler = function () {
        _.extend(this, modelUtil);
    };

    handler.prototype = _;

    var model = function (obj) {
        _.extend(this, obj);
    };

    model.prototype = new handler();

    /** WATCHER **/

    var watcher = function (bind) {
        this.watchers = [];
        this.getters = [];
        this.bind = bind;
        this.handlerId = null;
    };

    watcher.prototype = {
        watch: function (prop, onChange, onDelete) {
            if (!prop || prop === '*') {
                prop = '.*';
            }
            if (onChange || onDelete) {
                var dyna = {
                    property: new RegExp('^' + prop + '$'),
                    handlerId: this.handlerId,
                    onChange: onChange,
                    onDelete: onDelete
                };
                this.watchers.push(dyna);
                return dyna;
            }
            return null;
        },

        add: function (prop, valueFn) {
            if (this.bind.props.indexOf(prop) == -1) {
                this.bind.newDynamicProps.push(prop);
                this.inspect();
            }
            if (this.bind.newDynamicProps.indexOf(prop) && valueFn) {
                var dyna = {
                    property: prop,
                    handlerId: this.handlerId,
                    valueFn: valueFn
                };
                this.getters.push(dyna);
                return dyna;
            }
            return null;
        },

        remove: function () {
            var indexOf;
            if (arguments.length == 0 && this.handlerId) {
                _.forEach(this.watchers, function (dyna, i) {
                    if (dyna.handlerId === this.handlerId) {
                        this.watchers.splice(i, 1);
                    }
                }, this, true);
                _.forEach(this.getters, function (dyna, i) {
                    if (dyna.handlerId === this.handlerId) {
                        this.getters.splice(i, 1);
                        indexOf = this.bind.newDynamicProps.indexOf(dyna.property);
                        if (indexOf != -1) {
                            this.bind.newDynamicProps.splice(indexOf, 1);
                        }
                    }
                }, this, true);
            }
            var prop = arguments[0];
            if (_.isString(prop)) {
                _.forEach(this.watchers, function (dyna, i) {
                    if (dyna.property.test(prop) || dyna.handlerId === prop) {
                        this.watchers.splice(i, 1);
                    }
                }, this, true);
                _.forEach(this.getters, function (dyna, i) {
                    if (dyna.property === prop || dyna.handlerId === prop) {
                        this.getters.splice(i, 1);
                        indexOf = this.bind.newDynamicProps.indexOf(prop);
                        if (indexOf != -1) {
                            this.bind.newDynamicProps.splice(indexOf, 1);
                        }
                    }
                }, this, true);
            } else {
                indexOf = this.watchers.indexOf(prop);
                if (indexOf != -1) {
                    this.watchers.splice(indexOf, 1);
                }
                indexOf = this.getters.indexOf(prop);
                if (indexOf != -1) {
                    this.getters.splice(indexOf, 1);
                    indexOf = this.bind.newDynamicProps.indexOf(prop.property);
                    if (indexOf != -1) {
                        this.bind.newDynamicProps.splice(indexOf, 1);
                    }
                }
            }
        },

        onGet: function (prop, obj, ready) {
            if (!ready) {
                ready = obj.$ready();
            }
            var val = null;
            _.forEach(this.getters, function (dyna) {
                if (dyna.property === prop) {
                    var point = dyna.valueFn;
                    if (_.isFunction(point)) {
                        val = _.safeCall(point, obj, ready, obj, prop, val);
                    }
                }
            });
            return val;
        },

        onChange: function (prop, obj, ready) {
            if (!ready) {
                ready = obj.$ready();
            }
            var v = obj[prop];
            _.forEach(this.watchers, function (dyna) {
                if (dyna.property.test(prop)) {
                    var point = dyna.onChange;
                    if (_.isFunction(point)) {
                        _.safeCall(point, obj, ready, obj, prop, v);
                    }
                }
            });
        },

        onDelete: function (prop, obj, ready) {
            if (!ready) {
                ready = obj.$ready();
            }
            _.forEach(this.watchers, function (dyna) {
                if (dyna.property.test(prop)) {
                    var point = dyna.onDelete;
                    if (_.isFunction(point)) {
                        _.safeCall(point, obj, ready, obj, prop);
                    }
                }
            });
        },

        inspect: function () {
            if (this.bind) {
                proxy(this.bind);
            }
        }
    };

    /**  BIND **/

    var bind = function (name) {
        this.name = name;
        this.touch = [];
        this.props = [];
        this.newDynamicProps = [];
        this.processedHandles = [];
        this.values = {};
        this.applyCount = 0;
        this.timeout = null;
        this.currentProperty = null;
        this.watcher = new watcher(this);
    };

    bind.prototype = {
        apply: function (property) {
            if (property === this.currentProperty) {
                return;
            }
            this.currentProperty = property;
            this.applyCount++;
            if (this.applyCount > 10) {
                _.debug("Too many apply :" + this.name + " - " + this.applyCount);
            }
            _.debug("Calling apply on '" + this.name + "' after changed property '" + property + "'");
            if (property && property[0] == HANDLE_PREFIX) {
                var n = property.substring(1);
                var h = handlesRegistry[n];
                if (h) {
                    this.resolveHandle(this.obj, n, h, this.processedHandles);
                }
            }
            if (property) {
                this.watcher.onChange(property, this.obj);
            }
            _.forEach(this.touch, function (item) {
                var bind = ties[item];
                if (bind) {
                    bind.obj[DEP_PREFIX + this.name] = this.obj;
                }
            }, this);
            this.currentProperty = null;
            if (!this.timeout) {
                var that = this;
                this.timeout = setTimeout(function () {
                    that.timeout = null;
                    that.applyCount = 0;
                }, 3000);
            }
        },

        resolveHandles: function () {
            var name = this.name;
            var obj = this.obj;
            if (name != APP) {
                this.processedHandles = [];
                _.forIn(handlesRegistry, function (handle, prop) {
                    if (this.processedHandles.indexOf(prop) == -1) {
                        this.resolveHandle(obj, prop, handle, this.processedHandles);
                    }
                }, this);
            }
        },

        resolveHandle: function (obj, prop, handle, processed) {
            _.debug("Check handle " + prop);
            _.forEach(handle.$deps, function (item) {
                if (processed.indexOf(item) == -1) {
                    var h = handlesRegistry[item];
                    this.resolveHandle(obj, item, h, processed);
                }
            }, this);
            var n = (HANDLE_PREFIX + prop);
            var config = obj[n];
            var appConfig = app ? app.obj[n] : undefined;
            if (_.isUndefined(config) && _.isDefined(appConfig)) {
                config = appConfig;
            }
            _.debug("Got handle config " + config);
            if (_.isDefined(config)) {
                this.currentProperty = n; //prevent apply update
                this.watcher.handlerId = handle._uid;
                this.watcher.remove();
                obj[n] = handle(obj, config, this.watcher, appConfig);
                this.watcher.handlerId = null;
                this.currentProperty = null;
            }
            processed.push(prop);
        }
    };


    /**  TIE **/

    var tie = function (name, tiedObject, dependencies, sealed) {
        if (name != APP && ties[APP] == null) {
            module.tie(APP, {});
        }
        var r = ties[name];
        if (_.isUndefined(tiedObject)) {
            return  pipeModel(r.obj);
        }
        if (r && r.obj.$sealed) {
            throw new Error(name + ' tie is already registered and sealed. Please choose another name for your tie');
        }
        r = tie.prototype.init(name, tiedObject, dependencies, sealed);
        tie.prototype.define(name, r);
        if (name == APP) {
            app = r;
        }
        return r.obj;
    };

    tie.prototype = {

        check: function (obj) {
            if (_.isFunction(obj) || _.isArray(obj) || _.isRegExp(obj) || _.isBoolean(obj)
                || _.isNumber(obj) || _.isString(obj) || _.isDate(obj) || !_.isObject(obj)) {
                obj = {value: obj};
            }
            return new model(obj);
        },

        resolveDependencies: function (bind, dependencies) {
            var name = bind.name;
            if (name != APP) {
                bind.obj[DEP_PREFIX + APP] = app.obj;
                if (app.touch.indexOf(name) == -1) {
                    app.touch.push(name);
                }
            }
            if (!dependencies) {
                return;
            }
            _.forEach(dependencies, function (dep) {
                _.debug("Check dependency " + dep);
                var found = ties[dep];
                if (!found) {
                    _.debug("Dependency stub " + dep);
                    found = {name: dep, touch: [], obj: {_empty: true}};
                    this.define(dep, found);
                }
                bind.obj[DEP_PREFIX + dep] = found.obj;
                if (found.touch.indexOf(name) == -1) {
                    found.touch.push(name);
                }
            }, this);
        },

        define: function (name, bind) {
            var old = ties[name];
            ties[name] = bind;
            if (old) {
                old.obj._deleted = true;
                if (old.touch) {
                    bind.touch = old.touch;
                    _.debug("Calling apply on '" + bind.name + "' after define");
                    bind.apply('*');
                }
            }
        },

        init: function (name, tiedObject, dependencies, sealed) {
            _.debug("Tie " + name, name);
            var r = new bind(name);
            var obj = r.obj = this.check(tiedObject);
            fillSystemFields(obj, name, sealed, dependencies);
            obj._deleted = false;
            r.resolveHandles();
            this.resolveDependencies(r, dependencies);
            r.props = proxy(r);
            _.debug("Bind model ready");
            return r;
        }
    };

    module.tie = tie;
    module.tie.pipe = pipes;
    module.tie.handle = handles;
    module.tie.enableDebug = function (enable) {
        _.debugEnabled = enable;
    };
    module.tie.$ = parser;
    module.tie._ = _;
    if (typeof module.exports === 'object') {
        module.exports = function (test) {
            var res = module.tie;
            if (test) {
                res.tier = tie.prototype;
                res.util = _;
                res.model = model;
                res.ties = ties;
                res.pipesRegistry = pipesRegistry;
                res.handlesRegistry = handlesRegistry;
                res.bind = bind;
            }
            return res;
        };
    }

    /**
     * Property pipeline definition
     */
    pipes("property", function (obj, params) {
        if (params && params.length > 0) {
            var prop = params[0];
            var target = params.length > 1 ? params[1] : VALUE;
            obj.$prop(target, obj.$prop(prop))
        }
        return obj;
    });

    handles("require", function (obj, config) {
        if (_.isFunction(module.require)) {
            module.require(config);
        } else {
            console.error('Require is undefined');
        }
        return config;
    });


})(typeof exports === 'object' ? module : window);
