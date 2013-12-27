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
        list: [],

        init: function (routes) {
            this.list = [];
            _.forIn(routes, function (r, path) {
                path = path.toLowerCase();
                this.list.push(new route(path, r));
            }, this);
            _.debug("Routes initialized");
        },

        locate: function (ties) {
            var current = window.location.hash.substring(1);
            current = this.find(current);
            if (!current) {
                if (this.list.length > 0) {
                    this.move('/');
                } else {
                    _.debug("Process default route");
                    _.forIn(ties, function (bind) {
                        if (!bind.rendered) {
                            bind.render();
                        }
                        bind.obj.$location = function () {
                            return {
                                route: {
                                    has: function () {
                                        return true
                                    }
                                }
                            }
                        };
                        bind.obj.$shown = true;
                    });
                    _.debug("Processed default route");
                }
            } else {
                _.debug("Process route " + current.path);
                if (_.isFunction(current.handler)) {
                    safeCall(current.handler, app.obj);
                }
                _.forIn(ties, function (bind) {
                    var obj = bind.obj;
                    obj.$location = app.$location;
                    var shown = current.has(obj);
                    obj.$shown = shown;
                    if (!bind.rendered) {
                        bind.render();
                    }
                    bind.validateShow();
                    var bindRoutes = obj.$routes;
                    if (bindRoutes && shown) {
                        var r = bindRoutes[current.path];
                        if (r && r.handler) {
                            safeCall(r.handler, obj);
                        }
                    }
                });
                _.debug("Processed route " + current.path);
            }
        },

        find: function (path) {
            if (path.charAt(path.length - 1) == '/') {
                path = path.substring(0, path.length - 1);
            }
            var res;
            _.forEach(this.list, function (route) {
                var routeChunks = route.path.split('/');
                var pathChunks = path.split('/');
                if (routeChunks.length === pathChunks.length) {
                    _.forEach(routeChunks, function (chunk, i) {
                        if (chunk.charAt(0) == ':') {
                            routeChunks[i] = pathChunks[i];
                        }
                    });
                    if (routeChunks.join('/') === path) {
                        res = route;
                        return true;
                    }
                }
                return true;
            });
            return res;
        },

        move: function (url) {
            setTimeout(function () {
                window.location.hash = '#' + url;
            }, 100);
        }
    };


    var route = function (path, handler) {
        this.path = path;
        this.handler = handler;
    };

    route.prototype = {

        has: function (obj) {
            var routes = obj.$routes;
            if (routes) {
                var exclude = routes['-'] != null;
                var contains = false;
                _.forIn(routes, function (route, path) {
                    if (path.toLowerCase() == this.path) {
                        contains = true;
                        return false;
                    }
                    return true;
                }, this);
                return exclude != contains;
            }
            return false;
        }
    };

    window.tie.handle("route", function (obj, config, observer, appConfig) {
        routes.init(appConfig);
        return appConfig;
    }, ['view'], true);

    window.tie.handle("location", function () {
        return function (url) {
            if (url) {
                routes.move(url);
                return null;
            }
            return window.location.href.substring(1);
        }
    }, ['view'], true);

    if (typeof window.exports === 'object') {
        window.exports.routes = routes;
    }

})(window);