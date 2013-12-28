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

        attached: false,

        init: function (obj, routes) {
            if (!_.isEqual(this.list, routes)) {
                this.list = routes;
                this.app = obj.$$app;
                _.debug("Routes initialized");
            }
            this.attached = true;
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
                return {path: '#/', handler: this.list['/']};
            }
            if (path.charAt(path.length - 1) == '/') {
                path = path.substring(0, path.length - 1);
            }
            var res = null;
            _.forIn(this.list, function (fn, route) {
                if (route.charAt(0) === '/') {
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

        has: function (obj, current) {
            var routes = obj.$view.$routes;
            if (routes) {
                var exclude = routes['-'] != null;
                var contains = false;
                _.forIn(routes, function (route, path) {
                    if (path.toLowerCase() === current.path) {
                        contains = true;
                        return false;
                    }
                    return true;
                });
                return exclude != contains;
            }
            return false;
        },

        move: function (url) {
            setTimeout(function () {
                window.location.hash = '#' + url;
            }, 100);
        }
    };

    window.tie.handle("route", function (obj, config, observer, appConfig) {
        if (!routes.attached) {
            window.tie.domReady(function () {
                routes.locate();
            });
        }
        return routes.init(obj, appConfig);
    }, ['view'], true);

    if (typeof window.exports === 'object') {
        window.exports.routes = routes;
    }

})(window);