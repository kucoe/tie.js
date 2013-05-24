(function (window) {

    if (!Object.prototype.watch) {
        Object.prototype.watch = function (prop, handler) {
            var newGet, newSet;
            var desc = Object.getOwnPropertyDescriptor(this, prop);
            if (!desc.configurable || desc.writable === false
                || (desc.value === undefined && !desc.set)) {
                return;
            }
            if (desc.value) {
                var val = desc.value;
                newGet = function () {
                    return val;
                };
                newSet = function (newVal) {
                    val = handler.call(this, prop, val, newVal);
                };
                newSet._watchHelper = {
                    initialType: "dataDescriptor"
                };
            } else {
                newGet = desc.get;
                newSet = function (newVal) {
                    val = handler.call(this, prop, val, newVal);
                    desc.set.call(this, val);
                };
                newSet._watchHelper = {
                    initialType: "accessorDescriptor",
                    oldDesc: desc
                };
            }
            Object.defineProperty(this, prop, {
                get: newGet,
                set: newSet,
                configurable: true,
                enumerable: desc.enumerable
            });
        };
    }
    if (!Object.prototype.unwatch) {
        Object.prototype.unwatch = function (prop) {
            var desc = Object.getOwnPropertyDescriptor(this, prop);
            if (desc.set._watchHelper) {
                if (desc.set._watchHelper.initialType == "dataDescriptor") {
                    Object.defineProperty(this, prop, {
                        value: this[prop],
                        enumerable: desc.enumerable,
                        configurable: true,
                        writable: true
                    });
                } else {
                    Object.defineProperty(this, prop, {
                        get: desc.get,
                        set: desc.set._watchHelper.oldDesc.set,
                        enumerable: desc.enumerable,
                        configurable: true
                    });
                }
            }
        };
    }

    var crux = function (el, scope, skipHandler) {
        var main = this;
        if (!skipHandler) {
            var listener = function () {
                var value = main.value();
                value = utils.trim(value);

                if (scope.$value() !== value) {
                    scope.$apply(value);
                }
            };

            if (env.hasEvent('input')) {
                el.addEventListener('input', listener);
            } else {
                el.addEventListener('keydown', function (event) {
                    var key = event.keyCode;
                    // ignore
                    //    command            modifiers                   arrows
                    if (key === 91 || (15 < key && key < 19) || (37 <= key && key <= 40)) {
                        return;
                    }
                    listener();
                });
                // if user paste into input using mouse, we need "change" event to catch it
                el.addEventListener('change', listener, false);
                // if user modifies input value using context menu in IE, we need "paste" and "cut" events to catch it
                if (env.hasEvent('paste')) {
                    el.addEventListener('paste', listener, false);
                    el.addEventListener('cut', listener, false);
                }
            }
        }
        this.$ = el;
    };

    crux.prototype = {
        setAttribute: function (name, value) {
            if ('value' === name) {
                this.value(value);
            } else {
                this.$.setAttribute(name, value);
            }
        },

        value: function (val) {
            var v;
            if (utils.isDefined(this.$.value)) {
                if (utils.isDefined(val)) {
                    this.$.value = val;
                } else {
                    v = this.$.value;
                }
            } else {
                if (utils.isDefined(val)) {
                    this.$.innerHTML = val;
                } else {
                    v = this.$.innerHTML;
                }
            }
            return v;
        }
    };

    var utils = {
        valueFn: function (value) {
            return function () {
                return value;
            };
        },

        isUndefined: function (value) {
            return typeof value == 'undefined';
        },

        isDefined: function (value) {
            return typeof value != 'undefined';
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
            return Object.prototype.toString.apply(value) == '[object Array]';
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
        }
    };

    var env = (function () {
        var eventSupport = {};
        var msie = utils.toInt((/msie (\d+)/.exec(utils.lowercase(navigator.userAgent)) || [])[1]);

        return {
            hasEvent: function (event) {
                // IE9 implements 'input' event it's so fubared that we rather pretend that it doesn't have
                // it. In particular the event is not fired when backspace or delete key are pressed or
                // when cut operation is performed.
                if (event == 'input' && msie == 9) return false;

                if (utils.isUndefined(eventSupport[event])) {
                    var divElm = document.createElement('div');
                    eventSupport[event] = 'on' + event in divElm;
                }

                return eventSupport[event];
            }
        }
    })();


    var tie = function () {
        var ties = {};
        return function (name, tiedObject, dependencies) {
            return tie.prototype.init(name, tiedObject, dependencies, ties);
        }
    };
    tie.prototype = {

        select: function (tieName, obj) {
            var nodes = window.document.querySelectorAll('[data-tie="' + tieName + '"]');
            var res = [];
            for (var i = 0; i < nodes.length; i++) {
                var el = nodes[i];
                res.push(new crux(el, obj));
            }
            return res;
        },

        attr: function (elements, attr) {
            for (var i = 0; i < elements.length; i++) {
                var el = elements[i];
                el.setAttribute(attr.name, attr.value);
            }
        },

        wrap: function (obj) {
            return {
                value: obj,
                helm: ['value']
            }
        },

        deep: function (obj) {
            if (!utils.isObject(obj) || utils.isDate(obj)) {
                obj = this.wrap(obj);
            }
            return obj;
        },

        resolve: function (tied, dependencies, ties) {
            if (!dependencies) {
                return;
            }
            for (var i = 0; i < dependencies.length; i++) {
                var dep = dependencies[i];
                if (ties[dep]) {
                    var found = ties[dep];
                    tied._[dep] = found._;
                    if (found) {
                        if (found.touch.indexOf(tied.name) == -1) {
                            found.touch.push(tied.name);
                        }
                    }
                }
            }
        },

        init: function (name, tiedObject, dependencies, ties) {
            var r = {
                name: name,
                tie: this,
                touch: [],
                valueAttr: null,
                $value: function () {
                    var v = this._.value;
                    if (!v && this.valueAttr) {
                        v = this.valueAttr.val(this._);
                    }
                    return v;
                },
                $apply: function (value) {
                    if (utils.isDefined(this._.value)) {
                        this._.value = value;
                    } else if (this.valueAttr && this.valueAttr.property) {
                        this._[this.valueAttr.property] = value;
                    }
                    for (var i = 0; i < this.touch.length; i++) {
                        ties[this.touch[i]].render();
                    }
                },
                render: function () {
                    var helm = this._.helm;
                    if (helm) {
                        for (var i = 0; i < helm.length; i++) {
                            var attr = helm[i];
                            if (utils.isString(attr)) {
                                attr = {
                                    name: attr
                                };
                            }
                            attr.val = function (obj) {
                                var name = this.name;
                                var val = this.value;
                                var property = this.property;
                                if (typeof val === "function") {
                                    val = val.call(obj);
                                }
                                if (property && !val) {
                                    val = obj[property];
                                }
                                if (!name) {
                                    throw new Error("Where is your helm?")
                                }
                                if (!property && !val) {
                                    val = obj[name];
                                }
                                return val;
                            };

                            var name = attr.name;
                            this.tie.attr(this.$, {name: name, value: attr.val(this._)});

                            if (name === 'value') {
                                this.valueAttr = attr;
                            }
                        }
                    }
                }

            };
            r._ = this.deep(tiedObject);
            r.$ = this.select(name, r);
            this.resolve(r, dependencies, ties);
            ties[name] = r;
            r.render();
            return r;
        }
    };
    window.tie = tie();
    window.tie.utils = utils;
    window.tie.env = env;
})
    (window);