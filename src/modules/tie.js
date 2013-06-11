/**
 * Application reference.
 */
var app = null;

/**
 * Returns function to apply ties with closure ties dictionary.
 */
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

    /**
     * Select DOM elements which are bound to current tie. Using 'data-tie' attribute. <br/>
     *
     * @param {string} tieName name of current tie
     * @param {bind} bind current tie bind
     * @param {Object} ties registered ties
     */
    select: function (tieName, bind, ties) {
        var nodes = window.document.querySelectorAll('[' + TIE + '="' + tieName + '"]');
        var res = [];
        _.forEach(nodes, function (el) {
            res.push(new $(el, bind, ties));
        });
        nodes = window.document.querySelectorAll('[' + TIE + '^="' + tieName + '|"]');
        _.forEach(nodes, function (el) {
            res.push(new $(el, bind, ties));
        });
        nodes = window.document.querySelectorAll('[' + TIE + '^="' + tieName + '."]');
        _.forEach(nodes, function (el) {
            res.push(new $(el, bind, ties));
        });
        bind.selected = true;
        return res;
    },

    /**
     * Create object based on primitive value
     *
     * @param {Object} obj primitive
     */
    wrapPrimitive: function (obj) {
        return {
            value: obj,
            attrs: [VALUE]
        }
    },

    /**
     * Create object based on function
     *
     * @param {Function} fn
     */
    wrapFunction: function (fn) {
        return {
            callback:fn,
            attrs: {
                value: fn
            }
        }
    },

    /**
     * Create object based on array
     *
     * @param {Array} array
     */
    wrapArray: function (array) {
        return {
            values: array,
            attrs: [VALUE]
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
            bind.apply();
        }
    },

    init: function (name, tiedObject, dependencies, ties) {
        _.debug("Tie " + name);
        var r = new bind(name, dependencies, ties);
        r.obj = this.check(tiedObject);
        r.prepareAttrs();
        r.prepareRoutes();
        this.resolve(r, dependencies, ties);
        r.obj = proxy(r);
        _.debug("Bind model ready");
        var tie = this;
        r.load = function () {
            this.loading = true;
            if (!this.selected) {
                this.$ = tie.select(name, r, ties);
                _.debug("Elements selected: " + this.$.length);
            }
            r.prepareValues();
            _.debug("Prepared inner array structure");
            if (!this.selected) {
                this.$ = tie.select(name, r, ties);
                _.debug("Elements reselected: " + this.$.length);
            }
            this.loaded = true;
            this.loading = false;
        };
        return r;
    }
};