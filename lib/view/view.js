/**
 * Tie.js View handle
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */
(function (window) {
    'use strict';

    var document = window.document;
    var _ = window.tie._;
    var parse = window.tie.$;

    var HANDLE_PREFIX = '$';
    var DEP_PREFIX = '$$';

    var VALUE = 'value';
    var TEXT = 'text';

    var ID = "id";
    var INDEX = "data-index";
    var TIE = "data-tie";
    var TIED = "data-tied";
    var CLASS = "class";
    var NAME = "name";

    /**  DOM **/

    /**  EL **/

    /**  VIEWHANDLE **/

    /**  RENDERER **/

    /**  SHOWN **/

    /**  PARENT **/

    /**  CHILDREN **/

    /**  REPEAT **/

    /**  VIEW **/

    var prepareView = function (view, obj) {
        var res = view;
        if (_.isString(view) && (view.contains('#') || view === '*' || view === '@')) {
            res = {};
            if (view === '@') {
                res._amap = true;
            } else if (view === '*') {
                _.forIn(obj, function (val, prop) {
                    if (_.isEnumerable(prop)) {
                        res[prop] = prop.prop();
                    }
                });
            } else {
                var s = view.split('#');
                var name = s[0] || VALUE;
                var prop = s[1] || VALUE;
                res[name] = prop.prop();
            }
        } else if (_.isFunction(view) || _.isArray(view) || _.isRegExp(view) || _.isBoolean(view)
            || _.isNumber(view) || _.isString(view) || _.isDate(view) || !_.isObject(view)) {
            res = {
                value: view
            };
        } else {
            res = view;
        }
        res._ids = [];
        res._parents = {};
        return res;
    };

    window.tie.handle('view', function (obj, config, observer, appConfig) {
        var handlerId = this._uid;
        var view = prepareView(config, obj);
        if (appConfig && !_.isString(config)) {
            var appView = prepareView(appConfig, obj);
            view = _.extend(appView, view);
        }
        var r = new renderer(obj, view);
        var tieName = obj.$name;
        r.observeArray = function () {
            return observer.observeArray.apply(observer, arguments);
        };
        r.render = function (prop) {
            if (this.rendering || (!this.rendered && prop)) {
                return;
            }
            this.rendering = true;
            this.$render(obj, prop);
            this.rendering = false;
            this.rendered = true;
            if (!prop) {
                _.forIn(viewHandlers, function (handle, prop) {
                    if (!view._resolved.contains(prop)) {
                        resolveViewHandle(obj, view, prop);
                    }
                });
            }
        };
        renders[tieName] = r;
        observer.watch('*', handlerId, function (obj, prop, val) {
            if ('_deleted' === prop && !!val) {
                delete renders[tieName];
                observer.remove(handlerId);
            } else if (prop.indexOf('$view.') == 0) {
                var name = prop.replace('$view.', '');
                if (_.isHandle(name) && !name.contains('.')) {
                    resolveViewHandle(obj, view, name.substring(1));
                } else {
                    r.inspectChange(obj, prop, name, view);
                }
            }
            if (_.isDefined(obj.$view.value)) {
                _.forEach(r.$, function (el) {
                    if (prop === el.property) {
                        var value = val;
                        if (el.tie !== tieName) {
                            var updated = parse(el.tie, undefined, obj);
                            value = updated.$prop(prop);
                        }
                        r.$renderAttr(obj, VALUE, value, el)
                    }
                });
            }
        });
        if (dom.ready()) {
            setTimeout(function () {
                if (!r.rendered) {
                    r.render()
                }
            }, 100);
        }
        return view;
    }, [], true);

    var onReady = function () {
        _.debug("Render app");
        _.forIn(renders, function (r) {
            if (!r.rendered) {
                r.render();
            }
        });
        _.debug("Rendered app");
    };

    dom.ready(onReady);

    window.tie.domReady = function () {
        return dom.ready.apply(dom, arguments)
    };
    window.tie.viewHandle = viewHandle;

    if (typeof window.exports === 'object') {
        var res = {};
        res.q = dom;
        res.el = wrap;
        res.renders = renders;
        res.clean = function () {
            dom.fetched = [];
            res.viewHandlers = viewHandlers;
            res.renders = renders = {};
        };
        window.exports = res;
    }

})(window);