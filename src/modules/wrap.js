/**
 * Tie.js
 * Smart binding, routes, pipes, properties, templates, resources.
 *
 * @namespace export
 */
(function (window) {
    'use strict';

    /**
     * Properties constants
     */
    var APP = 'app';
    var VALUE = 'value';
    var CALLBACK = 'callback';
    var VALUES = 'values';
    var TEXT = 'text';
    var SHOWN = 'shown';
    var ATTRS = 'attrs';
    var ROUTES = 'routes';
    var ITEM_NAME = '_item_name';

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

    var getAccessor = function(obj, split) {
        var res = obj;
        var i = 1;
        var length = split.length;
        while (i < length) {
            res = res[split[i-1]];
            i++;
        }
        return res;
    };

    /**
     * Property pipeline definition
     */
    window.tie("property", function (obj, params, value) {
        if (params) {
            var prop = params[0];
            var target = params.length > 1 ? params[1] : VALUE;
            var splitP = prop.split('.');
            var splitT = target.split('.');
            var res = getAccessor(obj, splitP);
            var trg = getAccessor(obj, splitT);
            var lastP = splitP[splitP.length-1];
            var lastT = splitT[splitT.length-1];
            if (_.isUndefined(value)) {
                trg[lastT] = res[lastP];
            } else {
                res[lastP] = value;
            }
        }
        return obj;
    });

    /**
     * Value pipeline definition
     */
    window.tie("value", function (obj, params, value) {
        if (params) {
            var prop = params[0];
            var val = params.length > 1 ? params[1] : null;
            var splitP = prop.split('.');
            var res = getAccessor(obj, splitP);
            var lastP = splitP[splitP.length-1];
            if (_.isUndefined(value)) {
                res[lastP] = val;
            } else {
                res[lastP] = value;
            }
        }
        return obj;
    });

})(window);
