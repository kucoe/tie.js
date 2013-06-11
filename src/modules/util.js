/**
 * Utilities. All those methods are available in model prototype. So when creating your tie you can use these utils.
 * For ex.
 * <pre>
 *      tie('data', function(arg) {
 *          if(this.isDefined(arg)) {
 *              return arg;
 *          }
 *      });
 * </pre>
 *
 * @namespace _
 */
var _ = {

    /**
     * Enables debug mode.
     *
     * @property debugEnabled default to true
     */
    debugEnabled: true,

    /**
     * Whether value is undefined
     *
     * @param {*} value
     * @returns boolean
     */
    isUndefined: function (value) {
        return value == undefined;
    },

    /**
     * Whether value is defined
     *
     * @param {*} value
     * @returns boolean
     */
    isDefined: function (value) {
        return value != undefined;
    },

    /**
     * Whether value is object
     *
     * @param {*} value
     * @returns boolean
     */
    isObject: function (value) {
        return value != null && typeof value == 'object';
    },

    /**
     * Whether value is string
     *
     * @param {*} value
     * @returns boolean
     */
    isString: function (value) {
        return typeof value == 'string';
    },

    /**
     * Whether value is number
     *
     * @param {*} value
     * @returns boolean
     */
    isNumber: function (value) {
        return typeof value == 'number';
    },

    /**
     * Whether value is date
     *
     * @param {*} value
     * @returns boolean
     */
    isDate: function (value) {
        return Object.prototype.toString.apply(value) == '[object Date]';
    },

    /**
     * Whether value is array. Exact array match. Array-like objects (arguments, node lists) will not pass that check.
     *
     * @param {*} value
     * @returns boolean
     */
    isArray: function (value) {
        return Array.isArray(value) || Object.prototype.toString.apply(value) == '[object Array]';
    },

    /**
     * Whether value is array or array-like. Array-like objects (arguments, node lists) will pass that check.
     *
     * @param {*} value
     * @returns boolean
     */
    isCollection: function (value) {
        return this.isArray(value) || value instanceof Array || value instanceof NodeList ||
            value instanceof NamedNodeMap;
    },

    /**
     * Whether value is function.
     *
     * @param {*} value
     * @returns boolean
     */
    isFunction: function (value) {
        return typeof value == 'function';
    },

    /**
     * Whether value is boolean.
     *
     * @param {*} value
     * @returns boolean
     */
    isBoolean: function (value) {
        return typeof value == 'boolean';
    },

    /**
     * Remove trailing whitespaces from string.
     *
     * @param {string} value
     * @returns string
     */
    trim: function (value) {
        return this.isString(value) ? value.replace(/^\s*/, '').replace(/\s*$/, '') : value;
    },

    /**
     * Converts string to lower case.
     *
     * @param {string} string
     * @returns string
     */
    lowercase: function (string) {
        return this.isString(string) ? string.toLowerCase() : string;
    },

    /**
     * Converts string to upper case.
     *
     * @param {string} string
     * @returns string
     */
    uppercase: function (string) {
        return this.isString(string) ? string.toUpperCase() : string;
    },

    /**
     * Converts string to integer.
     *
     * @param {string} string
     * @returns number
     */
    toInt: function (string) {
        return parseInt(string, 10);
    },

    /**
     * Converts string to float.
     *
     * @param {string} string
     * @returns number
     */
    toFloat: function (string) {
        return parseFloat(string);
    },

    /**
     * Compares two strings ignoring case.
     *
     * @param {string} string1
     * @param {string} string2
     * @returns boolean
     */
    eqi: function (string1, string2) {
        return this.lowercase(string1) === this.lowercase(string2);
    },

    /**
     * Clones object using deep referencing.
     *
     * @param {*} obj
     * @returns Object|Array clone
     */
    clone: function (obj) {
        if (!obj || !this.isObject(obj)) {
            return obj;
        }
        var newObj = this.isArray(obj) ? [] : {};
        newObj = this.extend(newObj, obj, function (item) {
            if (item && this.isObject(item)) {
                item = this.clone(item);
            }
            return item;
        }.bind(this));
        return newObj;
    },

    /**
     * Converts string to object of guessing type.
     *
     * Note: supports integer, float, boolean, string. String will be cleaned from quotes.
     *
     * @param {string} string
     */
    convert: function (string) {
        var res = string;
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
        } else if (string.charAt(0) == '"' || string.charAt(0) == "'") {
            res = string.substring(1, string.length - 1);
        }
        return res;
    },

    /**
     * Iterates through collection calling callback on every element. If only one item passed will call on it.
     *
     * For ex.
     *  <pre>
     *      forEach(array, function(item, i, collection){
     *          item.idx = i;
     *      })
     *  </pre>
     *
     * @param {Array|Object} collection
     * @param {Function} callback function
     * @param {Object} [thisArg] this object inside your callback
     * @param {boolean} [safe] if true will iterate over copy of collection, so you can easily remove elements from collection
     */
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

    /**
     * Iterates through object own properties calling callback on every property.
     *
     * For ex.
     *  <blockquote>
     *      forIn(obj, function(value, prop, obj){
     *          value.prop = prop;
     *      })
     *  </pre>
     *
     * @param {Object} object
     * @param {Function} callback function
     * @param {Object} [thisArg] this object inside your callback
     */
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

    /**
     * Generates unique identifier
     *
     * @returns string
     */
    uid: function () {
        return (s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4());
    },

    /**
     * Copies all properties/items of source to destination. Supports collections and objects.
     *
     * For ex.
     *  <pre>
     *      extend([], array, function(item, i){
     *          if(i == 0) return 'a';
     *          return item;
     *      });
     *      extend({}, obj, function(value, prop){
     *          if(prop == 'name') return 'a';
     *          return value;
     *      });
     *  </pre>
     *
     * @param {Array|Object} destination
     * @param {Array|Object} source
     * @param {Function} [fn] Function to be called on every item/property to change the item.
     * @returns Object|Array
     */
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
            });
        }
        return destination;
    },

    /**
     * Writes debug string to console if debug enabled.
     *
     * @param {string} message
     */
    debug: function (message) {
        if (this.debugEnabled) {
            console.log(message);
        }
    }
};