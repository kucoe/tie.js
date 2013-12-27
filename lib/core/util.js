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
            if (_.isObject(context) && _.isString(v) && v.indexOf('#{') == 0 && v.indexOf('}' == (v.length - 1))) {
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