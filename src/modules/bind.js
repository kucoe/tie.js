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
        if(obj.hasOwnProperty(name)) {
            return obj[name]
        }
        return null;
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
     * Returns whether bind is ready. I.e. all dependencies are resolved.
     *
     * @this bind
     * @returns boolean
     */
    ready: function () {
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
                    attr.name = attr[ITEM_NAME];
                } else {
                    attr = {name: name, value: attr}
                }
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
     * Return or override attribute value on current bound
     *
     * @this bind
     * @param {string} name attribute object
     * @param {*} value attribute object
     */
    attrValue: function (name, value) {
        if (this.obj.attrs) {
            var attr = this.attr(name);
            if (_.isUndefined(value)) {
                if (attr) {
                    return attr.val(this.obj, -1, this.ready());
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

    /**
     * Set attributes over all bound elements
     *
     * @this bind
     * @param {string} name attribute object
     * @param {*} [value] attribute object
     */
    renderAttr: function (name, value) {
        _.forEach(this.$, function (el) {
            var val = value;
            if (_.isFunction(value)) {
                var obj = el.pipeline();
                val = value(obj, el.index);
            }
            el.setAttribute(name, val);
        });
    },

    /**
     * Find attribute by name.
     *
     * @this bind
     * @param {string} name
     * @returns Object|null attribute
     */
    attr: function (name) {
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
    show: function (shown) {
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
    render: function () {
        if(!this.obj.shown) {
            return;
        }
        _.debug("Render " + this.name);
        if (!this.loaded && !this.loading) {
            this.load();
        }
        var attrs = this.obj.attrs;
        if (attrs) {
            var ready = this.ready();
            _.forIn(attrs, function (attr) {
                attr.val = valueFn;
                this.renderAttr(attr.name, function (obj, idx) {
                    return attr.val(obj, idx, ready);
                }.bind(this));
            }, this);
            this.renderAttr(TIED);
            _.forEach(this.$, function (el) {
                if (el.isInput) {
                    el.setAttribute('name', this.name);
                }
            }, this);
        }
        this.show(this.obj.shown);
        this.rendered = true;
        _.debug("Rendered " + this.name);
    }

};