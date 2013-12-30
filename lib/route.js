/**
 * Tie.js route handle
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */
(function (window) {
    'use strict';

    var _ = window.tie._;

    var routes = {

        list: {},

        init: function (obj, routes) {
            if (!_.isEqual(this.list, routes)) {
                this.list = routes;
                this.list.$current = {};
                this.app = obj.$$app;
                _.debug("Routes initialized");
            }
            return this.list;
        },

        locate: function () {
            if (_.isDefined(this.list['/'])) {
                var current = window.location.hash.substring(1);
                current = this.find(current);
                if (current == null) {
                    this.move('/');
                } else {
                    var path = current.path;
                    _.debug("Process route " + path);
                    if (_.isFunction(current.handler)) {
                        _.safeCall(current.handler, this.app);
                    }
                    this.list.$current = current;
                    this.list.$location = function (url) {
                        if (url) {
                            routes.move(url);
                        }
                        return current;
                    };
                    _.debug("Processed route " + path);
                }
            }
        },

        find: function (path) {
            if (!path || path === '/') {
                return {path: '/', handler: this.list['/']};
            }
            if (path.charAt(path.length - 1) == '/') {
                path = path.substring(0, path.length - 1);
            }
            var res = null;
            _.forIn(this.list, function (fn, route) {
                if (!_.isHandle(route)) {
                    var routeChunks = route.split('/');
                    var pathChunks = path.split('/');
                    if (routeChunks.length === pathChunks.length) {
                        _.forEach(routeChunks, function (chunk, i) {
                            if (chunk.charAt(0) == ':') {
                                routeChunks[i] = pathChunks[i];
                            }
                        });
                        if (routeChunks.join('/') === path) {
                            res = {path: route, handler: fn};
                            return true;
                        }
                    }
                }
                return true;
            });
            return res;
        },

        has: function (routes) {
            if (_.isArray(routes) && this.list.$current) {
                var exclude = routes.contains('-');
                var contains = false;
                _.forEach(routes, function (path) {
                    if (path.toLowerCase() === this.list.$current.path) {
                        contains = true;
                        return false;
                    }
                    return true;
                }, this);
                return exclude != contains;
            }
            return true;
        },

        move: function (url) {
            setTimeout(function () {
                window.location.hash = '#' + url;
            }, 100);
        }
    };

    window.tie.domReady(function () {
        routes.locate();
    });

    window.tie.handle("route", function (obj, config, observer, appConfig) {
        observer.watch('\\$route\\.\\$current', this._uid, function(obj) {
            var view = obj.$view;
            var config = view && view.$routes;
            updateShown(config, view);
        });
        return routes.init(obj, appConfig);
    }, ['view'], true);

    function updateShown(config, view) {
        if (config && !routes.has(config)) {
            view.$shown = false;
        } else if (view) {
            view.$shown = true;
        }
    }

    window.tie.viewHandle("routes", function (view, config) {
        updateShown(config, view);
        return config;
    }, ['shown'], true);

    if (typeof window.exports === 'object') {
        window.exports.routes = routes;
    }

})(window);