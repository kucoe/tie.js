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
    var VALUES = '$values';
    var DEPS = '$deps';
    var ITEM_NAME = '_item_name';
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

    var s4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };

    var args2Array = function (args, start) {
        return Array.prototype.slice.call(args, start);
    };

    var safeCall = function (fn, fnThis, bindReady) {
        var res;
        var spliceArgs = 3;
        if (_.isUndefined(bindReady) && _.isFunction(fnThis.$ready)) {
            bindReady = fnThis.$ready();
            spliceArgs = 2;
        }
        try {
            var args = args2Array(arguments, spliceArgs);
            res = fn.apply(fnThis, args);
        } catch (e) {
            res = undefined;
            if (bindReady) {
                if (console.groupCollapsed) {
                    console.groupCollapsed("User code error");
                }
                console.error('Is ready and had an error:' + e.message);
                console.dir(e);
                if (console.groupEnd) {
                    console.groupEnd();
                }
            }
        }
        return res;
    };

    var _ = {
        debugEnabled: false,

        isUndefined: function (value) {
            return value == undefined;
        },

        isDefined: function (value) {
            return value != undefined;
        },

        isObject: function (value) {
            return value != null && typeof value == 'object';
        },

        isString: function (value) {
            return typeof value == 'string';
        },

        isNumber: function (value) {
            return typeof value == 'number';
        },

        isDate: function (value) {
            return Object.prototype.toString.apply(value) == '[object Date]';
        },

        isRegExp: function (value) {
            return Object.prototype.toString.apply(value) == '[object RegExp]';
        },

        isArray: function (value) {
            return Array.isArray(value) || Object.prototype.toString.apply(value) == '[object Array]';
        },

        isCollection: function (value) {
            return this.isArray(value) || value instanceof Array
                || Object.prototype.toString.apply(value) == '[object NodeList]'
                || Object.prototype.toString.apply(value) == '[object NamedNodeMap]'
                || Object.prototype.toString.apply(value) == '[object Arguments]';
        },

        isFunction: function (value) {
            return typeof value == 'function';
        },

        isBoolean: function (value) {
            return typeof value == 'boolean';
        },

        trim: function (value) {
            return this.isString(value) ? value.replace(/^\s*/, '').replace(/\s*$/, '') : value;
        },

        lowercase: function (string) {
            return this.isString(string) ? string.toLowerCase() : string;
        },

        uppercase: function (string) {
            return this.isString(string) ? string.toUpperCase() : string;
        },

        toInt: function (string) {
            return parseInt(string, 10);
        },

        toFloat: function (string) {
            return parseFloat(string);
        },

        // string equals ignore case
        eqi: function (string1, string2) {
            return this.lowercase(string1) === this.lowercase(string2);
        },

        //deep equals
        isEqual: function (a, b) {
            if (a === b) {
                return true;
            } else if (this.isUndefined(a) || a == null || this.isUndefined(b) || b == null) {
                return false;
            } else if (typeof  a !== typeof  b) {
                return false;
            } else if (this.isDate(a) && this.isDate(b)) {
                return a.getTime() === b.getTime();
            } else if (this.isRegExp(a) && this.isRegExp(b)) {
                return a.source === b.source &&
                    a.global === b.global &&
                    a.multiline === b.multiline &&
                    a.lastIndex === b.lastIndex &&
                    a.ignoreCase === b.ignoreCase;
            } else if (this.isFunction(a) && this.isFunction(b)) {
                return a.toString() == b.toString();
            } else if (!this.isObject(a) && !this.isObject(b)) {
                return a == b;
            } else if (a.prototype !== b.prototype) {
                return false;
            } else {
                try {
                    var ka = Object.keys(a);
                    var kb = Object.keys(b);
                    if (ka.length != kb.length) {
                        return false;
                    }
                    ka.sort();
                    kb.sort();
                    var i;
                    for (i = ka.length - 1; i >= 0; i--) {
                        if (ka[i] != kb[i]) {
                            return false;
                        }
                    }
                    var key;
                    for (i = ka.length - 1; i >= 0; i--) {
                        key = ka[i];
                        if (!this.isEqual(a[key], b[key])) {
                            return false;
                        }
                    }
                } catch (e) {
                    return false;
                }
            }
            return true;
        },

        //deep clone
        clone: function (obj) {
            if (!obj || !this.isObject(obj)) {
                return obj;
            }
            var newObj = this.isCollection(obj) ? [] : Object.create(Object.getPrototypeOf(obj));
            newObj = this.extend(newObj, obj, function (item) {
                return _.clone(item);
            });
            return newObj;
        },

        //string to type
        convert: function (string, context) {
            var res = string;
            var reviver = function (k, v) {
                if (_.isString(v) && v[0] == '#') {
                    return context[v.substring(1)];
                }
                return v;
            };
            if ('true' === string) {
                res = true
            } else if ('false' === string) {
                res = false
            } else if (/^\d*$/.test(string)) {
                if (string.indexOf('.') != -1) {
                    res = this.toFloat(string);
                } else {
                    res = this.toInt(string);
                }
            } else if (string[0] == '[' && string[string.length - 1] == "]") {
                string = string.replace(/'/g, '"');
                res = JSON.parse(string, reviver);
            } else if (string[0] == '{' && string[string.length - 1] == "}") {
                string = string.replace(/'/g, '"');
                res = JSON.parse(string, reviver);
            } else if (string[0] == '"' || string[0] == "'") {
                res = string.substring(1, string.length - 1);
            }
            return res;
        },

        forEach: function (collection, callback, thisArg, safe) {
            if (!thisArg) {
                thisArg = this;
            }
            if (callback) {
                if (this.isCollection(collection)) {
                    var index = -1;
                    var length = collection.length;
                    var coll = [];
                    if (safe) {
                        while (++index < length) {
                            coll.push(collection[index]);
                        }
                        index = -1;
                    } else {
                        coll = collection;
                    }
                    while (++index < length) {
                        if (callback.call(thisArg, coll[index], index, collection) === false) {
                            break;
                        }
                    }
                } else {
                    callback.call(thisArg, collection, 0, [collection]);
                }
            }
            return collection;
        },

        forIn: function (object, callback, thisArg, all) {
            if (!thisArg) {
                thisArg = this;
            }
            if (callback) {
                for (var prop in object) {
                    if (object.hasOwnProperty(prop) || all) {
                        if (callback.call(thisArg, object[prop], prop, object) === false) {
                            break;
                        }
                    }
                }
            }
            return object;
        },

        sequence: function (obj, callback, last, thisArg) {
            var keys = [];
            if (!thisArg) {
                thisArg = this;
            }
            if (callback) {
                if (this.isCollection(obj)) {
                    var index = -1;
                    var length = obj.length;
                    while (++index < length) {
                        keys.push(index);
                    }
                } else {
                    keys = Object.keys(obj);
                }

                var next = function () {
                    var key = keys.shift();
                    if (key === 0 || key) {
                        var value = obj[key];
                        callback.call(thisArg, value, next);
                    } else {
                        if (last) {
                            last.call(thisArg, obj);
                        }
                    }
                };
                next();
            }
        },

        uid: function () {
            return (s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4());
        },

        extend: function (destination, source, fn) {
            if (this.isCollection(destination) && this.isCollection(source)) {
                this.forEach(source, function (item, i) {
                    if (fn) {
                        item = fn(item, i);
                    }
                    destination.push(item);
                });
            } else {
                this.forIn(source, function (value, prop) {
                    if (fn) {
                        value = fn(value, prop);
                    }
                    destination[prop] = value;
                }, this);
            }
            return destination;
        },

        debug: function (message, group) {
            if (this.debugEnabled) {
                if (group) {
                    if (console.groupCollapsed) {
                        console.groupEnd();
                        console.groupCollapsed(group);
                    }
                }
                console.log(message);
            }
        }

    };

    var proxy = function (bind) {

        var observe = function (obj, desc, prop) {
            if (desc && desc._proxyMark) {
                return false; //proxy already set
            }
            var newGet = function () {
                if (desc) {
                    if (desc.get) {
                        return desc.get.call(obj);
                    }
                    return desc.value;
                }
                return void 0; //TODO pointcut
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
                } else {
                    //TODO pointcut
                }
                bind.apply(prop);
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

        var explore = function (obj) {
            var added = [];
            _.forIn(obj, function (value, prop) {
                props.push(prop);
                if ('prototype' == prop) {
                    return false;// skip prototype
                }
                var desc = Object.getOwnPropertyDescriptor(obj, prop);
                if (desc._proxyMark) {
                    return false; //skip already processed
                }
                if (!desc.configurable || (desc.value === undefined && !desc.set) || desc.writable === false) {
                    return false; // skip readonly
                }
                var dep = prop.indexOf(DEP_PREFIX) == 0 && bind.obj.$deps.indexOf(prop.substring(2)) != -1;
                if (_.isObject(value) && !dep && prop != DEPS && prop != VALUES) {
                    _.debug("Exploring " + prop);
                    explore(value);
                }
                _.debug("Observing " + prop);
                if (observe(obj, desc, prop)) {
                    added.push(prop);
                }
                return true;
            });
            //TODO pointcut
            return added;
        };

        var obj = bind.obj;
        var props = [];
        _.debug("Exploring " + bind.name);
        return explore(obj);
    };

    /**  PIPE **/

    var pipes = function (name, fn, dependencies, sealed) {
        var p = pipesRegistry[name];
        if (_.isUndefined(fn)) {
            return  p;
        }
        if (p && p.$sealed) {
            throw new Error(name + ' pipe already registered and sealed. Please choose another name for your pipe');
        }
        p = pipe(name, fn, dependencies || []);
        p.$name = name;
        p.$sealed = sealed || false;
        p.$deps = dependencies || [];
        p = _.extend(p, _);
        pipesRegistry[name] = p;
        return p;
    };

    var pipe = function (name, fn, dependencies) {
        var p = function (obj, params) {
            _.debug("Process pipe " + name);
            _.forEach(dependencies, function (item) {
                p[DEP_PREFIX + item] = pipesRegistry[item];
            });
            if (params && params.length > 0) {
                var array = _.convert(params, obj);
                _.forEach(array, function (param) {
                    param = _.trim(param);
                    params.push(param);
                });
            }
            if (fn && _.isFunction(fn)) {
                obj = safeCall(fn, p, true, obj, params);
            }
            _.debug("Ready pipe " + name);
            return obj;
        };
        return p;
    };

    var pipeModel = function (obj) {
        obj = _.clone(obj);
        return chain(obj);
    };

    var chain = function (obj) {
        return function () {
            if (arguments.length == 0) {
                return obj;
            }
            obj = pipeline.apply(obj, args2Array(arguments));
            return chain(obj);
        }
    };

    var pipeline = function () {
        var p = arguments[0];
        if (_.isString(p)) {
            p = pipesRegistry[p];
            if (!p) {
                throw new Error('Pipe ' + p + ' not found');
            }
        } else if (_.isFunction(p)) {
            p = pipes('%tmp%', p);
        }
        var params = args2Array(arguments, 1);
        return p(this, params);
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
        h.$name = name;
        h.$sealed = sealed || false;
        h.$deps = dependencies || [];
        h = _.extend(h, _);
        handlesRegistry[name] = h;
        return h;
    };

    var handle = function (name, fn, dependencies) {
        var h = function (obj, config, watcher) {
            _.debug("Process handle " + name);
            _.forEach(dependencies, function (item) {
                h[DEP_PREFIX + item] = handlesRegistry[item];
            });
            if (fn && _.isFunction(fn)) {
                obj = safeCall(fn, h, true, obj, config, watcher);
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
                    return null;
                }
            }
            var last = split[length - 1];
            if (_.isUndefined(value)) {
                return res[last];
            } else {
                res[last] = value;
            }
            return null;
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
        this.watchers = {};
        this.bind = bind;
    };

    watcher.prototype = {
        add: function (prop, source, fn) {
            var points = this.watchers[prop];
            if (!points) {
                points = this.watchers[prop] = {};
            }
            points[source] = fn;
        },

        remove: function (prop, source) {
            var points = this.watchers[prop];
            if (points) {
                delete points[source];
            }
        },

        clear: function (prop) {
            this.watchers[prop] = {}
        },

        call: function (prop, obj) {
            var points = this.watchers[prop];
            if (points) {
                var ready = obj.$ready();
                _.forIn(points, function (point) {
                    if(_.isFunction(point)){
                        safeCall(point, obj, ready, obj);
                    }
                });
            }
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
                    this.resolveHandle(this.obj, n, h, []);
                }
            }
            this.watcher.call('*', this.obj);
            if (property && property !== '*') {
                this.watcher.call(property, this.obj);
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
                var processed = [];
                _.forIn(handlesRegistry, function (handle, prop) {
                    if (processed.indexOf(prop) == -1) {
                        this.resolveHandle(obj, prop, handle, processed);
                    }
                }, this);
            }
        },

        resolveHandle: function (obj, prop, handle, processed) {
            _.forEach(handle.$deps, function (item) {
                if (processed.indexOf(item) == -1) {
                    var h = handlesRegistry[item];
                    this.resolveHandle(obj, item, h, processed);
                }
            }, this);
            var n = (HANDLE_PREFIX + prop);
            var config = obj[ n];
            if (_.isUndefined(config) && app) {
                config = app.obj[n];
            }
            this.currentProperty = n; //prevent apply update
            obj[n] = handle(obj, config, this.watcher);
            this.currentProperty = null;
            processed.push(prop);
        }
    };


    /**  TIE **/

    var tie = function () {
        return function (name, tiedObject, dependencies, sealed) {
            if (name != APP && ties[APP] == null) {
                module.tie(APP, {});
            }
            var r = ties[name];
            if (_.isUndefined(tiedObject)) {
                return  pipeModel(r.obj);
            }
            if (r && r.sealed) {
                throw new Error(name + ' tie is already registered and sealed. Please choose another name for your tie');
            }
            r = tie.prototype.init(name, tiedObject, dependencies);
            tie.prototype.define(name, r);
            r.resolveHandles();
            r.sealed = sealed;
            if (name == APP) {
                app = r;
            }
            return r.obj;
        }
    };

    tie.prototype = {

        wrap: function (obj) {
            return {value: obj}
        },

        wrapArray: function (array) {
            return {$values: array};
        },

        check: function (obj) {
            if (_.isFunction(obj) || !_.isObject(obj) || _.isDate(obj)) {
                obj = this.wrap(obj);
            } else if (_.isArray(obj)) {
                obj = this.wrapArray(obj);
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
                var found = ties[dep];
                if (!found) {
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
            if (old && old.touch) {
                bind.touch = old.touch;
                _.debug("Calling apply on '" + bind.name + "' after define");
                bind.apply('*');
            }
        },

        init: function (name, tiedObject, dependencies) {
            _.debug("Tie " + name, name);
            var r = new bind(name);
            r.obj = this.check(tiedObject);
            this.resolveDependencies(r, dependencies);
            r.obj.$deps = Object.freeze(dependencies || []);
            proxy(r);
            _.debug("Bind model ready");
            return r;
        }
    };

    module.tie = tie();
    module.tie.pipe = pipes;
    module.tie.handle = handles;
    module.tie.enableDebug = function (enable) {
        _.debugEnabled = enable;
    };
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

})(typeof exports === 'object' ? module : window);
