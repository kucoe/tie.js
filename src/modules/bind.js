var model = function (obj) {
    _.extend(this, obj);
};

model.prototype = _;

var bind = function (name, dependencies, ties) {
    this.name = name;
    this.touch = [];
    this.values = {};
    this.depends = dependencies || [];
    this.rendered = false;
    this.$apply = function () {
        this.$render();
        _.forEach(this.touch, function (item) {
            var tie = ties[item];
            tie.obj['$' + this.name] = this.obj;
            tie.$render();
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
    $attrValue: function (name, value) {
        var v = null;
        if (this.obj.attrs) {
            var attr = this.$attr(name);
            if (_.isUndefined(value)) {
                if (attr) {
                    v = attr.val(this.obj);
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
        var res = null;
        if (this.obj.attrs) {
            _.forEach(this.obj.attrs, function (attr) {
                if (_.isObject(attr) && attr.name === name) {
                    res = attr;
                    return false;
                }
                return true;
            });
        }
        return res;
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
        for (var id in  this.values) {
            if (this.values.hasOwnProperty(id)) {
                var value = this.values[id];
                value.$show(shown);
            }
        }
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
                var self = this;
                var valueFn = function (obj) {
                    var name = this.name;
                    var val = this.value;
                    var property = this.property;
                    if (typeof val === "function") {
                        try {
                            val = val.call(obj);
                        } catch (e) {
                            val = undefined;
                            if (self.$ready()) {
                                console.warn('Is ready and had an error:' + e.message);
                            }
                        }
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
                _.forEach(attrs, function (attr) {
                    if (_.isString(attr)) {
                        attr = {
                            name: attr
                        };
                    }
                    attr.val = valueFn;
                    var name = attr.name;
                    this.$attrs(this.$, {name: name, value: attr.val(this.obj)});
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