/**
 * Tie.js
 * Smart binding, routes, pipes, properties, templates, resources.
 *
 * @namespace export
 */
(function (window) {
    'use strict';

    /**
     * Properties constants
     */
    var APP = 'app';
    var VALUE = 'value';
    var CALLBACK = 'callback';
    var VALUES = 'values';
    var TEXT = 'text';
    var SHOWN = 'shown';
    var ATTRS = 'attrs';
    var ROUTES = 'routes';
    var ITEM_NAME = '_item_name';

    /**
     * Attribute constants
     */
    var INDEX = "data-index";
    var TIE = "data-tie";
    var TIED = "data-tied";

    /**
     * Generates 4 chars hex string
     *
     * @returns {string}
     */
    var s4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };

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

    /**
     * Properties watcher proxy. Inspects object own properties and attributes from bind and define watching property.
     *
     * @namespace proxy
     * @param {bind} bind element bound tie
     */
    var proxy = function (bind) {
    
        /**
         * Defines new watcher property
         *
         * @param {model} obj inspected object
         * @param {Object} desc property descriptor if any
         * @param {string} prop property name
         * @param {boolean} [dependency] whether the property refers to dependent tie
         */
        var observe = function (obj, desc, prop, dependency) {
            if (desc && desc._proxyMark) {
                return; //proxy already set
            }
            var newGet = function () {
                if (desc) {
                    if (desc.get) {
                        return desc.get.call(obj);
                    }
                    return desc.value;
                }
                return bind.$attrValue(prop);
            };
            var newSet = function (val) {
                if (desc) {
                    if (desc.set) {
                        desc.set.call(this, val);
                    } else {
                        desc.value = val;
                    }
                } else {
                    bind.$attrValue(prop, val);
                }
                if (prop == SHOWN) {
                    bind.$show(val);
                } else {
                    if (prop == ATTRS) {
                        bind.$prepareAttrs();
                    } else if (prop == ROUTES) {
                        bind.$prepareRoutes();
                    }
                    bind.$apply();
                }
            };
            var enumerable = desc ? desc.enumerable : false;
            Object.defineProperty(obj, prop, {
                get: newGet,
                set: newSet,
                configurable: true,
                enumerable: enumerable,
                _proxyMark: true
            });
        };
    
        /**
         * Visits object own properties and attributes and add watchers.
         *
         * Note: will recursively observe property of {Object} type
         *
         * @param {model} obj inspected object
         */
        var explore = function (obj) {
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    props.push(prop);
                    if ('prototype' == prop) {
                        continue; // skip prototype
                    }
                    var desc = Object.getOwnPropertyDescriptor(obj, prop);
                    if (desc._proxyMark) {
                        continue; //skip already processed
                    }
                    if (!desc.configurable || (desc.value === undefined && !desc.set) || desc.writable === false) {
                        continue; // skip readonly
                    }
                    var dep = prop.charAt(0) === '$' && bind.depends.indexOf(prop.substring(1)) != -1;
                    var val = obj[prop];
                    if (_.isObject(val) && !dep && prop != ATTRS && prop != ROUTES) {
                        explore(val);
                    }
                    observe(obj, desc, prop, dep);
                }
            }
            if (obj.attrs) {
                _.forIn(obj.attrs, function (attr, prop) {
                    if (props.indexOf(prop) == -1 || attr.property || attr.value) {
                        if (_.isObject(val)) {
                            explore(val);
                        }
                        observe(obj, null, prop);
                    }
                    props.push(prop);
                }, this);
            }
        };
    
        var obj = bind.obj;
        var props = [];
        explore(obj);
    
        return obj;
    };
    
    var routes = {
        list: {},
        init: function () {
            if (app == null) {
                throw new Error("App is not ready");
            }
            if (app.obj.routes) {
                _.forIn(app.obj.routes, function (r, path) {
                    path = path.toLowerCase();
                    this.list[path] = new route(path, r.handler);
                }, this);
                _.debug("Routes init");
            }
        },
    
        locate: function (ties) {
            var current = window.location.hash.substring(1);
            current = this.find(current);
            if (!current) {
                if (app.obj.routes) {
                    this.move('/');
                } else {
                    _.debug("Process default route");
                    _.forIn(ties, function (bind) {
                        if (!bind. rendered) {
                            bind.$render();
                        }
                        bind.obj.$location = function () {
                            return{route: {has: function () {
                                return true
                            }}}
                        };
                        bind.obj.shown = true;
                    });
                    _.debug("Processed default route");
                }
            } else {
                _.debug("Process route " + current.path);
                app.location = function (url) {
                    if (url) {
                        this.move(url);
                        return null;
                    }
                    return {href: window.location.href, route: current};
                }.bind(this);
                if (current.handler) {
                    safeCall(current.handler, app.obj, app.$ready());
                }
                _.forIn(ties, function (bind) {
                    if (!bind.rendered) {
                        bind.$render();
                    }
                    bind.obj.$location = app.location;
                    bind.obj.shown = current.has(bind);
                    var r = bind.obj.routes[current.path];
                    if (r && r.handler) {
                        safeCall(r.handler, bind.obj, bind.$ready());
                    }
                });
                _.debug("Processed route " + current.path);
            }
        },
    
        find: function (path) {
            return this.list[path];
        },
    
        move: function (url) {
            setTimeout(function () {
                window.location.hash = '#' + url;
            }, 100);
        }
    };
    
    var route = function (path, handler) {
        this.path = path;
        this.handler = handler;
    };
    
    route.prototype = {
        has: function (bind) {
            var routes = bind.obj.routes;
            var exclude = routes['-'] != null;
            var contains = false;
            _.forIn(routes, function (route, path) {
                if (path.toLowerCase() == this.path) {
                    contains = true;
                    return false;
                }
                return true;
            }, this);
            return exclude != contains;
        }
    };
    
    
    /**
     * Pipes helpers. Exported to allow assign pipe parameters.
     */
    var pipes = {};
    
    /**
     * Pipe descriptor. Pipe is the way of transforming input model into new model and hijack new values when rendering element
     * attributes. Here is a pipe example : <i>data|property:'name', 'a'</i>. The result will be model with changed property name to 'a'.
     * <br><i>data|property:'name'</i> will replace property 'value' with value from property 'name'.
     * <br>Simpler form is <i>data.name</i>.
     *
     * @constructor
     * @class pipe
     * @this pipe
     * @param {string} str pipe string.
     */
    var pipe = function (str) {
        var split = str.split(':');
        this.name = _.trim(split[0]);
        this.params = [];
        if (split.length > 1) {
            this.params = split[1].split(',');
        }
    
    };
    
    pipe.prototype = {
    
        /**
         * Process model from bind and returns new model after pipe execution
         *
         * @this pipe
         * @param {model} obj tied model
         * @param {Object} ties named ties object
         */
        process: function (obj, ties) {
            var tie = ties[this.name];
            if (!tie) {
                throw new Error('Pipe ' + this.name + ' not found');
            }
            var value = tie.obj[CALLBACK];
            var params = [];
            if (this.params.length > 0) {
                _.forEach(this.params, function (param) {
                    param = _.trim(param);
                    var res = _.convert(param);
                    if (obj[param]) {
                        res = obj[param];
                    } else if (pipes[param]) {
                        res = pipes[param];
                    }
                    params.push(res);
                });
            }
            var res = _.clone(obj);
            if (value && _.isFunction(value)) {
                res = safeCall(value, tie, tie.$ready(), res, params);
            }
            return res;
        }
    };
    
    
    /**
     * DOM manipulations functions
     *
     * @namespace q
     */
    var q = {
    
        /**
         * Appends list of elements to the index element
         *
         * @param {Node} index index node after which new elements will go.
         * @param {Node|Array} newElements one or more elements
         */
        next: function (index, newElements) {
            var parent = index.parentNode;
            _.forEach(newElements, function (node) {
                parent.insertBefore(node, index.nextSibling);
                index = node;
            });
        },
    
        /**
         * Removes element
         *
         * @param {Node} element element to remove.
         */
        remove: function (element) {
            var parent = element.parentNode;
            if (parent) parent.removeChild(element);
        },
    
        /**
         * Adds on load on hash change listener with callback specified.
         * <br>
         * Note: callback will be called when document loaded or instantly if document is already loaded
         * and every time when hash is changed.
         *
         * @param {Function} fn function to call.
         */
        ready: function (fn) {
            // check if document already is loaded
            if (document.readyState === 'complete') {
                setTimeout(fn, 0);
            } else {
                window.addEventListener('load', fn);
            }
            window.addEventListener('hashchange', fn);
        }
    };
    
    /**
     * DOM element wrapper
     *
     * @constructor
     * @class $
     * @this $
     * @param {Node} el DOM element.
     * @param {bind} bind element bound tie
     * @param {Object} ties already registered ties dictionary
     */
    var $ = function (el, bind, ties) {
        var listener = function () {
            var value = this.value();
            value = _.trim(value);
    
            if (bind.obj[VALUE] !== value) {
                bind.obj[VALUE] = value;
            }
        }.bind(this);
        if (_.isDefined(el.value)) {
            if ('oninput' in el) {
                el.addEventListener('input', listener);
            } else {
                el.addEventListener('keydown', function (event) {
                    var key = event.keyCode;
                    // ignore command         modifiers                   arrows
                    if (key === 91 || (15 < key && key < 19) || (37 <= key && key <= 40)) return;
                    listener(event);
                });
            }
        }
        el.addEventListener('change', listener);
        var idx = el.getAttribute(INDEX);
        this.$ = el;
        this._id = _.uid();
        this.index = idx ? parseInt(idx) : -1;
        this.tie = el.getAttribute(TIE);
        this.bind = bind;
        this.events = {};
        this.isInput = _.eqi(el.tagName, 'input');
        this.hasCheck = _.eqi(el.type, 'radio') || _.eqi(el.type, 'checkbox');
        this.display = el.style.display;
        this.shown = true;
        this.textEl = null;
        var pipes = this.tie.replace(/\.([^.|1-9]+)/g, '|property:"$1"').match(/[^|]+/g).splice(1);
        this.pipes = [];
        _.forEach(pipes, function (string) {
            this.pipes.push(new pipe(string));
        }, this);
    
        /**
         * Processes pipelines of current element
         *
         * @this $
         * @returns {model} new object according to pipes
         */
        this.pipeline = function () {
            var res = this.bind.obj;
            if (this.pipes) {
                _.forEach(this.pipes, function (pipe) {
                    res = pipe.process(res, ties);
                })
            }
            return res;
        }
    };
    
    $.prototype = {
    
        /**
         * Apply element attribute. Has polymorphic behavior.<br>
         *  <ul>
         *      <li>For attribute "value" calls this {@link $#value},
         *      <li>for attribute "text" calls this {@link $#text},
         *      <li>for function value adds event handler
         *      <li>else simple set attributes element.
         *  </ul>
         *
         * @this $
         * @param {string} name attribute name.
         * @param {*} [value] attribute value.
         */
        setAttribute: function (name, value) {
            if (VALUE === name) {
                this.value(value);
            } else if (TEXT === name) {
                this.text(value);
            } else if (_.isFunction(value)) {
                var handler = this.events[name];
                if (handler) {
                    this.$.removeEventListener(name, handler);
                }
                handler = function (event) {
                    event.index = this.index;
                    event.tie = this.tie;
                    safeCall(value, this.bind.obj, this.bind.$ready(), event);
                }.bind(this);
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
    
        /**
         * Apply elements value or return current value if parameter is empty. Has polymorphic behavior.<br>
         *  <ul>
         *     <li>For input that has check checked attribute will be used,
         *     <li>for other inputs value attribute will be used,
         *     <li>else {@link $#text} will be called.
         *  </ul>
         * @this $
         * @param {*} [val] value.
         */
        value: function (val) {
            if (this.hasCheck) {
                if (_.isDefined(val)) {
                    if (val) {
                        this.$.setAttribute('checked', 'checked');
                    } else {
                        this.$.removeAttribute('checked');
                    }
                } else {
                    return this.$.checked;
                }
            } else if (this.isInput) {
                if (_.isDefined(val)) {
                    this.$.value = val;
                } else {
                    return this.$.value;
                }
            } else {
                return this.text(val);
            }
            return null;
        },
    
        /**
         * Apply elements text content or return current text content if parameter is empty. Has polymorphic behavior.<br>
         *  <ul>
         *     <li>For input next sibling text node will be used,
         *     <li>else underlying element text content will be used.
         *  </ul>
         * @this $
         * @param {string} [text] value.
         */
        text: function (text) {
            if (_.isDefined(text)) {
                if (this.isInput) {
                    if (this.textEl == null) {
                        this.textEl = window.document.createElement('span');
                        this.next(this.textEl);
                    }
                    this.textEl.textContent = text;
                } else {
                    this.$.textContent = text
                }
            } else {
                if (this.isInput) {
                    return this.$.nextSibling.textContent || '';
                } else {
                    return this.$.textContent || '';
                }
            }
            return null;
        },
    
        /**
         * Removes underlying element from document and utilize current object from bind.
         *
         * @this $
         */
        remove: function () {
            var element = this.$;
            var array = this.bind.$;
            array.splice(array.indexOf(this), 1);
            delete this.$;
            delete this.bind;
            delete this._id;
            delete this.isInput;
            delete this.hasCheck;
            delete  this.events;
            q.remove(element);
        },
    
        /**
         * Appends list of elements to current element
         *
         * @this $
         * @param {Node|Array} newElements one or more elements
         */
        next: function (newElements) {
            var index = this.$;
            q.next(index, newElements);
        },
    
        /**
         * Show/hide current element. Uses style display property. Stores last display value to use it for restoring.
         *
         * @this $
         * @param {boolean} show
         */
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
            } else if (string.match(/\d/)) {
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
    
    /**
     * Model object wrapper. In fact is created to extend originally passed object with utilities.
     *
     * @constructor
     * @class model
     * @this model
     * @param {Object} obj
     */
    var model = function (obj) {
        _.extend(this, obj);
    };
    
    model.prototype = _;
    
    /**
     * Execute function in try catch and returns call result or undefined.
     *
     * @param {Function} fn
     * @param {Object} fnThis object that form this reference in function context.
     * @param {boolean} bindReady whether bind on which function is called is ready.
     * @returns Object|undefined
     */
    var safeCall = function (fn, fnThis, bindReady) {
        var res;
        try {
            var args = Array.prototype.slice.call(arguments, 3);
            res = fn.apply(fnThis, args);
        } catch (e) {
            res = undefined;
            if (bindReady) {
                console.warn('Is ready and had an error:' + e.message);
            }
        }
        return res;
    };
    
    /**
     * Function that calculates attribute value.
     *
     * @param {Object} obj object that from this reference in function context.
     * @param {number} idx element index or -1.
     * @param {boolean} bindReady whether bind on which function is called is ready.
     * @returns Object|undefined
     */
    var valueFn = function (obj, idx, bindReady) {
        var name = this.name;
        var val = this.value;
        var property = this.property;
        var values = obj.values;
    
        var findProperty = function (name) {
            if (idx >= 0 && values && _.isDefined(values[idx][name])) {
                return values[idx][name];
            }
            if (idx >= 0 && values && VALUE == name) {
                return values[idx];
            }
            return obj[name]
        };
    
        if (_.isFunction(val)) {
            return safeCall(val, obj, bindReady)
        } else {
            if (property && _.isUndefined(val)) {
                return findProperty(property);
            }
            if (!name) {
                throw new Error("Where is your property?")
            }
            return findProperty(name);
        }
    };
    
    
    /**
     * Bound object wrapper. Represents data manipulation layer and general access to dynamic bindings.
     *
     * @constructor
     * @class bind
     * @this bind
     * @param {string} name tie name
     * @param {Array} dependencies tie dependencies
     * @param {Object} ties already registered ties dictionary
     */
    var bind = function (name, dependencies, ties) {
        this.name = name;
        this.touch = [];
        this.values = {};
        this.depends = dependencies || [];
        this.rendered = false;
        this.loaded = false;
        this.loading = false;
        this.selected = false;
        this.applyCount = 0;
        this.timeout = null;
    
        /**
         * Apply model changes. It renders current bind and updates dependencies.
         *
         * @this bind
         */
        this.$apply = function () {
            this.applyCount++;
            if (this.applyCount > 10) {
                _.debug("Too many apply :" + this.name + " - " + this.applyCount);
            }
            if (this.rendered) {
                this.$render();
            }
            _.forEach(this.touch, function (item) {
                var tie = ties[item];
                if (tie) {
                    tie.obj['$' + this.name] = this.obj;
                }
            }, this);
            if (!this.timeout) {
                this.timeout = setTimeout(function () {
                    this.timeout = null;
                    this.applyCount = 0;
                }.bind(this), 3000);
            }
        };
    };
    
    bind.prototype = {
    
        /**
         * Returns whether bind is ready. I.e. all dependencies are resolved.
         *
         * @this bind
         * @returns boolean
         */
        $ready: function () {
            var ready = true;
            _.forEach(this.depends, function (dep) {
                var d = this.obj['$' + dep];
                if (d._empty) {
                    ready = false;
                    return false;
                }
                return true;
            }, this);
            return ready;
        },
    
        /**
         * Internally checks and updates routes information on current bind.
         *
         * @this bind
         */
        $prepareRoutes: function () {
            var routes = this.obj.routes;
            if (routes) {
                if (_.isArray(routes)) {
                    this.obj.routes = routes._({});
                }
                _.forIn(this.obj.routes, function (route, path) {
                    if (_.isFunction(route)) {
                        route = {path: path, handler: route}
                    } else {
                        route = {path: path}
                    }
                    this.obj.routes[path] = route;
                }, this);
            }
        },
    
        /**
         * Internally checks and updates attributes information on current bind.
         *
         * @this bind
         */
        $prepareAttrs: function () {
            var attrs = this.obj.attrs;
            if (attrs) {
                if (_.isArray(attrs)) {
                    this.obj.attrs = attrs._({});
                }
                _.forIn(this.obj.attrs, function (attr, name) {
                    if (_.isString(attr) && attr[0] == '#') {
                        attr = {name: name, property: attr.substring(1)}
                    } else if (_.isFunction(attr)) {
                        attr = {name: name, value: attr}
                    } else if (attr[ITEM_NAME]) {
                        attr.name = attr[ITEM_NAME];
                    } else {
                        attr = {name: name, value: attr}
                    }
                    this.obj.attrs[name] = attr;
                }, this);
            }
        },
    
    
        $attrValue: function (name, value) {
            if (this.obj.attrs) {
                var attr = this.$attr(name);
                if (_.isUndefined(value)) {
                    if (attr) {
                        return attr.val(this.obj, -1, this.$ready());
                    }
                } else {
                    if (attr && attr.property) {
                        this.obj[attr.property] = value;
                    } else if (attr) {
                        this.obj[name] = value;
                    }
                }
            }
            return null;
        },
    
        $renderAttr: function (elements, attr) {
            _.forEach(elements, function (el) {
                var val = attr.value;
                if (_.isFunction(val)) {
                    var obj = el.pipeline();
                    val = val(obj, el.index);
                }
                el.setAttribute(attr.name, val);
            });
        },
    
        /**
         * Find attribute by name.
         *
         * @this bind
         * @param {string} name
         * @returns Object|null attribute
         */
        $attr: function (name) {
            if (this.obj.attrs) {
                return this.obj.attrs[name];
            }
            return null;
        },
    
        /**
         * Show/hide elements of current bind.
         *
         * @this bind
         * @param {boolean} shown
         */
        $show: function (shown) {
            _.forEach(this.$, function (el) {
                el.show(shown);
            }, this);
        },
    
        /**
         * Renders all elements of current bind. <br>
         * Rendering means particularly check whether bind is loaded and load it if needed, <br>
         * set value for every element attribute and show element if needed.
         *
         * TODO: check whether we can skip attributes value change if element will not be shown.
         *
         */
        $render: function () {
            _.debug("Render " + this.name);
            if (!this.loaded && !this.loading) {
                this.$load();
            }
            var attrs = this.obj.attrs;
            if (attrs) {
                var ready = this.$ready();
                _.forIn(attrs, function (attr) {
                    attr.val = valueFn;
                    this.$renderAttr(this.$, {name: attr.name, value: function (obj, idx) {
                        return attr.val(obj, idx, ready);
                    }.bind(this)});
                }, this);
                this.$renderAttr(this.$, {name: TIED});
                _.forEach(this.$, function (el) {
                    if (el.isInput) {
                        el.setAttribute('name', this.name);
                    }
                }, this);
            }
            this.$show(this.obj.shown);
            this.rendered = true;
            _.debug("Rendered " + this.name);
        }
    
    };
    
    var app = null;
    
    var tie = function () {
        var ties = {};
        return function (name, tiedObject, dependencies) {
            if (name != APP && ties[APP] == null) {
                window.tie(APP, {});
            }
            var r = tie.prototype.init(name, tiedObject, dependencies, ties);
            tie.prototype.define(name, r, ties);
            if (name == APP) {
                app = r;
                routes.init();
                q.ready(function () {
                    routes.locate(ties);
                });
            }
            return r.obj;
        }
    };
    tie.prototype = {
    
        select: function (tieName, bind, ties) {
            var nodes = window.document.querySelectorAll('[' + TIE + '="' + tieName + '"]');
            var res = [];
            _.forEach(nodes, function (el) {
                res.push(new $(el, bind, ties));
            });
            nodes = window.document.querySelectorAll('[' + TIE + '^="' + tieName + '|"]');
            _.forEach(nodes, function (el) {
                res.push(new $(el, bind, ties));
            });
            nodes = window.document.querySelectorAll('[' + TIE + '^="' + tieName + '."]');
            _.forEach(nodes, function (el) {
                res.push(new $(el, bind, ties));
            });
            bind.selected = true;
            return res;
        },
    
        wrapPrimitive: function (obj) {
            return {
                value: obj,
                attrs: [VALUE]
            }
        },
    
        wrapFunction: function (fn) {
            return {
                callback:fn,
                attrs: {
                    value: fn
                }
            }
        },
    
        wrapArray: function (array) {
            return {
                values: array,
                attrs: [VALUE]
            };
        },
    
        check: function (obj) {
            if (_.isFunction(obj)) {
                obj = this.wrapFunction(obj);
            } else if (!_.isObject(obj) || _.isDate(obj)) {
                obj = this.wrapPrimitive(obj);
            } else if (_.isArray(obj)) {
                obj = this.wrapArray(obj);
            }
            if (_.isUndefined(obj.shown)) {
                obj.shown = true;
            }
            if (_.isUndefined(obj.attrs)) {
                obj.attrs = {};
            }
            if (_.isUndefined(obj.routes)) {
                if (app != null && app.obj.routes) {
                    obj.routes = app.obj.routes;
                }
            }
            return new model(obj);
        },
    
        prepare: function (bind) {
            bind.$prepareAttrs();
            bind.$prepareRoutes();
            var values = bind.obj.values;
            var newElements = {};
            var nodes = {};
            if (values) {
                _.forEach(bind.$, function (el) {
                    if(el.index >=0) {
                        el.remove();
                    }
                }, this, true);
                _.forEach(values, function (value, i) {
                    _.forEach(bind.$, function (el) {
                        var id = el._id;
                        var node = nodes[id];
                        if(!node) {
                            nodes[id] = node = el.$;
                        }
                        var newEls = newElements[id];
                        if (!newEls) {
                            newElements[id] = newEls = [];
                        }
                        var newElement = node.cloneNode(true);
                        node.style.display = '';
                        newElement.setAttribute(INDEX, i);
                        newEls.push(newElement);
                    });
                }, this);
                _.forEach(bind.$, function (el) {
                    var node = el.$;
                    node.style.display = 'none';
                    q.next(node, newElements[el._id]);
                });
                bind.selected = false;
            }
        },
    
        prepareDependency: function (bind) {
            var obj = _.extend({}, bind.obj);
            _.forEach(bind.depends, function (dep) {
                delete obj['$' + dep];
            });
            return obj;
        },
    
        resolve: function (bind, dependencies, ties) {
            if (!dependencies) {
                return;
            }
            _.forEach(dependencies, function (dep) {
                var found = ties[dep];
                if (!found) {
                    found = {name: dep, touch: [], obj: {_empty: true}};
                    this.define(dep, found, ties);
                }
                bind.obj['$' + dep] = this.prepareDependency(found);
                if (found.touch.indexOf(bind.name) == -1) {
                    found.touch.push(bind.name);
                }
            }, this);
        },
    
        define: function (name, bind, ties) {
            var old = ties[name];
            ties[name] = bind;
            if (old && old.touch) {
                bind.touch = old.touch;
                bind.rendered = old.rendered;
                bind.$apply();
            }
        },
    
        init: function (name, tiedObject, dependencies, ties) {
            _.debug("Tie " + name);
            var r = new bind(name, dependencies, ties);
            _.debug("Bind ready");
            r.obj = this.check(tiedObject);
            _.debug("Model checked");
            this.resolve(r, dependencies, ties);
            _.debug("Dependencies resolved");
            r.obj = proxy(r);
            _.debug("Model proxy done");
            var tie = this;
            r.$load = function () {
                this.loading = true;
                if (!this.selected) {
                    this.$ = tie.select(name, r, ties);
                    _.debug("Elements selected: " + this.$.length);
                }
                tie.prepare(this);
                _.debug("Prepared inner structure");
                if (!this.selected) {
                    this.$ = tie.select(name, r, ties);
                    _.debug("Elements reselected: " + this.$.length);
                }
                this.loaded = true;
                this.loading = false;
            };
            return r;
        }
    };


    /**
     * Exports
     */
    window.tie = tie();
    window.tie.pipes = pipes;


    /**
     * Property pipeline definition
     */
    window.tie("property", function (obj, params, value) {
        if (params) {
            var prop = params[0];
            var target = params.length > 1 ? params[1] : VALUE;
            if (_.isUndefined(value)) {
                obj[target] = obj[prop];
            } else {
                obj[prop] = value;
            }
        }
        return obj;
    });

})(window);
