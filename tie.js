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

    function fillSystemFields(obj, name, sealed, dependencies) {
        _.defineImmutable(obj, '$name', name);
        _.defineImmutable(obj, '$sealed', sealed || false);
        _.defineImmutable(obj, '$deps', Object.freeze(dependencies || []));
        _.defineImmutable(obj, '_uid', _.uid());
    }

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
                    _.debug(e, 'User code error');
                }
            }
            return res;
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
    
        nextTick: function(fn) {
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
        fillSystemFields(p, name, sealed, dependencies);
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
            _.debug("Processed handle " + name);
            return obj;
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
                        current +=  next;
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
                return property;
            }
            return null;
        },
    
        add: function (prop, handlerId, valueFn) {
            if (this.props.indexOf(prop) == -1) {
                this.newProps.push(prop);
                if(this.props.length > 0) { //check whether it was observed already
                    this.observe()
                }
            }
            if (this.newProps.indexOf(prop) != -1 && valueFn) {
                _.debug('Dynamic property added: ' + prop);
                var property = listener(prop, handlerId, valueFn);
                this.listeners.push(property);
                return property;
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
            } else if (prop) { // removes listeners
                indexOf = this.listeners.indexOf(prop);
                if (indexOf != -1) {
                    this.listeners.splice(indexOf, 1);
                }
                indexOf = this.newProps.indexOf(prop.property);
                if (indexOf != -1) {
                    this.newProps.splice(indexOf, 1);
                }
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
    
        apply: function(prop, ready) {
            // should be implement later
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
            if (_.isObject(value) && !dep && prop != DEPS && prop !== (DEP_PREFIX + APP)) {
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
            observer.apply(fullProp, ready);
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
            if (property === this.currentProperty) {
                return;
            }
            this.currentProperty = property;
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
            delete this.currentProperty;
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
                this.currentProperty = n; //prevent apply update
                this.observer.remove(handle._uid);
                obj[n] = handle(obj, config, this.observer, appConfig);
                delete this.currentProperty;
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
            fillSystemFields(obj, name, sealed, dependencies);
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

/**
 * Tie.js DOM handle
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */
(function (window) {
    'use strict';

    var _ = window.tie._;
    var document = window.document;

    var VALUE = 'value';
    var TEXT = 'text';

    var INDEX = "data-index";
    var TIE = "data-tie";
    var TIED = "data-tied";
    var CLASS = "class";
    var NAME = "name";

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

        hasClass: function (el, cls) {
            return el.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));
        },

        addClass: function (el, cls) {
            if (!this.hasClass(el, cls)) {
                el.className += " " + cls;
                el.className = _.trim(el.className);
            }
        },

        removeClass: function (el, cls) {
            if (this.hasClass(el, cls)) {
                var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
                el.className = el.className.replace(reg, ' ');
                el.className = _.trim(el.className);
            }
        },

        ready: function (fn) {
            if (fn) {
                // check if document already is loaded
                if (document.readyState === 'complete') {
                    setTimeout(fn, 0);
                    this.domReady = true;
                } else {
                    if (this.readyListeners.length == 0) {
                        window.addEventListener('load', this.readyFn);
                    }
                }
                if (this.readyListeners.length == 0) {
                    window.addEventListener('hashchange', this.readyFn);
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

    var wrap = function (el, obj) {
        var that = this;
        var name = obj.$name;
        var tagName = el.tagName;
        var listener = function (event) {
            _.debug("Fired '" + event.type + "' listener on '" + name + "' for element " + tagName);
            var value = that.value();
            value = _.trim(value);

            var prop = that.getProperty();
            if (obj.$prop(prop) !== value) {
                obj.$prop(prop, value);
            }
        };
        var idx = el.getAttribute(INDEX);
        this.$ = el;
        this._id = _.uid();
        this.index = idx ? parseInt(idx) : -1;
        this.tie = el.getAttribute(TIE);
        this.obj = obj;
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

        getProperty: function () {
            var string = this.tie;
            string = _.trim(string || '');
            var tokens = string.split('|');
            var t = tokens[0];
            var dot = t.indexOf('.');
            if (dot != -1) {
                return t.substring(dot + 1);
            }
            var index = t.indexOf(':');
            var name = _.trim(index + 1 ? t.substr(0, index) : t);
            if (name === 'property') {
                if (index >= 0) {
                    var p = _.trim(t.substr(++index));
                    p = '[' + p + ']';
                    var array = _.convert(p, {});
                    return array[0];
                }
            }
            return VALUE;
        },

        isTied: function () {
            return this.$.getAttribute(TIED);
        },

        setAttribute: function (name, value) {
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
                    _.safeCall(value, that.obj, that.obj.$ready(), event);
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
            delete this.obj;
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

    var valueFn = function (obj, idx, bindReady) {
        var name = this.name;
        var val = this.value;
        var property = this.property;

        if (_.isUndefined(bindReady)) {
            bindReady = obj.$ready();
        }

        if (_.isFunction(val)) {
            return _.safeCall(val, obj, bindReady)
        } else {
            if (property && _.isUndefined(val)) {
                return findProperty(obj, property, idx);
            }
            if (!name) {
                throw new Error("Where is your property?")
            }
            return findProperty(obj, name, idx);
        }
    };

    var findProperty = function (obj, name, idx) {
        if (_.isUndefined(idx)) {
            idx = -1;
        }
        var values = obj.$values;
        if (idx >= 0 && values && _.isDefined(values[idx][name])) {
            return values[idx][name];
        }
        if (idx >= 0 && values && VALUE == name) {
            return values[idx];
        }
        return obj.$prop(name);
    };

    var attrValue = function (name, value) {
        if (this.$attrs) {
            var attr = this.$attrs[name];
            if (_.isUndefined(value)) {
                if (attr) {
                    return attr.val(this);
                }
            } else {
                if (attr && attr.property) {
                    this.$prop(attr.property, value);
                } else if (attr) {
                    this.$prop(name, value);
                }
            }
        }
        return null;
    };

    var checkProperty = function (attr) {
        var name = attr.name;
        var index = name.indexOf('#');
        if (index != -1) {
            attr.name = name.substring(0, index);
            attr.property = name.substring(index + 1);
            attr.deps.push(attr.property);
        } else {
            attr.deps.push(name);
        }
        return attr;
    };

    var parse = window.tie.$;

    var renders = {};

    var renderer = function (obj) {
        this.obj = obj;
        if (_.isUndefined(obj.$shown)) {
            obj.$shown = true;
        }
        obj.$attr = attrValue;
        this.values = {};
        this.rendered = false;
        this.rendering = false;
        this.loaded = false;
        this.loading = false;
        this.selected = false;
        this.e = 0;
        this.$ = [];
    };

    renderer.prototype = {
        prepareAttrs: function (attrs, obj, observer, handlerId) {
            if (attrs && _.isArray(attrs)) {
                var res = {};
                var r = this;
                _.forEach(attrs, function (attr) {
                    if (_.isString(attr)) {
                        attr = {
                            name: attr,
                            property: null,
                            deps: [],
                            value: null,
                            val: valueFn
                        };
                        attr = checkProperty(attr);
                    }
                    var name = attr.name;
                    if (VALUE === name && _.isFunction(obj.value)) {
                        attr.value = obj.value;
                        delete obj.value;
                    }
                    if (attr.property || attr.value) {
                        observer.add(name, handlerId, function (obj) {
                            return obj.$attr(name);
                        });
                        observer.watch(name, handlerId, function (obj, prop, val) {
                            obj.$attr(name, val);
                        });
                    }
                    if (attr.deps.length > 0) {
                        var d = attr.deps.join('|');
                        observer.watch(d, handlerId, function () {
                            r.render(name);
                        });
                    }
                    res[name] = attr;
                });
                attrs = res;
            }
            return attrs;
        },

        select: function (base) {
            var obj = this.obj;
            var name = obj.$name;
            var res = [];
            if (dom.fetched.length == 0 || base) {
                dom.fetch('[' + TIE + ']', base);
            }
            _.forEach(dom.fetched, function (el) {
                if (el.getAttribute(TIE).indexOf(name) == 0) {
                    res.push(new wrap(el, obj));
                }
            });
            this.selected = true;
            return res;
        },

        load: function () {
            if (this.loading) {
                return;
            }
            this.loading = true;
            if (!this.selected) {
                this.$ = this.select();
                this.e = this.$.length;
                _.debug("Elements selected: " + this.$.length);
            }
            this.loaded = true;
            this.loading = false;
        },

        renderView: function () {
            if (this.obj.$view && this.e > 0) {
                var html = this.viewHtml();
                console.log(html);
                if (html) {
                    _.forEach(this.$, function (el) {
                        if (el) {
                            el.html(html);
                        }
                    });
                }
            }
        },

        viewHtml: function () {
            var view = this.obj.$view;
            var r = renders[view.name];
            var html = '';
            if (r) {
                if (!r.loaded) {
                    r.load();
                }
                _.forEach(r.$, function (el) {
                    if (el) {
                        html += el.html();
                    }
                });
            }
            return html;
        },

        renderAttr: function (attr, obj, idx, ready, el) {
            var name = attr.name;
            var val = attr.val(obj, idx, ready);
            _.debug("Render attribute '" + name + "' with value " + val);
            el.setAttribute(name, val);
        },

        render: function (property, force) {
            if (!this.rendered && property && !force) {
                return;
            }
            var obj = this.obj;
            if (this.rendering && !force) {
                return;
            }
            this.rendering = true;
            var tieName = obj.$name;
            _.debug("Render " + tieName, tieName + " Render");
            if (!this.loaded) {
                this.load();
            }
            var ready = obj.$ready();
            _.forEach(this.$, function (el) {
                if (el && (!el.isTied() || force)) {
                    if (obj.$shown) {
                        obj = parse(el.tie, undefined, obj);
                        var attrs = obj.$attrs;
                        var idx = el.index;
                        if (attrs) {
                            if (property) {
                                var attr = attrs[property];
                                if (attr) {
                                    this.renderAttr(attr, obj, idx, ready, el);
                                }
                            } else {
                                _.forIn(attrs, function (attr) {
                                    this.renderAttr(attr, obj, idx, ready, el);
                                }, this);
                                el.setAttribute(TIED);
                                el.setAttribute(CLASS, tieName);
                                if (el.isInput) {
                                    el.setAttribute(NAME, tieName);
                                }
                            }
                        }
                    } else {
                        el.show(obj.$shown)
                    }
                }
            }, this);
            this.rendering = false;
            this.rendered = true;
            _.debug("Rendered " + tieName);
        },

        show: function (shown) {
            if (this.rendered) {
                _.forEach(this.$, function (el) {
                    if (el) {
                        el.show(shown);
                    }
                }, this);
            }
        }
    };

    var handle = window.tie.handle;

    var onReady = function () {
        _.debug("Render app");
        _.forIn(renders, function (r) {
            if (!r.rendered) {
                r.render();
                r.renderView();
            }
        });
        _.debug("Rendered app");
    };

    var add = function (obj, observer, handlerId) {
        var r = new renderer(obj);
        renders[obj.$name] = r;
        observer.watch('_deleted', handlerId, function (obj, prop, val) {
            if (val) {
                delete renders[obj.$name];
                observer.remove(handlerId)
            }
        });
        if (dom.ready()) {
            setTimeout(function () {
                r.render();
                r.renderView()
            }, 100);
        }
        return r;
    };

    handle("view", function (obj, config, observer, appConfig) {
        if (_.isString(config)) {
            config = {
                name: config,
                url: appConfig ? appConfig.url : ''
            };
        }
        if (!config.name) {
            return undefined;
        }
        var r = renders[obj.$name];
        if (r && dom.ready() && r.rendered) {
            setTimeout(function () {
                r.renderView();
            }, 100);
        }
        return config;
    }, [], true);

    handle("attrs", function (obj, config, observer) {
        if (config) {
            var r = add(obj, observer, this._uid);
            config = r.prepareAttrs(config, obj, observer, this._uid);
        }
        return config;
    }, ['view'], true);

    handle("attr", function () {
        return attrValue;
    }, ['attrs'], true);

    handle("shown", function (obj, config) {
        var r = renders[obj.$name];
        if (r) {
            r.show(config);
        }
        return config;
    }, ['attrs'], true);

    dom.ready(onReady);

    window.tie.domReady = dom.ready;

    window.tie.attr = function (name, value, dependencies) {
        var attr = {
            name: name,
            property: null,
            deps: dependencies || [],
            value: value,
            val: valueFn
        };
        if (value && name.indexOf('#') != -1) {
            throw new Error('Property and calculated value combination is not supported');
        }
        if (!value) {
            attr = checkProperty(attr);
        }
        return attr;
    };

    if (typeof window.exports === 'object') {
        window.exports = function () {
            var res = {};
            res.q = dom;
            res.el = wrap;
            res.renders = renders;
            res.clean = function () {
                dom.fetched = [];
                res.renders = renders = {};
            };
            return res;
        };
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
    }, ['attrs'], true);

})(window);