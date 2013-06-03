var app = null;

var tie = function () {
    var ties = {};
    return function (name, tiedObject, dependencies) {
        if (name != APP && ties[APP] == null) {
            throw new Error('Please define your app tie first');
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
        var nodes = window.document.querySelectorAll('[data-tie="' + tieName + '"]');
        var res = [];
        _.forEach(nodes, function (el) {
            res.push(new $(el, tied));
        });
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
            attrs: [
                {name: 'value', value: fn}
            ]
        }
    },

    wrapArray: function (array) {
        var checked = this.checkArray(array);
        return {
            values: checked,
            attrs: ['value']
        };
    },

    checkArray: function (array) {
        var checked = [];
        _.forEach(array, function (item) {
            var o = this.check(item);
            o._id = _.uid();
            checked.push(o);
        }, this);
        return checked;
    },

    check: function (obj) {
        if (_.isFunction(obj)) {
            obj = this.wrapFunction(obj);
        } else if (!_.isObject(obj) || _.isDate(obj)) {
            obj = this.wrapPrimitive(obj);
        } else if (_.isArray(obj)) {
            obj = this.wrapArray(obj);
        }
        if (_.isDefined(obj.values)) {
            obj.values = this.checkArray(obj.values);
        }
        if (_.isUndefined(obj.shown)) {
            obj.shown = true;
        }
        if (_.isUndefined(obj.attrs)) {
            obj.attrs = [];
        }
        if (_.isUndefined(obj.routes)) {
            if (app != null) {
                obj.routes = app.obj.routes;
            } else {
                obj.routes = ['/'];
            }
        }
        return new model(obj);
    },

    prepare: function (bind, dependencies, ties) {
        var values = bind.obj.values;
        var lastNodes = {};
        if (values) {
            _.forEach(values, function (value, i) {
                var name = bind.name + "_" + i;
                _.forEach(bind.$, function (el) {
                    var node = el.$;
                    node.style.display = 'none';
                    var lastNode = lastNodes[el._id];
                    if (!lastNode) {
                        lastNode = node;
                    }
                    var newElement = node.cloneNode(true);
                    newElement.setAttribute('data-tie', name);
                    newElement.style.display = null;
                    q.next(lastNode, newElement);
                    lastNodes[el._id] = newElement;
                });
                _.extend(value.attrs, bind.obj.attrs);
                bind.values[value._id] = this.init(name, value, dependencies, ties);
            }, this);
        }
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
            bind.$apply();
        }
    },

    init: function (name, tiedObject, dependencies, ties) {
        var r = new bind(name, dependencies, ties);
        r.obj = this.check(tiedObject);
        r.$ = this.select(name, r);
        this.resolve(r, dependencies, ties);
        r.obj = proxy(r);
        this.prepare(r, dependencies, ties);
        return r;
    }
};