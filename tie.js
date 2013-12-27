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
    var CALC_FN = '_calc_fn';
    var VALUE_FN = '_val_fn';

    var app = null;

    function toRegex(prop) {
        return new RegExp('^' + prop + '$');
    }

    /**  UTIL **/

    var args2Array = function (args, start) {
        return [].slice.call(args, start);
    };
    
    var s4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
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
            return typeof value == 'string' || {}.toString.apply(value) == '[object String]';
        },
    
        isNumber: function (value) {
            return typeof value == 'number' || {}.toString.apply(value) == '[object Number]';
        },
    
        isDate: function (value) {
            return {}.toString.apply(value) == '[object Date]';
        },
    
        isRegExp: function (value) {
            return {}.toString.apply(value) == '[object RegExp]';
        },
    
        isArray: function (value) {
            return Array.isArray(value) || {}.toString.apply(value) == '[object Array]';
        },
    
        isCollection: function (value) {
            var s = {}.toString.apply(value);
            return this.isArray(value) || value instanceof Array
                || s == '[object NodeList]'
                || s == '[object NamedNodeMap]'
                || s == '[object Arguments]';
        },
    
        isFunction: function (value) {
            return typeof value == 'function';
        },
    
        isBoolean: function (value) {
            return typeof value == 'boolean' || {}.toString.apply(value) == '[object Boolean]';
        },
    
        isHandle: function (property) {
            return property && property.indexOf(HANDLE_PREFIX) == 0;
        },
    
        isDependency: function (property) {
            return property && property.indexOf(DEP_PREFIX) == 0;
        },
    
        isEnumerable: function (property) {
            return property && !this.isHandle(property) && property.charAt(0) != '_';
        },
    
        trim: function (string) {
            return this.isString(string) ? string.trim() : string;
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
                if (_.isString(v) && v.indexOf('#{') == 0 && v.indexOf('}' == (v.length - 1))) {
                    return context[v.substring(2, v.length - 1)];
                }
                return v;
            };
            if ('true' === string) {
                res = true
            } else if ('false' === string) {
                res = false
            } else if (/^\d+$/.test(string)) {
                if (string.contains('.')) {
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
                        coll = [].slice.call(collection);
                    } else {
                        coll = collection;
                    }
                    while (++index < length) {
                        if (callback.call(thisArg, coll[index], index, coll) === false) {
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
    
        safeCall: function (fn, fnThis) {
            var res;
            var spliceArgs = 2;
            try {
                var args = args2Array(arguments, spliceArgs);
                res = fn.apply(fnThis, args);
            } catch (e) {
                res = undefined;
                if (!this.isFunction(fnThis.$ready) || fnThis.$ready()) {
                    console.error('Is ready and had an error:' + e.message);
                    console.log(e.stack);
                    _.debug(e, 'User code error');
                }
            }
            return res;
        },
    
        define: function (obj, name, sealed, dependencies) {
            this.defineImmutable(obj, '$name', name);
            this.defineImmutable(obj, '$sealed', sealed || false);
            this.defineImmutable(obj, '$deps', Object.freeze(dependencies || []));
            this.defineImmutable(obj, '_uid', this.uid());
        },
    
        // define immutable property
        defineImmutable: function (obj, prop, value) {
            Object.defineProperty(obj, prop, {
                value: value,
                configurable: false,
                writable: false,
                enumerable: true,
                _proxyMark: true
            });
        },
    
        uid: function () {
            return (s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4());
        },
    
        extend: function (destination, source, fn) {
            if (this.isCollection(destination) && this.isCollection(source)) {
                this.forEach(source, function (item, i) {
                    [].push.call(destination, fn ? fn(item, i) : item);
                });
            } else {
                this.forIn(source, function (value, prop) {
                    destination[prop] = fn ? fn(value, prop) : value;
                }, this);
            }
            return destination;
        },
    
        nextTick: function (fn) {
            if (typeof module.setImmediate === 'function') {
                module.setImmediate(fn);
            } else if (typeof process !== 'undefined' && process.nextTick) {
                process.nextTick(fn);
            } else {
                module.setTimeout(fn, 0);
            }
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

    /**  PIPE **/

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
            if (params && params.length > 0) {
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

    /**  PARSER **/

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
            if (obj.$name) {
                var r = ties[obj.$name];
                if (r) {
                    obj = r.observer.unbind(obj);
                }
            }
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
            var hasParams = index != -1;
            pipe.name = _.trim(hasParams ? str.substr(0, index) : str);
            pipe.params = [];
            if (pipe.name.charAt(0) == '.') {
                pipe.params = [pipe.name.substring(1)];
                pipe.name = 'property';
                index = -1;
            }
            if (hasParams) {
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

    var handlesRegistry = {};
    
    var handles = function (name, fn, dependencies, sealed) {
        var h = handlesRegistry[name];
        if (_.isUndefined(fn)) {
            return  h;
        }
        if (h && h.$sealed) {
            throw new Error(name + ' handle already registered and sealed. Please choose another name for your handle');
        }
        h = handle(name, fn, dependencies || []);
        _.define(h, name, sealed, dependencies);
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
                config = _.safeCall(fn, h, obj, config, watcher, appConfig);
            }
            _.debug("Processed handle " + name);
            return config;
        };
        return h;
    };

    /**  MODEL **/

    var modelUtil = function () {
        this.$prop = function (name, value) {
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
        };
    
        this.$ready = function () {
            if(_.isDefined(this._ready)) {
                return this._ready;
            }
            this._ready = true;
            _.forEach(this.$deps, function (dep) {
                var d = this[DEP_PREFIX + dep];
                if (!d || d._empty) {
                    this._ready = false;
                    return false;
                }
                return true;
            }, this);
            return this._ready;
        };
    };
    
    modelUtil.prototype = _;
    
    var model = function (obj) {
        _.extend(this, obj);
    };
    
    model.prototype = new modelUtil();

    /**  OBSERVER **/

    var observer = function (obj) {
        this.obj = obj;
        this.props = [];
        this.listeners = [];
        this.deps = {};
        this.proxy = {};
    };
    
    observer.prototype = {
    
        unbind: function (obj, top) {
            if (!obj) {
                obj = this.obj;
            }
            var res = Object.create(Object.getPrototypeOf(obj));
            _.forIn(obj, function (value, prop) {
                var full = top ? top + '.' + prop : prop;
                var proxy = this.proxy[full];
                var val = proxy ? proxy.value : value;
                if (_.isObject(value)) {
                    res[prop] = this.unbind(val, prop);
                } else {
                    res[prop] = val;
                }
            }, this);
            return res;
        },
    
        observe: function () {
            var obj = this.obj;
            _.debug("Exploring object " + obj.$name);
            var added = explore(obj, this);
            _.forEach(this.props, function (prop, i) {
                _.debug('Check for property being deleted ' + prop);
                if (_.isUndefined(this.obj.$prop(prop))) {
                    _.debug("Notify deleted property " + prop);
                    this.onDelete(prop);
                    //this.props.splice(i, 1);
                }
            }, this);
            this.props = added;
        },
    
        watch: function (prop, handlerId, onChange, onDelete) {
            if (!prop || prop === '*') {
                prop = '.*';
            }
            _.debug('Dynamic property listener: ' + prop);
            if (onChange || onDelete) {
                var property = listener(toRegex(prop), handlerId, onChange, onDelete);
                this.listeners.push(property);
                return function () {
                    this.listeners.remove(property);
                }.bind(this);
            }
            return null;
        },
    
        observeArray: function (array, onChange, onAdd, onRemove) {
            if (!_.isArray(array)) {
                array = [array];
            }
            if (!onChange) {
                throw 'Change function need to be implemented';
            }
            _.forEach(['push', 'unshift'], function (item) {
                array[item] = function () {
                    var args = [].map.call(arguments, function (arg) {
                        return onAdd ? _.safeCall(onAdd, array, arg) : arg;
                    });
                    return [][item].apply(array, args);
                };
            });
            _.forEach(['pop', 'shift'], function (item) {
                array[item] = function () {
                    var res = [][item].call(array);
                    return onRemove ? _.safeCall(onRemove, array, res) : res;
                };
            });
            _.forEach(['sort', 'reverse', 'splice'], function (item) {
                array[item] = function () {
                    var res = [][item].call(array, arguments);
                    if ('splice' === item) {
                        res = res.map(function (r) {
                            return onRemove ? _.safeCall(onRemove, array, r) : r;
                        });
                    }
                    this.check();
                    return res;
                };
            });
            array._cmp = function (index, item, prev) {
                if (_.isUndefined(prev)) {
                    this[index] = _.safeCall(onAdd, array, item);
                } else if (!_.isEqual(item, prev)) {
                    this[index] = _.safeCall(onChange, array, item, prev, index);
                }
            };
            array.set = function (index, item) {
                var prev = this[index];
                this._cmp(index, item, prev);
            };
            array.check = function () {
                _.forEach(this, function (item, i) {
                    var copy = this._copy[i];
                    this._cmp(i, item, copy);
                }, this);
                this.memo();
            };
            array.memo = function () {
                this._copy = _.extend({}, this);
            };
            array.memo();
            _.debug('Array observer bound');
            return array;
        },
    
        remove: function (prop) {
            if (_.isString(prop)) { //removes listeners by handlerId or by property name
                _.forEach(this.listeners, function (item, i) {
                    var property = item.property;
                    if (prop && (property === prop || (_.isRegExp(property) && property.test(prop)) || item.handlerId === prop)) {
                        this.listeners.splice(i, 1);
                    }
                }, this, true);
            }
        },
    
        onChange: function (prop) {
            _.debug('Property change: ' + prop);
            return react(prop, this, 'change');
        },
    
        onDelete: function (prop) {
            _.debug('Property delete: ' + prop);
            return react(prop, this, 'del');
        },
    
        apply: function (prop) {
            this.onChange(prop);
        }
    };
    
    function clean(observer, name) {
        var proxy = observer.proxy[name];
        if (proxy) {
            delete proxy.memo;
        }
    }
    
    var listener = function (prop, handlerId, onChange, onDelete) {
        return {
            property: prop,
            handlerId: handlerId,
            onChange: onChange,
            onDelete: onDelete
        };
    };
    
    var notify = function (obj, prop, observer) {
        //update itself first
        clean(observer, prop);
        // dependencies lookup
        _.forIn(observer.deps, function (list, name) {
            if (_.isDependency(prop) && _.isEqual(list, [VALUE])) {
                clean(observer, name);
                observer.onChange(name);
            } else {
                _.forEach(list, function (item) {
                    if (item === prop && name != prop) {
                        clean(observer, name);
                        observer.onChange(name);
                    }
                });
            }
        });
    };
    
    var react = function (prop, observer, action) {
        var obj = observer.obj;
        notify(obj, prop, observer);
        _.debug('React on ' + action + ' for ' + prop);
        var val = obj[prop];
        _.forEach(observer.listeners, function (item) {
            var property = item.property;
            var test = _.isRegExp(property) && property.test(prop);
            if (test) {
                var fn = action === 'del' ? item.onDelete : item.onChange;
                if (_.isFunction(fn)) {
                    val = _.safeCall(fn, obj, obj, prop, val);
                }
            }
        });
        return val;
    };
    
    var explore = function (obj, observer, context) {
        var visited = [];
        _.forIn(obj, function (value, prop) {
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
            var dep = _.isDependency() && obj.$deps.indexOf(prop.substring(2)) != -1;
            var fullProp = context ? context + '.' + prop : prop;
            if (_.isObject(value) && !_.isArray(value) && !dep && prop != DEPS && prop !== (DEP_PREFIX + APP)) {
                _.debug("Exploring object " + prop);
                _.extend(visited, explore(value, observer, fullProp));
            }
            _.debug("Observing property " + prop);
            if (observeProperty(obj, prop, desc, observer, fullProp)) {
                visited.push(prop);
                observer.onChange(fullProp);
            }
            return true;
        });
        return visited;
    };
    
    var observeProperty = function (obj, prop, desc, observer, fullProp) {
        var proxy = observer[fullProp];
        if (_.isDefined(proxy)) {
            return false; //proxy already set
        }
        proxy = {
            get: desc.get,
            set: desc.set,
            value: desc.value,
            memo: desc.memo
        };
    
        var newGet = function () {
            var val = null;
            if (proxy.get) {
                val = proxy.get.call(this);
            } else {
                val = proxy.value;
            }
            if(_.isString(val) && val.indexOf('#{') == 0 && val.indexOf('}') == (val.length -1)) {
                var s = val.substring(2, val.length -1) || VALUE;
                val = function () {
                    return this.$prop(s);
                }.val(s);
            }
            if (_.isFunction(val)) {
                if (val.$name == VALUE_FN) {
                    if (_.isUndefined(proxy.memo)) {
                        observer.deps[fullProp] = val.$deps;
                        val = proxy.memo = _.safeCall(val, observer.obj);
                    } else {
                        val = proxy.memo;
                    }
                } else if (val.$name == CALC_FN) {
                    val = _.safeCall(val, observer.obj);
                }
            }
            return val;
        };
        var newSet = function (val) {
            if (!_.isDependency(prop) && _.isEqual(proxy.value, val)) {
                return;
            }
            if (proxy.set) {
                proxy.set.call(this, val);
            } else {
                proxy.value = val;
            }
            if (!newSet._apply && !this._silent) {
                newSet._apply = true;
                observer.apply(fullProp);
                newSet._apply = false;
            }
        };
        newGet.call(obj);
        var enumerable = desc.enumerable;
        Object.defineProperty(obj, prop, {
            get: newGet,
            set: newSet,
            configurable: true,
            enumerable: enumerable
        });
        observer.proxy[fullProp] = proxy;
        return true;
    };

    /**  BIND **/

    var bind = function (name, obj) {
        this.name = name;
        this.reliers = [];
        this.processedHandles = [];
        this.applyCount = 0;
        this.obj = obj;
        this.observer = new observer(obj);
        var self = this;
        this.observer.apply = function (prop) {
            self.apply(prop);
        };
    };
    
    bind.prototype = {
    
        apply: function (property) {
            _.debug("Calling apply on '" + this.name + "' after changed property '" + property + "'");
            if (_.isHandle(property)) {
                var n = property.substring(1);
                var h = handlesRegistry[n];
                if (h) {
                    this.resolveHandle(this.obj, n, h);
                }
            }
            if (property) {
                this.observer.onChange(property);
            }
            _.forEach(this.reliers, function (item) {
                var bind = ties[item];
                if (bind) {
                    bind.obj[DEP_PREFIX + this.name] = this.obj;
                    delete bind.obj._ready;
                }
            }, this);
        },
    
        resolveHandles: function () {
            var name = this.name;
            var obj = this.obj;
            if (name != APP) {
                this.processedHandles = [];
                _.forIn(handlesRegistry, function (handle, prop) {
                    if (!this.processedHandles.contains(prop)) {
                        this.resolveHandle(obj, prop, handle);
                    }
                }, this);
            }
        },
    
        resolveHandle: function (obj, prop, handle) {
            _.debug("Check handle " + prop);
            _.forEach(handle.$deps, function (item) {
                if (!this.processedHandles.contains(item)) {
                    var h = handlesRegistry[item];
                    if (h) {
                        this.resolveHandle(obj, item, h);
                    }
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
                this.observer.remove(handle._uid);
                obj._silent = true;
                obj[n] = handle(obj, config, this.observer, appConfig);
                delete obj._silent;
            }
            if (!this.processedHandles.contains(prop)) {
                this.processedHandles.push(prop);
            }
        },
    
        checkApplyCount: function () {
            this.applyCount++;
            if (this.applyCount > 10) {
                _.debug("Too many apply :" + this.name + " - " + this.applyCount);
            }
            if (!this.timeout) {
                var self = this;
                this.timeout = setTimeout(function () {
                    self.timeout = null;
                    self.applyCount = 0;
                }, 3000);
            }
        }
    };
    

    /**  TIE **/

    var ties = {};

    var tie = function (name, tiedObject, dependencies, sealed) {
        if (name != APP && ties[APP] == null) {
            tie(APP, {});
        }
        var r = ties[name];
        if (_.isUndefined(tiedObject)) {
            return  pipeModel(r.observer.unbind());
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
                if (!app.reliers.contains(name)) {
                    app.reliers.push(name);
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
                    found = {name: dep, reliers: [], obj: {_empty: true}};
                    this.define(dep, found);
                }
                bind.obj[DEP_PREFIX + dep] = found.obj;
                delete bind.obj._ready;
                if (!found.reliers.contains(name)) {
                    found.reliers.push(name);
                }
            }, this);
        },

        define: function (name, bind) {
            var old = ties[name];
            ties[name] = bind;
            if (old) {
                old.obj._deleted = true;
                if (old.reliers) {
                    bind.reliers = old.reliers;
                    _.debug("Calling apply on '" + bind.name + "' after define");
                    bind.apply('*');
                }
            }
        },

        init: function (name, tiedObject, dependencies, sealed) {
            _.debug("Tie " + name, name);
            var obj = this.check(tiedObject);
            var r = new bind(name, obj);
            _.define(obj, name, sealed, dependencies);
            obj._deleted = false;
            r.resolveHandles();
            this.resolveDependencies(r, dependencies);
            r.observer.observe();
            _.debug("Bind model ready");
            return r;
        }
    };

    Function.prototype.val = function (dependencies) {
        if (_.isDefined(dependencies) && !_.isArray(dependencies)) {
            dependencies = [dependencies];
        }
        _.define(this, VALUE_FN, false, dependencies || [VALUE]);
        return this;
    };

    Function.prototype.calc = function () {
        _.define(this, CALC_FN, false);
        return this;
    };

    Array.prototype.contains = function (item) {
        return this.indexOf(item) != -1;
    };

    Array.prototype.remove = function (item) {
        var idx = this.indexOf(item);
        if (idx != -1) {
            return this.splice(idx, 1);
        }
        return [];
    };

    String.prototype.prop = function () {
        var s = this || VALUE;
        return '#{' + s + '}';
    };

    String.prototype.contains = function (substring) {
        return this.indexOf(substring) != -1;
    };

    String.prototype.contains = function (substring) {
        return this.indexOf(substring) != -1;
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
        var res = module.tie;
        if (global.test) {
            res.tier = tie.prototype;
            res.model = model;
            res.ties = ties;
            res.pipesRegistry = pipesRegistry;
            res.handlesRegistry = handlesRegistry;
            res.bind = bind;
        }
        module.exports = res;
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

    /**
     * Value pipeline definition
     */
    pipes("value", function (obj, params) {
        if (params && params.length > 0) {
            var prop = params[0];
            var val = params.length > 1 ? params[1] : null;
            obj.$prop(prop, val);
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

/**
 * Tie.js View handle
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */
(function (window) {
    'use strict';

    var document = window.document;
    var _ = window.tie._;
    var parse = window.tie.$;

    var HANDLE_PREFIX = '$';

    var VALUE = 'value';
    var TEXT = 'text';

    var ID = "id";
    var INDEX = "data-index";
    var TIE = "data-tie";
    var TIED = "data-tied";
    var CLASS = "class";
    var NAME = "name";

    /**  DOM **/

    var dom = {
    
        domReady: false,
    
        readyListeners: [],
    
        fetched: [],
    
        readyFn: function () {
            _.forEach(this.readyListeners, function (listener) {
                setTimeout(listener, 100);
            });
            this.domReady = true;
        },
    
        insertAfter: function (index, newElements) {
            var parent = index.parentNode;
            _.forEach(newElements, function (node) {
                parent.insertBefore(node, index.nextSibling);
                index = node;
            });
        },
    
        remove: function (element) {
            var parent = element.parentNode;
            if (parent) parent.removeChild(element);
        },
    
        removeChildren: function (element) {
            while (element && element.firstChild) {
                element.removeChild(element.firstChild);
            }
        },
    
        hasClass: function (elem, className) {
            return new RegExp(' ' + className + ' ').test(' ' + elem.className + ' ');
        },
    
        addClass: function (elem, className) {
            if (!this.hasClass(elem, className)) {
                elem.className += ' ' + className;
            }
        },
    
        removeClass: function (elem, className) {
            var newClass = ' ' + elem.className.replace(/[\t\r\n]/g, ' ') + ' ';
            if (this.hasClass(elem, className)) {
                while (newClass.contains(' ' + className + ' ')) {
                    newClass = newClass.replace(' ' + className + ' ', ' ');
                }
                elem.className = newClass.replace(/^\s+|\s+$/g, '');
            }
        },
    
        ready: function (fn) {
            if (fn) {
                // check if document already is loaded
                var f = this.readyFn.bind(this);
                if (document.readyState === 'complete') {
                    _.nextTick(fn);
                    this.domReady = true;
                } else {
                    if (this.readyListeners.length == 0) {
                        window.addEventListener('load', f);
                    }
                }
                if (this.readyListeners.length == 0) {
                    window.addEventListener('hashchange', f);
                }
                this.readyListeners.push(fn);
            }
            return this.domReady;
        },
    
        fetch: function (selector, base) {
            if (!base) {
                this.fetched = [];
                base = document;
            }
            var nodes = base.querySelectorAll(selector);
            _.forEach(nodes, function (el) {
                this.fetched.push(el);
            }, this);
        }
    };

    /**  EL **/

    var wrap = function (el, obj) {
        var that = this;
        var name = obj.$name;
        var tagName = el.tagName;
        var listener = function (event) {
            _.debug("Fired '" + event.type + "' listener on '" + name + "' for element " + tagName);
            var value = that.value();
            value = _.trim(value);
    
            var prop = that.property;
            if (obj.$prop(prop) !== value) {
                obj.$prop(prop, value);
            }
        };
        var idx = el.getAttribute(INDEX);
        this.$ = el;
        this._id = el.getAttribute(ID) || _.uid();
        this.index = idx ? parseInt(idx) : -1;
        this.tie = el.getAttribute(TIE);
        this.property = this.getProperty(this.tie);
        this.events = {};
        this.isSelect = _.eqi(tagName, 'select');
        this.isInput = _.eqi(tagName, 'input') || _.eqi(tagName, 'textarea') || this.isSelect;
        this.hasCheck = _.eqi(el.type, 'radio') || _.eqi(el.type, 'checkbox');
        this.display = el.style.display;
        this.shown = true;
        this.textEl = null;
    
        if (this.isInput) {
            if (!this.hasCheck && !this.isSelect) {
                if ('oninput' in el) {
                    _.debug("Added input listener on '" + name + "' for element " + tagName);
                    el.addEventListener('input', listener);
                } else {
                    _.debug("Added keydown listener on '" + name + "' for element " + tagName);
                    el.addEventListener('keydown', function (event) {
                        var key = event.keyCode;
                        // ignore command         modifiers                   arrows
                        if (key === 91 || (15 < key && key < 19) || (37 <= key && key <= 40)) return;
                        listener(event);
                    });
                }
            } else {
                _.debug("Added change listener on '" + name + "' for element " + tagName);
                el.addEventListener('change', listener);
            }
        }
    };
    
    wrap.prototype = {
    
        getProperty: function (string) {
            string = _.trim(string || '');
            var tokens = string.split('|');
            var t = tokens[0];
            var dot = t.indexOf('.');
            if (dot != -1) {
                return t.substring(dot + 1);
            }
            return VALUE;
        },
    
        isTied: function () {
            return this.$.getAttribute(TIED);
        },
    
        setAttribute: function (name, value, obj) {
            if (VALUE === name) {
                this.value(value);
            } else if (TEXT === name) {
                this.text(value);
            } else if (CLASS === name) {
                dom.addClass(this.$, value);
            } else if (_.isFunction(value)) {
                var handler = this.events[name];
                if (handler) {
                    this.$.removeEventListener(name, handler);
                }
                var that = this;
                handler = function (event) {
                    event.index = that.index;
                    event.tie = that.tie;
                    _.safeCall(value, obj, event);
                };
                this.events[name] = handler;
                this.$.addEventListener(name, handler);
            } else {
                if (_.isDefined(value)) {
                    this.$.setAttribute(name, value);
                } else {
                    this.$.setAttribute(name, "");
                }
            }
        },
    
        value: function (val) {
            var el = this.$;
            if (this.hasCheck) {
                if (_.isDefined(val)) {
                    if (val) {
                        el.setAttribute('checked', 'checked');
                    } else {
                        el.removeAttribute('checked');
                    }
                } else {
                    return el.checked;
                }
            } else if (this.isSelect) {
                if (_.isDefined(val)) {
                    var options = [].slice.call(el.options);
                    _.forEach(options, function (item, i) {
                        if (_.isEqual(item.value, val)) {
                            el.selectedIndex = i;
                            return false;
                        }
                        return true;
                    });
                } else {
                    return el.options[el.selectedIndex].value;
                }
            } else if (this.isInput) {
                if (_.isDefined(val)) {
                    el.value = val;
                } else {
                    return el.value;
                }
            } else {
                return this.text(val);
            }
            return null;
        },
    
        text: function (text) {
            var el = this.$;
            if (_.isDefined(text)) {
                if (this.isInput) {
                    if (this.textEl == null) {
                        this.textEl = document.createElement('span');
                        this.insertAfter(this.textEl);
                    }
                    this.textEl.textContent = text;
                } else if (this.isSelect) {
                    _.forEach(el.options, function (item, i) {
                        if (_.isEqual(item.text, text)) {
                            el.selectedIndex = i;
                            return false;
                        }
                        return true;
                    });
                } else {
                    el.textContent = text
                }
            } else {
                if (this.isInput) {
                    return el.nextSibling.textContent || '';
                } else if (this.isSelect) {
                    return el.options[el.selectedIndex].text;
                } else {
                    return el.textContent || '';
                }
            }
            return null;
        },
    
        html: function (html) {
            var el = this.$;
            if (_.isDefined(html)) {
                if (!this.isInput && !this.isSelect) {
                    el.innerHTML = html;
                }
            } else {
                if (!this.isInput && !this.isSelect) {
                    return el.innerHTML || '';
                }
            }
            return null;
        },
    
        remove: function () {
            var element = this.$;
            delete this.$;
            delete this._id;
            delete this.isInput;
            delete this.hasCheck;
            delete  this.events;
            dom.remove(element);
        },
    
        insertAfter: function (newElements) {
            var index = this.$;
            dom.insertAfter(index, newElements);
        },
    
        show: function (show) {
            if (this.shown === show) {
                return;
            }
            if (!show) {
                this.display = this.$.style.display;
                this.$.style.display = 'none';
                if (this.textEl != null) {
                    this.textEl.style.display = 'none';
                }
            } else {
                this.$.style.display = this.display;
                if (this.textEl != null) {
                    this.textEl.style.display = this.display;
                }
            }
            this.shown = show;
        }
    };

    /**  VIEWHANDLE **/

    var viewHandlers = {};
    
    var viewHandle = function (name, fn, dependencies, sealed) {
        var h = viewHandlers[name];
        if (_.isUndefined(fn)) {
            return  h;
        }
        if (h && h.$sealed) {
            throw new Error(name + ' view handle already registered and sealed. Please choose another name for your handle');
        }
        h = function (view, config, els, obj) {
            _.debug("Process view handle " + name);
            _.forEach(dependencies || [], function (item) {
                h['$' + item] = viewHandlers[item];
            });
            if (fn && _.isFunction(fn)) {
                config = _.safeCall(fn, h, view, config, els, obj);
            }
            _.debug("Processed view handle " + name);
            return config;
        };
        _.define(h, name, sealed, dependencies);
        h = _.extend(h, _);
        viewHandlers[name] = h;
        return h;
    };
    
    var resolveViewHandle = function (obj, view, name, els) {
        var vh = viewHandlers[name];
        if (vh && view._resolved) {
            _.forEach(vh.$deps, function (item) {
                if (!view._resolved.contains(item)) {
                    resolveViewHandle(obj, view, item, els);
                }
            });
            var h = (HANDLE_PREFIX + name);
            var c = view[h];
            _.debug("View handle " + name + ' with config ' + c);
            var renderer = renders[view.$tie];
            if (_.isDefined(c) && renderer && renderer.rendered) {
                els = els || renderer.$;
                view._silent = true;
                view[h] = vh(view, c, els, obj);
                delete view._silent;
                if (!view._resolved.contains(name)) {
                    view._resolved.push(name);
                }
            }
        }
    };

    /**  RENDERER **/

    var renders = {};
    
    var renderer = function (obj, view) {
        if (_.isUndefined(view.$shown)) {
            view.$shown = true;
        }
        view.$tie = obj.$name;
        view._resolved = [];
        this.$ = [];
        this.rendered = false;
        this.rendering = false;
    };
    
    renderer.prototype = {
    
        register: function (viewHandle, onChange, onRender, interest) {
            var vh = viewHandlers[viewHandle];
            if (vh && onChange) {
                vh.onChange = function (obj, prop, name, val, els) {
                    if (!interest || interest === prop) {
                        onChange.call(this, obj, prop, name, val, els);
                    }
                }
            }
            if (vh && onRender) {
                vh.onRender = function (obj, val) {
                    return onRender.call(this, obj, val);
                }
            }
        },
    
        select: function (obj, base) {
            var name = obj.$name;
            var res = [];
            if (dom.fetched.length == 0 || base) {
                dom.fetch('[' + TIE + ']', base);
            }
            _.forEach(dom.fetched, function (el) {
                var attribute = el.getAttribute(TIE);
                var s = attribute.charAt(name.length);
                if (attribute.indexOf(name) == 0 && (s == '' || s == ' ' || s == '|' || s == '.')) {
                    res.push(new wrap(el, obj));
                }
            });
            return res;
        },
    
        $renderAttr: function (obj, prop, val, el) {
            if (_.isEnumerable(prop)) {
                _.debug("Render attribute '" + prop + "' with value " + val);
                el.setAttribute(prop, val, obj);
            }
        },
    
        $render: function (obj, prop) {
            var tieName = obj.$name;
            _.debug("Render " + tieName, tieName + " Render");
            if (this.$.length == 0) {
                this.$ = this.select(obj);
                _.debug("Elements selected: " + this.$.length);
            }
            _.forEach(obj.$deps, function (item) {
                var r = renders[item];
                if (!r.rendered) {
                    r.render();
                }
            });
            var $shown = obj.$view.$shown;
            _.forEach(this.$, function (el) {
                if (el) {
                    if (el.tie !== tieName) {
                        obj = parse(el.tie, undefined, obj);
                        $shown = obj.$view.$shown;
                    }
                    if (prop) {
                        var val = obj.$prop('$view.' + prop);
                        if (!val && obj.$view._amap) {
                            val = obj.$prop(prop);
                        }
                        if (val) {
                            this.$renderAttr(obj, prop, val, el);
                        }
                    } else {
                        if (obj.$view._amap) {
                            var attrs = [].slice.call(el.$.attributes);
                            _.forEach(attrs, function (item) {
                                prop = item.nodeName;
                                var val = obj.$prop(prop);
                                this.$renderAttr(obj, prop, val, el);
                            }, this);
                        } else {
                            _.forIn(obj.$view, function (val, prop) {
                                this.$renderAttr(obj, prop, val, el);
                            }, this);
                        }
                        el.setAttribute(TIED);
                        el.setAttribute(CLASS, tieName);
                        if (el.isInput) {
                            el.setAttribute(NAME, tieName);
                        }
                        el.show($shown);
                    }
                }
            }, this);
            _.debug("Rendered " + tieName);
        },
    
        inspectChange: function (obj, prop, name, val, els) {
            els = els || this.$;
            if (_.isHandle(name)) {
                var end = name.indexOf('.');
                var h = name.substring(1, end);
                var vh = viewHandlers[h];
                if (vh && _.isFunction(vh.onChange)) {
                    vh.onChange(obj, prop, name.substring(end + 1), val[HANDLE_PREFIX + h], els);
                }
            } else {
                _.forEach(els, function (el) {
                    this.$renderAttr(obj, name, val[name], el);
                }, this);
            }
        }
    };

    /**  SHOWN **/

    viewHandle("shown", function (view, config, els) {
        _.forEach(els, function (el) {
            if (el) {
                el.show(config);
            }
        });
        return config;
    }, [], true);

    /**  PARENT **/

    viewHandle("parent", function (view, config, els) {
        var parents = [];
        if (_.isString(config)) {
            if (config.charAt(0) == '#') {
                var r = renders[config.substring(1)];
                if (r) {
                    parents = r.$.map(function (el) {
                        return el.$;
                    });
                }
            } else {
                parents = [document.getElementById(config)];
            }
        }
        _.forEach(parents, function (parent) {
            dom.removeChildren(parent);
            _.forEach(els, function (el) {
                var $ = el.$;
                dom.remove($);
                parent.appendChild($);
            });
        });
        return config;
    }, [], true);

    /**  CHILDREN **/

    var renderChildren = function (children, obj, clean, renderer, els) {
        _.forEach(els, function (el) {
            var $ = el.$;
            if (clean) {
                dom.removeChildren($);
            }
            var fragment = document.createDocumentFragment();
            _.forEach(children, function (child) {
                var id = child._parents[el._id];
                var c = id ? document.getElementById(id) : null;
                var newEl = false;
                if (!c) {
                    c = document.createElement(child.$tag || 'div');
                    fragment.appendChild(c);
                    newEl = true;
                }
                var w = new wrap(c, obj);
                _.forIn(child, function (val, prop) {
                    if (_.isHandle(prop)) {
                        child.$tie = obj.$name;
                        child._resolved = [];
                        resolveViewHandle(obj, child, prop.substring(1), [w]);
                    } else {
                        renderer.$renderAttr(obj, prop, val, w);
                    }
                });
                if (newEl) {
                    w.setAttribute(ID, w._id);
                    child._ids.push(w._id);
                    child._parents[el._id] = w._id;
                }
            });
            _.debug('Processed children');
            $.appendChild(fragment);
            _.debug('Append children to main');
        }, this);
    };
    
    
    viewHandle("children", function (view, config, els, obj) {
        var renderer = renders[obj.$name];
        var views = [];
        if (_.isFunction(config)) {
            var idx = 0;
            var next = _.safeCall(config, obj, idx);
            while (next != null) {
                views.push(prepareView(next, obj));
                next = _.safeCall(config, obj, ++idx);
            }
        } else {
            _.forEach(config, function (child) {
                views.push(prepareView(child, obj));
            });
        }
        renderChildren(views, obj, true, renderer, els);
        var onChange = function (item, prev) {
            if (prev) {
                onRemove(prev);
            }
            if (!item._ids) {
                item = prepareView(item, obj);
            }
            renderChildren(item, obj, false, renderer, els);
            return item;
        };
        var onRemove = function (item) {
            _.forEach(item._ids, function (id) {
                var c = document.getElementById(id);
                if (c) {
                    dom.remove(c);
                }
            });
        };
        views = renderer.observeArray(views, onChange, onChange, onRemove);
        renderer.register(this.$name, function (obj, prop, name, val) {
            _.forEach(val, function (v, i) {
                _.forEach(v._ids, function (id) {
                    var c = document.getElementById(id);
                    if (c) {
                        var w = new wrap(c, obj);
                        renderer.inspectChange(obj, prop, name, val[i], w);
                    }
                });
            });
        });
        return views;
    }, [], true);

    /**  VIEW **/

    var prepareView = function (view, obj) {
        var res = view;
        if (_.isString(view) && (view.contains('#') || view === '*' || view === '@')) {
            res = {};
            if (view === '@') {
                res._amap = true;
            } else if (view === '*') {
                _.forIn(obj, function (val, prop) {
                    if (_.isEnumerable(prop)) {
                        res[prop] = prop.prop();
                    }
                });
            } else {
                var s = view.split('#');
                var name = s[0] || VALUE;
                var prop = s[1] || VALUE;
                res[name] = prop.prop();
            }
        } else if (_.isFunction(view) || _.isArray(view) || _.isRegExp(view) || _.isBoolean(view)
            || _.isNumber(view) || _.isString(view) || _.isDate(view) || !_.isObject(view)) {
            res = {
                value: view
            };
        } else {
            res = view;
        }
        res._ids = [];
        res._parents = {};
        return res;
    };

    var handle = window.tie.handle;

    handle('view', function (obj, config, observer, appConfig) {
        var handlerId = this._uid;
        var view = prepareView(config, obj);
        if (appConfig && !_.isString(config)) {
            var appView = prepareView(appConfig, obj);
            view = _.extend(appView, view);
        }
        var r = new renderer(obj, view);
        var tieName = obj.$name;
        r.observeArray = function () {
            return observer.observeArray.apply(observer, arguments);
        };
        r.render = function (prop) {
            if (this.rendering || (!this.rendered && prop)) {
                return;
            }
            this.rendering = true;
            this.$render(obj, prop);
            this.rendering = false;
            this.rendered = true;
            if (!prop) {
                _.forIn(viewHandlers, function (handle, prop) {
                    if (!view._resolved.contains(prop)) {
                        resolveViewHandle(obj, view, prop);
                    }
                });
            }
        };
        renders[tieName] = r;
        observer.watch('.*', handlerId, function (obj, prop, val) {
            if ('_deleted' === prop && !!val) {
                delete renders[tieName];
                observer.remove(handlerId);
            } else if (prop.indexOf('$view.') == 0) {
                var name = prop.replace('$view.', '');
                if (_.isHandle(name) && !name.contains('.')) {
                    resolveViewHandle(obj, view, name.substring(1));
                } else {
                    r.inspectChange(obj, prop, name, view);
                }
            }
            if (_.isDefined(obj.$view.value)) {
                _.forEach(r.$, function (el) {
                    if (prop === el.property) {
                        r.$renderAttr(obj, VALUE, val, el)
                    }
                });
            }
        });
        if (dom.ready()) {
            setTimeout(function () {
                if (!r.rendered) {
                    r.render()
                }
            }, 100);
        }
        return view;
    }, [], true);

    var onReady = function () {
        _.debug("Render app");
        _.forIn(renders, function (r) {
            if (!r.rendered) {
                r.render();
            }
        });
        _.debug("Rendered app");
    };

    dom.ready(onReady);

    window.tie.domReady = function () {
        return dom.ready.apply(dom, arguments)
    };
    window.tie.viewHandle = viewHandle;

    if (typeof window.exports === 'object') {
        var res = {};
        res.q = dom;
        res.el = wrap;
        res.renders = renders;
        res.clean = function () {
            dom.fetched = [];
            res.renders = renders = {};
        };
        window.exports = res;
    }

})(window);

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