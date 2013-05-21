(function (window) {
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
                                    val = r[property];
                                }
                            }
                            if(!name) {
                               throw new Error("Where is your helm?")
                            }
                            if (!property && !val) {
                                val = r[name];
                            }
                            if(r.$) {
                                if ('text' === name) {
                                    r.$.innerHTML = val;
                                } else {
                                    r.$.setAttribute(name, val);
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
})(window);