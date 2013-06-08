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

    select: function (tieName, tied) {
        var nodes = window.document.querySelectorAll('[' + TIE + '="' + tieName + '"]');
        var res = [];
        _.forEach(nodes, function (el) {
            res.push(new $(el, tied));
        });
        tied.selected = true;
        return res;
    },

    wrapPrimitive: function (obj) {
        return {
            value: obj,
            attrs: ['value']
        }
    },

    wrapFunction: function (fn) {
        return {
            attrs: {
                value: fn
            }
        }
    },

    wrapArray: function (array) {
        return {
            values: array,
            attrs: ['value']
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
        if (values) {
            _.forEach(values, function (value, i) {
                _.forEach(bind.$, function (el) {
                    if(el.index >=0) {
                        el.remove();
                    }
                    var node = el.$;
                    var newEls = newElements[el._id];
                    if (!newEls) {
                        newElements[el._id] = newEls = [];
                    }
                    var newElement = node.cloneNode(true);
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
            bind.obj['$' + dep] = found.obj;
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
            if (!this.selected) {
                this.$ = tie.select(name, r);
                _.debug("Elements selected: " + this.$.length);
            }
            tie.prepare(this);
            _.debug("Prepared inner structure");
            if (!this.selected) {
                this.$ = tie.select(name, r);
                _.debug("Elements reselected: " + this.$.length);
            }
            this.loaded = true;
        };
        return r;
    }
};