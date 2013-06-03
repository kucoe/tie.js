var _ = {

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

    isArray: function (value) {
        return Array.isArray(value) || Object.prototype.toString.apply(value) == '[object Array]';
    },

    isCollection: function (value) {
        return this.isArray(value) || value instanceof Array || value instanceof NodeList ||
            value instanceof NamedNodeMap;
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

    toInt: function (str) {
        return parseInt(str, 10);
    },

    eqi: function (val1, val2) {
        return this.lowercase(val1) === this.lowercase(val2);
    },

    forEach: function (collection, callback, thisArg) {
        if (!thisArg) {
            thisArg = this;
        }
        if (callback) {
            if (this.isCollection(collection)) {
                var index = -1;
                var length = collection.length;

                while (++index < length) {
                    if (callback.call(thisArg, collection[index], index, collection) === false) {
                        break;
                    }
                }
            } else {
                callback.call(thisArg, collection, 0, [collection]);
            }
        }
        return collection;
    },

    forIn: function (object, callback, thisArg) {
        if (!thisArg) {
            thisArg = this;
        }
        if (callback) {
            for (var prop in object) {
                if (object.hasOwnProperty(prop)) {
                    if (callback.call(thisArg, object[prop], prop, object) === false) {
                        break;
                    }
                }
            }
        }
        return object;
    },

    uid: function () {
        return (s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4());
    },

    extend: function (dest, source) {
        if (this.isCollection(dest) && this.isCollection(source)) {
            this.forEach(source, function (item) {
                dest.push(item);
            });
        } else {
            for (var prop in source) {
                if (source.hasOwnProperty(prop)) {
                    dest[prop] = source[prop];
                }
            }
        }
    }
};