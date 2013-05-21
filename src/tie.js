(function (window) {

    if (!Object.prototype.watch) {
        Object.prototype.watch = function (prop, handler) {
            var newGet, newSet;
            var desc = Object.getOwnPropertyDescriptor(this, prop);
            if (!desc.configurable ||  desc.writable === false
                || (desc.value === undefined && !desc.set))  {
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

    var utils = {
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
        }
    };

    var tie = function () {
        var ties = {};
        return function (name, tiedObject, dependencies) {
            return tie.prototype.init(name, tiedObject, dependencies, ties);
        }
    };
    tie.prototype = {

        select: function (tieName) {
            var nodes = window.document.querySelectorAll('[data-tie="' + tieName + '"]');
            if (nodes.length > 0) {
                return nodes[0];
            }
            return null;
        },

        wrap: function (obj) {
            return {
                value: obj,
                helm: ['value']
            }
        },

        deep: function (obj) {
            if (!utils.isObject(obj) || utils.isDate(obj)) {
                return this.wrap(obj);
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
                    tied._[dep] = ties[dep]._;
                }
            }
        },

        init: function (name, tiedObject, dependencies, ties) {
            var r = {
                _: this.deep(tiedObject),
                $: this.select(name),
                render: function () {
                    var helm = this._.helm;
                    if (helm) {
                        for (var i = 0; i < helm.length; i++) {
                            var attr = helm[i];
                            var name;
                            if (utils.isString(attr)) {
                                name = attr;
                            } else if (utils.isObject(attr)) {
                                name = attr.name;
                                var val = attr.value;
                                var property = attr.property;
                                if (typeof val === "function") {
                                    val = val.call(r, this._);
                                }
                                if (property && !val) {
                                    val = this._[property];
                                }
                            }
                            if (!name) {
                                throw new Error("Where is your helm?")
                            }
                            if (!property && !val) {
                                val = this._[name];
                            }
                            if (this.$) {
                                if ('text' === name) {
                                    this.$.innerHTML = val;
                                } else {
                                    this.$.setAttribute(name, val);
                                }
                            }
                        }
                    }
                }

            };
            this.resolve(r, dependencies, ties);
            ties[name] = r;
            r.render();
            return r;
        }
    };
    window.tie = tie();
})
    (window);