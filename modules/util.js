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
        debugEnabled: false,

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
            return this.isArray(value) || value instanceof Array
                || Object.prototype.toString.apply(value) == '[object NodeList]'
                || Object.prototype.toString.apply(value) == '[object NamedNodeMap]'
                || Object.prototype.toString.apply(value) == '[object Arguments]';
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
         * Performs a deep comparison between two values to determine if they are
         * equivalent to each other.
         *
         * @param {Mixed} a The value to compare.
         * @param {Mixed} b The other value to compare.
         * @param {Array} [aStack=[]] Tracks traversed `a` objects.
         * @param {Array} [bStack=[]] Tracks traversed `b` objects.
         * @returns {Boolean} Returns `true`, if the values are equivalent, else `false`.
         */
        isEqual: function (a, b, aStack, bStack) {
            // Identical objects are equal. `0 === -0`, but they aren't identical.
            // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
            if (a === b) {
                return a !== 0 || 1 / a == 1 / b;
            }
            // A strict comparison is necessary because `null == undefined`.
            if (a == null || b == null) {
                return a === b;
            }
            // Compare `[[Class]]` names.
            var className = Object.prototype.toString.call(a);
            if (className != Object.prototype.toString.call(b)) {
                return false;
            }
            switch (className) {
                // Strings, numbers, dates, and booleans are compared by value.
                case '[object String]':
                    // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
                    // equivalent to `new String("5")`.
                    return a == String(b);
                case '[object Number]':
                    // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
                    // other numeric values.
                    return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
                case '[object Date]':
                case '[object Boolean]':
                    // Coerce dates and booleans to numeric primitive values. Dates are compared by their
                    // millisecond representations. Note that invalid dates with millisecond representations
                    // of `NaN` are not equivalent.
                    return +a == +b;
                // RegExps are compared by their source patterns and flags.
                case '[object RegExp]':
                    return a.source == b.source &&
                        a.global == b.global &&
                        a.multiline == b.multiline &&
                        a.ignoreCase == b.ignoreCase;
            }
            if (typeof a != 'object' || typeof b != 'object') {
                return false;
            }

            if(this.isUndefined(aStack)) {
                aStack = [];
            }
            if(this.isUndefined(bStack)) {
                bStack = [];
            }
            // Assume equality for cyclic structures. The algorithm for detecting cyclic
            // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
            var length = aStack.length;
            while (length--) {
                // Linear search. Performance is inversely proportional to the number of
                // unique nested structures.
                if (aStack[length] == a) {
                    return bStack[length] == b;
                }
            }
            // Add the first object to the stack of traversed objects.
            aStack.push(a);
            bStack.push(b);
            var size = 0, result = true;
            // Recursively compare objects and arrays.
            if (className == '[object Array]') {
                // Compare array lengths to determine if a deep comparison is necessary.
                size = a.length;
                result = size == b.length;
                if (result) {
                    // Deep compare the contents, ignoring non-numeric properties.
                    while (size--) {
                        if (!(result = this.isEqual(a[size], b[size], aStack, bStack))) {
                            break;
                        }
                    }
                }
            } else {
                // Objects with different constructors are not equivalent, but `Object`s
                // from different frames are.
                var aCtor = a.constructor, bCtor = b.constructor;
                if (aCtor !== bCtor && !(this.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                    this.isFunction(bCtor) && (bCtor instanceof bCtor))) {
                    return false;
                }
                // Deep compare objects.
                this.forIn(a, function (value, prop) {
                    size++;
                    if (!(result = b.hasOwnProperty(prop) && _.isEqual(value, b[prop], aStack, bStack))) {
                        return false;
                    }
                    return true;
                });
                // Ensure that both objects contain the same number of properties.
                if (result) {
                    this.forIn(b, function (value, prop) {
                        if (!(size--)) {
                            return false;
                        }
                        return true;
                    });
                    result = !size;
                }
            }
            // Remove the first object from the stack of traversed objects.
            aStack.pop();
            bStack.pop();
            return result;
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
            var newObj = this.isCollection(obj) ? [] : Object.create(Object.getPrototypeOf(obj));
            newObj = this.extend(newObj, obj, function (item) {
                return _.clone(item);
            });
            return newObj;
        },

        /**
         * Converts string to object of guessing type.
         *
         * Note: supports integer, float, boolean, string. String will be cleaned from quotes.
         *
         * @param {string} string
         * @param {Object} [context] object to get properties
         */
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
         * @param {boolean} [all = false] whether iterate  through all properties
         */
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

        /**
         * Process asynchronous calling or array or object elements and performs callback on every item, when no items left, called last function.
         *
         * @param {Object|Array} obj to iterate through
         * @param {Function} callback function will be called on every element
         * @param {Function} [last] the last function when all elements processed
         * @param {Object} [thisArg] this object inside your callback
         */
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
                }
                next();
            }
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
                }, this);
            }
            return destination;
        },

        /**
         * Writes debug string to console if debug enabled.
         *
         * @param {string} message
         * @param {string} [group] starts new collapsed group
         */
        debug: function (message, group) {
            if (this.debugEnabled) {
                if (group) {
                    console.groupEnd();
                    console.groupCollapsed(group);
                }
                console.log(message);
            }
        }
    }
    ;
module.exports = _;