var model = function (obj) {
    _.extend(this, obj);
};

model.prototype = _;

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

var valueFn = function (obj, bindReady) {
    var name = this.name;
    var val = this.value;
    var property = this.property;
    if (_.isFunction(val)) {
        val = safeCall(val, obj, bindReady)
    } else {
        if (property && _.isUndefined(val)) {
            val = obj[property];
        }
        if (!name) {
            throw new Error("Where is your export?")
        }
        if (_.isUndefined(property) && _.isUndefined(val)) {
            val = obj[name];
        }
    }
    return val;
};

var bind = function (name, dependencies, ties) {
    this.name = name;
    this.touch = [];
    this.values = {};
    this.depends = dependencies || [];
    this.rendered = false;
    this.applyCount = 0;
    this.$apply = function () {
        this.applyCount++;
        if(this.applyCount > 10) {
            console.warn("Too many apply :" + this.name  +" - "+ this.applyCount);
        }
        if (this.rendered) {
            this.$render();
        }
        _.forEach(this.touch, function (item) {
            var tie = ties[item];
            if(tie){
                tie.obj['$' + this.name] = this.obj;
            }
        }, this);
    };
};

bind.prototype = {
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
        var v = null;
        if (this.obj.attrs) {
            var attr = this.$attr(name);
            if (_.isUndefined(value)) {
                if (attr) {
                    v = attr.val(this.obj, this.$ready());
                }
            } else {
                if (attr && attr.property) {
                    this.obj[attr.property] = value;
                }
            }
        }
        return v;
    },
    $attr: function (name) {
        if (this.obj.attrs) {
            return this.obj.attrs[name];
        }
        return null;
    },
    $attrs: function (elements, attr) {
        _.forEach(elements, function (el) {
            el.setAttribute(attr.name, attr.value);
        });
    },
    $show: function (shown) {
        _.forEach(this.$, function (el) {
            el.show(shown);
        }, this);
        _.forIn(this.values, function (value) {
            value.$show(shown);
        });
    },
    $render: function () {
        var values = this.obj.values;
        if (values) {
            _.forEach(values, function (value) {
                var r = this.values[value._id];
                if (r) {
                    var oldName = r.name;
                    r.name = this.name;
                    r.$render();
                    r.name = oldName;
                }
            }, this)
        } else {
            var attrs = this.obj.attrs;
            if (attrs) {
                _.forIn(attrs, function (attr) {
                    attr.val = valueFn;
                    this.$attrs(this.$, {name: attr.name, value: attr.val(this.obj, this.$ready())});
                }, this);
                this.$attrs(this.$, {name: 'data-tied'});
                _.forEach(this.$, function (el) {
                    if (el.isInput) {
                        el.setAttribute('name', this.name);
                    }
                }, this);
            }
        }
        this.$show(this.obj.shown);
        this.rendered = true;
    }

};