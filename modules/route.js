/**
 * Routes utilities
 *
 * @type {{list: {}, init: Function, locate: Function, find: Function, move: Function}}
 */
var routes = {
    /**
     * List of application defined routes
     */
    list: {},

    /**
     * Initializes list of routes using application info.
     *
     * @param {bind} app info
     */
    init: function (app) {
        if (app.obj.$routes) {
            _.forIn(app.obj.$routes, function (r, path) {
                path = path.toLowerCase();
                this.list[path] = new route(path, r.handler);
            }, this);
            _.debug("Routes init");
        }
    },

    /**
     * Processes current route using window location hash.<br/>
     * If application has no routes configured process default route.<br/>
     * Else tries to find route, if no configured route found moves to default '#/' route.<br/>
     * When configured route is found, iterates through all registered ties and analyses theirs routes configuration
     * and show/hide them accordingly.<br/>
     *
     * During this processing every tie got a $location utility function available that returns object with properties href
     * and route, calling $location(my-path) will change window location to '#my-path'.
     *
     *
     *
     * @param {Object} ties already registered ties dictionary
     */
    locate: function (ties) {
        var current = window.location.hash.substring(1);
        current = this.find(current);
        if (!current) {
            if (app.obj.$routes) {
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
            var that = this;
            app.$location = function (url) {
                if (url) {
                    that.move(url);
                    return null;
                }
                return {
                    href: window.location.href,
                    route: current
                };
            };
            if (current.handler) {
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

    /**
     * Finds route in configured routes list
     *
     * @param path route path
     * @returns {route}
     */
    find: function (path) {
        return this.list[path];
    },

    /**
     * Moves location to route specified.
     *
     * @param {string} url will be appended to hash using '#'+url
     */
    move: function (url) {
        setTimeout(function () {
            window.location.hash = '#' + url;
        }, 100);
    }
};

/**
 * Constructs new route
 *
 * @constructor
 * @class route
 * @this route
 * @param {string} path route path
 * @param {Function} handler route handle will be executed every time the location is moved to this route
 */
var route = function (path, handler) {
    this.path = path;
    this.handler = handler;
};

/**
 * Route prototype
 *
 * @type {{has: Function}}
 */
route.prototype = {

    /**
     * Returns whether the model specified has current route among it's routes configuration. <br/>
     * By default model inherit all application's routes.
     *
     * @param {model} obj
     * @returns {boolean}
     */
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
