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

    var ties = {};

    var tie = function (name, tiedObject, dependencies, sealed) {
        if (name != APP && ties[APP] == null) {
            tie(APP, {});
        }
        var r = ties[name];
        if (_.isUndefined(tiedObject)) {
            return  pipeModel(r.observer.unbind());
        }
        if (r && r.obj.$sealed) {
            throw new Error(name + ' tie is already registered and sealed. Please choose another name for your tie');
        }
        r = tie.prototype.init(name, tiedObject, dependencies, sealed);
        tie.prototype.define(name, r);
        if (name == APP) {
            app = r;
        }
        return r.obj;
    };

    tie.prototype = {

        check: function (obj) {
            if (_.isFunction(obj) || _.isArray(obj) || _.isRegExp(obj) || _.isBoolean(obj)
                || _.isNumber(obj) || _.isString(obj) || _.isDate(obj) || !_.isObject(obj)) {
                obj = {value: obj};
            }
            return new model(obj);
        },

        resolveDependencies: function (bind, dependencies) {
            var name = bind.name;
            if (name != APP) {
                bind.obj[DEP_PREFIX + APP] = app.obj;
                if (!app.reliers.contains(name)) {
                    app.reliers.push(name);
                }
            }
            if (!dependencies) {
                return;
            }
            _.forEach(dependencies, function (dep) {
                _.debug("Check dependency " + dep);
                var found = ties[dep];
                if (!found) {
                    _.debug("Dependency stub " + dep);
                    found = {name: dep, reliers: [], obj: {_empty: true}};
                    this.define(dep, found);
                }
                bind.obj[DEP_PREFIX + dep] = found.obj;
                delete bind.obj._ready;
                if (!found.reliers.contains(name)) {
                    found.reliers.push(name);
                }
            }, this);
        },

        define: function (name, bind) {
            var old = ties[name];
            ties[name] = bind;
            if (old) {
                old.obj._deleted = true;
                if (old.reliers) {
                    bind.reliers = old.reliers;
                    _.debug("Calling apply on '" + bind.name + "' after define");
                    bind.apply('*');
                }
            }
        },

        init: function (name, tiedObject, dependencies, sealed) {
            _.debug("Tie " + name, name);
            var obj = this.check(tiedObject);
            var r = new bind(name, obj);
            _.define(obj, name, sealed, dependencies);
            obj._deleted = false;
            r.resolveHandles();
            this.resolveDependencies(r, dependencies);
            r.observer.observe();
            _.debug("Bind model ready");
            return r;
        }
    };

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

    Array.prototype.remove = function (item) {
        var idx = this.indexOf(item);
        if (idx != -1) {
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
    console.log(global.test);
    if (typeof module.exports === 'object') {
        var res = module.tie;
        if (global.test) {
            res.tier = tie.prototype;
            res.model = model;
            res.ties = ties;
            res.pipesRegistry = pipesRegistry;
            res.handlesRegistry = handlesRegistry;
            res.bind = bind;
        }
        module.exports = res;
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

    handles("require", function (obj, config) {
        if (_.isFunction(module.require)) {
            module.require(config);
        } else {
            console.error('Require is undefined');
        }
        return config;
    });


})(typeof exports === 'object' ? module : window);