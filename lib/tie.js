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
            } else if (/^\d+$/.test(string)) {
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
    
        safeCall: function (fn, fnThis, bindReady) {
            var res;
            var spliceArgs = 3;
            if (this.isUndefined(bindReady) && this.isFunction(fnThis.$ready)) {
                bindReady = fnThis.$ready();
                spliceArgs = 2;
            }
            try {
                var args = args2Array(arguments, spliceArgs);
                res = fn.apply(fnThis, args);
            } catch (e) {
                res = undefined;
                if (bindReady) {
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
    
    var getPipe = function (p) {
        if (_.isString(p)) {
            p = pipesRegistry[p];
        } else if (_.isFunction(p)) {
            p = pipes('%tmp%', p);
        }
        return p;
    };
    
    var pipeModel = function (obj) {
        obj = _.clone(obj);
        observeClone(obj);
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
    
    var observeClone = function (obj) {
        var o = new observer(obj);
        o.apply = function (prop, ready) {
            if (prop && prop[0] == HANDLE_PREFIX) {
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
                config = _.safeCall(fn, h, true, obj, config, watcher, appConfig);
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
        this.newProps = [];
        this.listeners = [];
    };
    
    observer.prototype = {
    
        observe: function () {
            var obj = this.obj;
            var ready = obj.$ready();
            _.debug("Exploring object " + obj.$name);
            var added = explore(obj, ready, this);
            if (this.newProps.length > 0) {
                _.forEach(this.newProps, function (prop) {
                    _.debug("Observing dynamic property " + prop);
                    var splits = prop.split('.');
                    var next = splits.shift();
                    var o = obj;
                    var current = '';
                    while (next) {
                        current += next;
                        var desc = Object.getOwnPropertyDescriptor(o, next);
                        if (o && observeProperty(o, next, desc, ready, this, current)) {
                            added.push(prop);
                        }
                        o = o[next];
                        next = splits.shift();
                        current += '.';
                    }
                }, this);
                this.newProps = [];
            }
            _.forEach(this.props, function (prop) {
                _.debug('Check for property being deleted ' + prop);
                if (_.isUndefined(this.obj.$prop(prop))) {
                    _.debug("Notify deleted property " + prop);
                    this.onDelete(prop, ready);
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
                var property = listener(toRegex(prop), handlerId, null, onChange, onDelete);
                this.listeners.push(property);
                return function () {
                    var indexOf = this.listeners.indexOf(property);
                    if (indexOf != -1) {
                        this.listeners.splice(indexOf, 1);
                    }
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
                        return onAdd ? _.safeCall(onAdd, array, true, arg) : arg;
                    });
                    return [][item].apply(array, args);
                };
            });
            _.forEach(['pop', 'shift'], function (item) {
                array[item] = function () {
                    var res = [][item].call(array);
                    return onRemove ? _.safeCall(onRemove, array, true, res) : res;
                };
            });
            _.forEach(['sort', 'reverse', 'splice'], function (item) {
                array[item] = function () {
                    var res = [][item].call(array, arguments);
                    if ('splice' === item) {
                        res = res.map(function (r) {
                            return onRemove ? _.safeCall(onRemove, array, true, r) : r;
                        });
                    }
                    this.check();
                    return res;
                };
            });
            array._cmp = function (index, item, prev) {
                if (_.isUndefined(prev)) {
                    this[index] = _.safeCall(onAdd, array, true, item);
                } else if (!_.isEqual(item, prev)) {
                    this[index] = _.safeCall(onChange, array, true, item, prev, index);
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
            return array;
        },
    
        add: function (prop, handlerId, valueFn) {
            if (this.props.indexOf(prop) == -1) {
                this.newProps.push(prop);
                if (this.props.length > 0) { //check whether it was observed already
                    this.observe()
                }
            }
            if (this.newProps.indexOf(prop) != -1 && valueFn) {
                _.debug('Dynamic property added: ' + prop);
                var property = listener(prop, handlerId, valueFn);
                this.listeners.push(property);
                return function () {
                    var indexOf = this.listeners.indexOf(property);
                    if (indexOf != -1) {
                        this.listeners.splice(indexOf, 1);
                    }
                    indexOf = this.newProps.indexOf(prop);
                    if (indexOf != -1) {
                        this.newProps.splice(indexOf, 1);
                    }
                }.bind(this);
            }
            return null;
        },
    
        remove: function (prop) {
            var indexOf;
            if (_.isString(prop)) { //removes listeners by handlerId or by property name
                _.forEach(this.listeners, function (item, i) {
                    var property = item.property;
                    if (prop && (property === prop || (_.isRegExp(property) && property.test(prop)) || item.handlerId === prop)) {
                        this.listeners.splice(i, 1);
                        indexOf = this.newProps.indexOf(property);
                        if (indexOf != -1) {
                            this.newProps.splice(indexOf, 1);
                        }
                    }
                }, this, true);
            }
        },
    
        onGet: function (prop, ready) {
            return react(prop, this.obj, ready, this.listeners, 'get');
        },
    
        onChange: function (prop, ready) {
            return react(prop, this.obj, ready, this.listeners, 'change');
        },
    
        onDelete: function (prop, ready) {
            return react(prop, this.obj, ready, this.listeners, 'del');
        },
    
        apply: function (prop, ready) {
            this.onChange(prop, ready);
        }
    };
    
    var listener = function (prop, handlerId, valueFn, onChange, onDelete) {
        return {
            property: prop,
            handlerId: handlerId,
            valueFn: valueFn,
            onChange: onChange,
            onDelete: onDelete
        };
    };
    
    var react = function (prop, obj, ready, array, action) {
        if (!ready) {
            ready = obj.$ready();
        }
        _.debug('React on ' + action + ' for ' + prop);
        var val = action === 'get' ? null : obj[prop];
        _.forEach(array, function (item) {
            var property = item.property;
            var test = action === 'get' ? property === prop : (_.isRegExp(property) && property.test(prop));
            if (test) {
                var fn = action === 'get' ? item.valueFn : (action === 'del' ? item.onDelete : item.onChange);
                if (_.isFunction(fn)) {
                    val = _.safeCall(fn, obj, ready, obj, prop, val);
                }
            }
        });
        return val;
    };
    
    var explore = function (obj, ready, observer, context) {
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
            var dep = prop.indexOf(DEP_PREFIX) == 0 && obj.$deps.indexOf(prop.substring(2)) != -1;
            var fullProp = context ? context + '.' + prop : prop;
            if (_.isObject(value) && !_.isArray(value) && !dep && prop != DEPS && prop !== (DEP_PREFIX + APP)) {
                _.debug("Exploring object " + prop);
                _.extend(visited, explore(value, ready, observer, fullProp));
            }
            _.debug("Observing property " + prop);
            if (observeProperty(obj, prop, desc, ready, observer, fullProp)) {
                visited.push(prop);
                observer.onChange(fullProp, ready);
            }
            return true;
        });
        return visited;
    };
    
    var observeProperty = function (obj, prop, desc, ready, observer, fullProp) {
        if (desc && desc._proxyMark) {
            return false; //proxy already set
        }
        var newGet = function () {
            if (desc) {
                if (desc.get) {
                    return desc.get.call(this);
                }
                return desc.value;
            }
            return observer.onGet(fullProp, ready);
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
            if (!newSet._apply) {
                newSet._apply = true;
                observer.apply(fullProp, ready);
                newSet._apply = false;
            }
        };
        var enumerable = desc ? desc.enumerable : true;
        Object.defineProperty(obj, prop, {
            get: newGet,
            set: newSet,
            configurable: true,
            enumerable: enumerable,
            _proxyMark: true
        });
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
        this.observer.apply = function(prop, ready) {
            self.apply(prop, ready);
        };
    };
    
    bind.prototype = {
    
        apply: function (property, ready) {
            _.debug("Calling apply on '" + this.name + "' after changed property '" + property + "'");
            if (property && property[0] == HANDLE_PREFIX) {
                var n = property.substring(1);
                var h = handlesRegistry[n];
                if (h) {
                    this.resolveHandle(this.obj, n, h);
                }
            }
            if (property) {
                this.observer.onChange(property, ready);
            }
            _.forEach(this.reliers, function (item) {
                var bind = ties[item];
                if (bind) {
                    bind.obj[DEP_PREFIX + this.name] = this.obj;
                }
            }, this);
        },
    
        resolveHandles: function () {
            var name = this.name;
            var obj = this.obj;
            if (name != APP) {
                this.processedHandles = [];
                _.forIn(handlesRegistry, function (handle, prop) {
                    if (this.processedHandles.indexOf(prop) == -1) {
                        this.resolveHandle(obj, prop, handle);
                    }
                }, this);
            }
        },
    
        resolveHandle: function (obj, prop, handle) {
            _.debug("Check handle " + prop);
            _.forEach(handle.$deps, function (item) {
                if (this.processedHandles.indexOf(item) == -1) {
                    var h = handlesRegistry[item];
                    if(h) {
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
                obj[n] = handle(obj, config, this.observer, appConfig);
            }
            if (this.processedHandles.indexOf(prop) == -1) {
                this.processedHandles.push(prop);
            }
        },
    
        checkApplyCount: function() {
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
                if (app.reliers.indexOf(name) == -1) {
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
                if (found.reliers.indexOf(name) == -1) {
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