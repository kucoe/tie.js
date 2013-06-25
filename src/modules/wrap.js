/**
 * Tie.js
 * Smart binding, routes, pipes, properties, templates, resources.
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */
(function (window) {
    'use strict';

    /**
     * Properties constants
     */
    var APP = 'app';
    var VALUE = 'value';
    var VALUES = '$values';
    var TEXT = 'text';
    var SHOWN = '$shown';
    var DEPS = '$deps';
    var ATTRS = '$attrs';
    var ROUTES = '$routes';
    var HTTP = '$http';
    var TMPL = '$tmpl';
    var FORM = '$form';
    var ITEM_NAME = '_item_name';
    var FETCHED = '_fetched';
    var RESERVED = [FETCHED, VALUES, SHOWN, DEPS, ATTRS, ROUTES, HTTP, TMPL , FORM, '$attr', '$prop', '$location'];

    /**
     * Attribute constants
     */
    var INDEX = "data-index";
    var TIE = "data-tie";
    var TIED = "data-tied";

    /**
     * Generates 4 chars hex string
     *
     * @returns {string}
     */
    var s4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };

    /**
     * Allow convert array to configuration object extending object passed with array values as properties
     *
     * @returns {Object}
     */
    Array.prototype._ = function (obj) {
        _.forEach(this, function (item) {
            if (!obj.hasOwnProperty(item)) {
                obj[item] = {'_item_name': item};
            }
        });
        return obj;
    };

//INSERT

    /**
     * Exports
     */
    window.tie = tie();
    window.tie.pipes = pipes;
    window.tie.enableDebug = function (enable) {
        _.debugEnabled = enable;
    };

    /**
     * Property pipeline definition
     */
    pipes("property", function (obj, params, next, value) {
        if (params && params.length > 0) {
            var prop = params[0];
            var target = params.length > 1 ? params[1] : VALUE;
            if (_.isUndefined(value)) {
                obj.$prop(target, obj.$prop(prop))
            } else {
                obj.$prop(prop, value);
            }
        }
         return obj;
    }, {updateModel: true});

    /**
     * Value pipeline definition
     */
    pipes("value", function (obj, params) {
        if (params && params.length > 0) {
            var prop = params[0];
            var val = params.length > 1 ? params[1] : null;
            obj.$prop(prop, val);
        }
        return obj;
    });

    /**
     * Routes pipeline definition
     */
    pipes("routes", function (obj, params) {
        if (params && params.length > 0) {
            var add = params[0] === '+';
            var subtract = params[0] === '-';
            if (add) {
                params.splice(0, 1);
                this.forEach(params, function (item) {
                    obj.$routes[item] = {path: item};
                });
            } else if (subtract) {
                params.splice(0, 1);
                this.forEach(params, function (item) {
                    delete obj.$routes[item];
                });
            } else {
                obj.$routes = {};
                this.forEach(params, function (item) {
                    obj.$routes[item] = {path: item};
                });
            }
        }
        return obj;
    }, {updateRoutes: true});

    var load = function (obj, params, next) {
        if(obj._fetched) {
            return obj;
        }
        var opts = {};
        if (params && params.length > 0) {
            var trim = this.trim;
            this.forEach(params, function (item) {
                var splits = item.split(':');
                if (splits.length == 2) {
                    opts[trim(splits[0])] = trim(splits[1]);
                } else {
                    opts[trim(splits[0])] = '';
                }
            });
        }
        obj.$http.get(opts, function (data, err) {
            if (err) {
                console.error(err);
            } else if (_.isObject(data)) {
                _.extend(obj, data);
            } else {
                console.log('Response received:' + data);
            }
            next(obj);
        });
        return null;
    };

    /**
     * Load pipeline definition
     */
    pipes("load", load);

    /**
     * Fetch pipeline definition
     */
    pipes("fetch", load, {fetchModel: true});


})(window);
