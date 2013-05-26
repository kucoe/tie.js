(function (window) {

    var VALUE = 'value';

    var proxy = function (tie) {
        var obj = tie._;
        var watch = function (desc, prop) {
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
                return tie.$attrValue(prop);
            };
            var newSet = function (val) {
                if (desc) {
                    if (desc.set) {
                        desc.set.call(this, val);
                    } else {
                        desc.value = val;
                    }
                }
                tie.$apply();
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

        var props = [];

        for (var prop in obj) {
            props.push(prop);
            if ('attrs' === prop) {
                continue; // skip attributes
            }
            var desc = Object.getOwnPropertyDescriptor(obj, prop);
            if (desc._proxyMark) {
                continue; //skip already processed
            }
            if (!desc.configurable || (desc.value === undefined && !desc.set) || desc.writable === false) {
                continue; // skip readonly
            }
            watch(desc, prop);
        }
        if (obj.attrs) {
            _.forEach(obj.attrs, function (attr) {
                if (_.isString(attr)) {
                    attr = {
                        name: attr
                    };
                }
                var prop = attr.name;
                if (props.indexOf(prop) == -1 || attr.property || attr.value) {
                    watch(null, prop);
                }
            }, this);
        }
        return obj;
    };

    var $ = function (el, obj) {
        var main = this;
        var listener = function () {
            var value = main.value();
            value = _.trim(value);

            if (obj[VALUE] !== value) {
                obj[VALUE] = value;
            }
        };
        //TODO fix the mess
        if (_.isDefined(el.value) && env.hasEvent('input')) {
            el.addEventListener('input', listener);
        } else {
            el.addEventListener('change', listener);
        }
        this.$ = el;
    };

    $.prototype = {
        setAttribute: function (name, value) {
            if (VALUE === name) {
                this.value(value);
            } else {
                this.$.setAttribute(name, value);
            }
        },

        value: function (val) {
            var v;
            if (_.isDefined(this.$.value)) {
                if (_.isDefined(val)) {
                    this.$.value = val;
                } else {
                    v = this.$.value;
                }
            } else {
                if (_.isDefined(val)) {
                    this.$.innerHTML = val;
                } else {
                    v = this.$.innerHTML;
                }
            }
            return v;
        }
    };

    var _ = {

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

        forEach: function (collection, callback, thisArg) {
            if (callback && this.isCollection(collection)) {
                if (!thisArg) {
                    thisArg = this;
                }
                var index = -1;
                var length = collection.length;

                while (++index < length) {
                    if (callback.call(thisArg, collection[index], index, collection) === false) {
                        break;
                    }
                }
            }
            return collection;
        }
    };

    var env = (function () {
        var eventSupport = {};
        var msie = _.toInt((/msie (\d+)/.exec(_.lowercase(navigator.userAgent)) || [])[1]);

        return {
            hasEvent: function (event) {
                // IE9 implements 'input' event it's so fubared that we rather pretend that it doesn't have
                // it. In particular the event is not fired when backspace or delete key are pressed or
                // when cut operation is performed.
                if (event == 'input' && msie == 9) return false;

                if (_.isUndefined(eventSupport[event])) {
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
            _.forEach(nodes, function (el) {
                res.push(new $(el, obj));
            });
            return res;
        },

        attr: function (elements, attr) {
            _.forEach(elements, function (el) {
                el.setAttribute(attr.name, attr.value);
            });
        },

        wrap: function (obj) {
            return {
                value: obj,
                attrs: ['value']
            }
        },

        check: function (obj) {
            if (!_.isObject(obj) || _.isDate(obj)) {
                obj = this.wrap(obj);
            }
            return obj;
        },

        resolve: function (tied, dependencies, ties) {
            if (!dependencies) {
                return;
            }
            _.forEach(dependencies, function (dep) {
                var found = ties[dep];
                if (found) {
                    tied._[dep] = found._;
                    if (found) {
                        if (found.touch.indexOf(tied.name) == -1) {
                            found.touch.push(tied.name);
                        }
                    }
                }
            });
        },

        init: function (name, tiedObject, dependencies, ties) {
            var r = {
                name: name,
                tie: this,
                touch: [],
                $attrValue: function (name, value) {
                    var v = null;
                    if (this._.attrs) {
                        var attr = this.$attr(name);
                        if (_.isUndefined(value)) {
                            if (attr) {
                                v = attr.val(this._);
                            }
                        } else {
                            if (attr && attr.property) {
                                if (_.isUndefined(value)) {
                                    delete this._[this.attr.property];
                                } else {
                                    this._[this.attr.property] = value;
                                }
                            }
                        }
                    }
                    return v;
                },
                $apply: function () {
                    _.forEach(this.touch, function (item) {
                        var tie = ties[item];
                        tie._[this.name] = this._;
                        tie.$apply();
                        tie.render();
                    }, this);
                },
                $attr: function (name) {
                    var res = null;
                    if (this._.attrs) {
                        _.forEach(this._.attrs, function (attr) {
                            if (_.isObject(attr) && attr.name === name) {
                                res = attr;
                                return false;
                            }
                            return true;
                        });
                    }
                    return res;
                },
                render: function () {
                    var attrs = this._.attrs;
                    if (attrs) {
                        var valueFn = function (obj) {
                            var name = this.name;
                            var val = this.value;
                            var property = this.property;
                            if (typeof val === "function") {
                                val = val.call(obj);
                            }
                            if (property && _.isUndefined(val)) {
                                val = obj[property];
                            }
                            if (!name) {
                                throw new Error("Where is your export?")
                            }
                            if (_.isUndefined(property) && _.isUndefined(val)) {
                                val = obj[name];
                            }
                            return val;
                        };
                        _.forEach(attrs, function (attr) {
                            if (_.isString(attr)) {
                                attr = {
                                    name: attr
                                };
                            }
                            attr.val = valueFn;
                            var name = attr.name;
                            this.tie.attr(this.$, {name: name, value: attr.val(this._)});
                        }, this)
                    }
                }

            };
            r._ = this.check(tiedObject);
            r._ = proxy(r);
            r.$ = this.select(name, r._);
            this.resolve(r, dependencies, ties);
            ties[name] = r;
            r.render();
            return r;
        }
    };
    window.tie = tie();
    window.tie.utils = _;
    window.tie.env = env;
})
    (window);