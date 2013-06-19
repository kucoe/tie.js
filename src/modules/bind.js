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
 * Return or override attribute value on current bound
 *
 * @this bind
 * @param {string} name attribute object
 * @param {*} value attribute object
 */
model.prototype.$attr = function (name, value) {
    if (this.attrs) {
        var attr = this.attrs[name];
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

/**
 * Return or override property value on current bound
 *
 * @this bind
 * @param {string} name property object like "name.length"
 * @param {*} value property object
 */
model.prototype.$prop = function (name, value) {
    var res = this;
    var split = name.split('.');
    var i = 1;
    var length = split.length;
    while (i < length) {
        res = res[split[i - 1]];
        i++;
    }
    var last = split[length - 1];
    if (_.isUndefined(value)) {
        return res[last];
    } else {
        res[last] = value;
    }
    return null;
};

/**
 * Returns whether bind is ready. I.e. all dependencies are resolved.
 *
 * @this bind
 * @returns boolean
 */
model.prototype.$ready = function () {
    var ready = true;
    _.forEach(this.$deps, function (dep) {
        var d = this['$' + dep];
        if (d._empty) {
            ready = false;
            return false;
        }
        return true;
    }, this);
    return ready;
};


/**
 * Execute function in try catch and returns call result or undefined.
 *
 * @param {Function} fn
 * @param {Object} fnThis object that form this reference in function context.
 * @param {boolean} [bindReady] whether bind on which function is called is ready.
 * @returns Object|undefined
 */
var safeCall = function (fn, fnThis, bindReady) {
    var res;
    var spliceArgs = 3;
    if (_.isUndefined(bindReady) && _.isFunction(fnThis.$ready)) {
        bindReady = fnThis.$ready();
        spliceArgs = 2;
    }
    try {
        var args = Array.prototype.slice.call(arguments, spliceArgs);
        res = fn.apply(fnThis, args);
    } catch (e) {
        res = undefined;
        if (bindReady) {
            console.groupCollapsed("User code error");
            console.error('Is ready and had an error:' + e.message);
            console.dir(e);
            console.groupEnd();
        }
    }
    return res;
};

/**
 * Function that returns either property from object or from values array.
 *
 * @param {model} obj object that used to search for property.
 * @param {string} name property name.
 * @param {number} [idx = -1] element index or -1.
 * @returns Object|undefined
 */
var findProperty = function (obj, name, idx) {
    if (_.isUndefined(idx)) {
        idx = -1;
    }
    var values = obj.values;
    if (idx >= 0 && values && _.isDefined(values[idx][name])) {
        return values[idx][name];
    }
    if (idx >= 0 && values && VALUE == name) {
        return values[idx];
    }
    return obj.$prop(name);
};

/**
 * Function that calculates attribute value.
 *
 * @param {model} obj object that from this reference in function context.
 * @param {number} [idx = -1] element index or -1.
 * @param {boolean} [bindReady] whether bind on which function is called is ready.
 * @returns Object|undefined
 */
var valueFn = function (obj, idx, bindReady) {
    var name = this.name;
    var val = this.value;
    var property = this.property;

    if (_.isUndefined(bindReady)) {
        bindReady = obj.$ready();
    }

    if (_.isFunction(val)) {
        return safeCall(val, obj, bindReady)
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
    this.e = 0;

    /**
     * Apply model changes. It renders current bind and updates dependencies.
     *
     * @this bind
     */
    this.apply = function () {
        this.applyCount++;
        if (this.applyCount > 10) {
            _.debug("Too many apply :" + this.name + " - " + this.applyCount);
        }
        if (this.rendered) {
            this.render();
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
     * Internally checks and updates routes information on current bind.
     *
     * @this bind
     */
    prepareRoutes: function () {
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
    prepareAttrs: function () {
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
                    attr = {name: attr[ITEM_NAME]};
                } else {
                    attr = {name: name, value: attr}
                }
                attr.val = valueFn;
                this.obj.attrs[name] = attr;
            }, this);
        }
    },

    /**
     * Internally checks and updates values array current bind.
     *
     * @this bind
     */
    prepareValues: function () {
        var values = this.obj.values;
        if (values) {
            if (this.$.length - this.e == values.length) {
                this.rendered = false;
                return;
            }
            var newElements = {};
            var nodes = {};
            _.forEach(this.$, function (el) {
                if (el.index >= 0) {
                    el.remove();
                }
            }, this, true);
            _.forEach(values, function (value, i) {
                _.forEach(this.$, function (el) {
                    var id = el._id;
                    var node = nodes[id];
                    if (!node) {
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
            _.forEach(this.$, function (el) {
                var node = el.$;
                node.style.display = 'none';
                q.next(node, newElements[el._id]);
            });
            this.selected = false;
        }
    },

    /**
     * Show/hide elements of current bind.
     *
     * @this bind
     * @param {boolean} shown
     */
    show: function (shown) {
        if (this.rendered) {
            _.forEach(this.$, function (el) {
                if (el) {
                    el.show(shown);
                }
            }, this);
        }
    },

    /**
     * Check elements show rules
     *
     * @this bind
     */
    validateShow: function () {
        if (!this.loaded && !this.loading) {
            this.load();
        }
        _.forEach(this.$, function (el) {
            if (el) {
                var shown = el.pipeline().$shown;
                if (shown && !this.rendered) {
                    this.render();
                }
                el.show(shown);
            }
        }, this);
    },

    /**
     * Renders all elements of current bind. <br>
     * Rendering means particularly check whether bind is loaded and load it if needed, <br>
     * set value for every element attribute and show element if needed.
     */
    render: function () {
        if (!this.obj.$shown) {
            return;
        }
        _.debug("Render " + this.name, this.name + " Render");
        if (!this.loaded && !this.loading) {
            this.load();
        }
        _.forEach(this.$, function (el) {
            if (el) {
                var obj = el.pipeline();
                var ready = obj.$ready();
                var attrs = obj.attrs;
                var idx = el.index;
                if (attrs) {
                    _.forIn(attrs, function (attr) {
                        var val = attr.val(obj, idx, ready);
                        var name = attr.name;
                        _.debug("Render attribute '" + name + "' with value " + val);
                        el.setAttribute(name, val);
                    });
                    el.setAttribute(TIED);
                    if (el.isInput) {
                        el.setAttribute('name', this.name);
                    }
                }
            }
        }, this);
        this.show(this.obj.$shown);
        this.rendered = true;
        _.debug("Rendered " + this.name);
    }

};