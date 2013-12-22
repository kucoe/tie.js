/**
 * Tie.js
 * Simple model driven binding library
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */
(function (module) {
    'use strict';

    var APP = 'app';
    var VALUE = 'value';
    var DEPS = '$deps';
    var DEP_PREFIX = '$$';
    var HANDLE_PREFIX = '$';
    var CALC_FN = '_calc_fn';
    var VALUE_FN = '_val_fn';

    var app = null;

    function toRegex(prop) {
        return new RegExp('^' + prop + '$');
    }

    /**  UTIL **/

    /**  PIPE **/

    /**  PARSER **/

    /**  HANDLE **/

    /**  MODEL **/

    /**  OBSERVER **/

    /**  BIND **/

    /**  TIE **/

    Function.prototype.val = function (dependencies) {
        if (_.isDefined(dependencies) && !_.isArray(dependencies)) {
            dependencies = [dependencies];
        }
        _.define(this, VALUE_FN, false, dependencies || [VALUE]);
        return this;
    };

    Function.prototype.calc = function () {
        _.define(this, CALC_FN, false);
        return this;
    };

    Array.prototype.contains = function (item) {
        return this.indexOf(item) != -1;
    };

    Array.prototype.remove = function(item) {
        var idx = this.indexOf(item);
        if(idx != -1) {
            return this.splice(idx, 1);
        }
        return [];
    };

    String.prototype.contains = function (substring) {
        return this.indexOf(substring) != -1;
    };

    String.prototype.contains = function (substring) {
        return this.indexOf(substring) != -1;
    };

    module.tie = tie;
    module.tie.pipe = pipes;
    module.tie.handle = handles;
    module.tie.enableDebug = function (enable) {
        _.debugEnabled = enable;
    };
    module.tie.$ = parser;
    module.tie._ = _;
    if (typeof module.exports === 'object') {
        module.exports = function (test) {
            var res = module.tie;
            if (test) {
                res.tier = tie.prototype;
                res.util = _;
                res.model = model;
                res.ties = ties;
                res.pipesRegistry = pipesRegistry;
                res.handlesRegistry = handlesRegistry;
                res.bind = bind;
            }
            return res;
        };
    }

    /**
     * Property pipeline definition
     */
    pipes("property", function (obj, params) {
        if (params && params.length > 0) {
            var prop = params[0];
            var target = params.length > 1 ? params[1] : VALUE;
            obj.$prop(target, obj.$prop(prop))
        }
        return obj;
    });

    handles("require", function (obj, config) {
        if (_.isFunction(module.require)) {
            module.require(config);
        } else {
            console.error('Require is undefined');
        }
        return config;
    });


})(typeof exports === 'object' ? module : window);