/**
 * Application reference.
 */
var app = null;

/**
 * Returns function to apply ties with closure ties dictionary.
 *
 * @return {Function} tie(name, object, [dependencies Array])
 */
var tie = function () {
    var ties = {};
    return function (name, tiedObject, dependencies) {
        if (name != APP && ties[APP] == null) {
            window.tie(APP, {});
        }
        var prev = ties[name];
        if (prev && !prev.obj._empty && (_.isUndefined(dependencies) || prev.depends === dependencies)) {
            return tie.prototype.update(prev, tiedObject);
        } else {
            var r = tie.prototype.init(name, tiedObject, dependencies, ties);
            tie.prototype.define(name, r, ties);
            if (name == APP) {
                app = r;
                routes.init(app);
                q.ready(function () {
                    routes.locate(ties);
                });
            }
            return r.obj;
        }
    }
};

/**
 * Tie prototype
 */
tie.prototype = {

    /**
     * Select DOM elements which are bound to current tie. Using 'data-tie' attribute. <br/>
     *
     * @this tie
     * @param {string} tieName name of current tie
     * @param {bind} bind current tie bind
     */
    select: function (tieName, bind) {
        var nodes = window.document.querySelectorAll('[' + TIE + '="' + tieName + '"]');
        var res = [];
        _.forEach(nodes, function (el) {
            res.push(new $(el, bind));
        });
        nodes = window.document.querySelectorAll('[' + TIE + '^="' + tieName + '|"]');
        _.forEach(nodes, function (el) {
            res.push(new $(el, bind));
        });
        nodes = window.document.querySelectorAll('[' + TIE + '^="' + tieName + ' |"]');
        _.forEach(nodes, function (el) {
            res.push(new $(el, bind));
        });
        nodes = window.document.querySelectorAll('[' + TIE + '^="' + tieName + '."]');
        _.forEach(nodes, function (el) {
            res.push(new $(el, bind));
        });
        bind.selected = true;
        return res;
    },

    /**
     * Create object based on primitive value
     *
     * @this tie
     * @param {Object} obj primitive
     * @return {{value: Object, attrs: Array}}
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
     * @this tie
     * @param {Function} fn
     * @return {{attrs: {value: Function}}}
     */
    wrapFunction: function (fn) {
        return {
            attrs: {
                value: fn
            }
        }
    },

    /**
     * Create object based on array
     *
     * @this tie
     * @param {Array} array
     * @return {{values: Array, attrs: Array}}
     */
    wrapArray: function (array) {
        return {
            values: array,
            attrs: [VALUE]
        };
    },

    /**
     * Checks object and wraps it if necessary. Also specify $shown, attrs and routes properties if empty.
     *
     * @this tie
     * @param {Object|Function|Date|Array|*} obj
     * @returns {model}
     */
    check: function (obj) {
        if (_.isFunction(obj)) {
            obj = this.wrapFunction(obj);
        } else if (!_.isObject(obj) || _.isDate(obj)) {
            obj = this.wrapPrimitive(obj);
        } else if (_.isArray(obj)) {
            obj = this.wrapArray(obj);
        }
        if (_.isUndefined(obj.$shown)) {
            obj.$shown = true;
        }
        if (_.isUndefined(obj.attrs)) {
            obj.attrs = {};
        }
        if (_.isUndefined(obj.routes)) {
            if (app != null && app.obj.routes) {
                obj.routes = app.obj.routes;
            }
        }
        obj.http = new http(obj.http);
        return new model(obj);
    },

    /**
     * Resolves dependencies.<br/>
     * If dependency not yet present, stub will be created and later replaced when dependency is tied.
     * If not all dependencies are resolved yet bind is presumed as not ready and errors will be skipped.
     *
     *
     * @this tie
     * @param {bind} bind associated bind
     * @param {Array} dependencies tie dependencies
     * @param {Object} ties already registered ties dictionary
     */
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

    /**
     * Defines current bind in the registry and resolves stubs that were created for dependant ties.<br/>
     * That will also update dependant ties with new dependency.
     *
     * @this tie
     * @param {string} name tie name
     * @param {bind} bind associated bind
     * @param {Object} ties already registered ties dictionary
     */
    define: function (name, bind, ties) {
        var old = ties[name];
        ties[name] = bind;
        if (old && old.touch) {
            bind.touch = old.touch;
            bind.rendered = old.rendered;
            _.debug("Calling apply on '" + bind.name + "' after define");
            bind.apply();
        }
    },

    /**
     * Updates current tie with another tied object
     *
     *
     * @this tie
     * @param {bind} bind already associated bind
     * @param {*} tiedObject
     * @returns {bind}
     */
    update: function (bind, tiedObject) {
        var name = bind.name;
        _.debug("Update tie " + name, name);
        _.extend(bind.obj, this.check(tiedObject));
        bind.prepareAttrs();
        bind.prepareRoutes();
        bind.prepareValues();
        _.debug("Prepared inner array structure");
        bind.obj = proxy(bind);
        if (!bind.selected) {
            this.$ = tie.select(name, bind);
            _.debug("Elements reselected: " + this.$.length);
        }
        if (!bind.rendered) {
            bind.render();
        }
        return bind;
    },

    /**
     * Initializes binding.<br/>
     * Also specifies bind loading method, that selects DOM elements and prepare values array binding.
     *
     * @this tie
     * @param {string} name tie name
     * @param {*} tiedObject
     * @param {Array} dependencies tie dependencies
     * @param {Object} ties already registered ties dictionary
     * @returns {bind}
     */
    init: function (name, tiedObject, dependencies, ties) {
        _.debug("Tie " + name, name);
        var r = new bind(name, dependencies, ties);
        r.obj = this.check(tiedObject);
        r.prepareAttrs();
        r.prepareRoutes();
        this.resolve(r, dependencies, ties);
        r.obj.$deps = r.depends;
        r.obj = proxy(r);
        _.debug("Bind model ready");
        var tie = this;
        r.load = function () {
            this.loading = true;
            if (!this.selected) {
                this.$ = tie.select(name, r);
                this.e = this.$.length;
                _.debug("Elements selected: " + this.$.length);
            }
            r.prepareValues();
            _.debug("Prepared inner array structure");
            if (!this.selected) {
                this.$ = tie.select(name, r);
                _.debug("Elements reselected: " + this.$.length);
            }
            this.loaded = true;
            this.loading = false;
        };
        return r;
    }
};