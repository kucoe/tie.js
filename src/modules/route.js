var routes = {
    list: {},
    init: function () {
        if (app == null) {
            throw new Error("App is not ready");
        }
        if (app.obj.routes) {
            _.forIn(app.obj.routes, function (r, path) {
                path = path.toLowerCase();
                this.list[path] = new route(path, r.handler);
            }, this);
            _.debug("Routes init");
        }
    },

    locate: function (ties) {
        var current = window.location.hash.substring(1);
        current = this.find(current);
        if (!current) {
            if (app.obj.routes) {
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
            app.location = function (url) {
                if (url) {
                    this.move(url);
                    return null;
                }
                return {
                    href: window.location.href,
                    route: current
                };
            }.bind(this);
            if (current.handler) {
                safeCall(current.handler, app.obj);
            }
            _.forIn(ties, function (bind) {
                var obj = bind.obj;
                obj.$location = app.location;
                var shown = current.has(obj);
                obj.$shown = shown;
                if (!bind.rendered) {
                    bind.render();
                }
                bind.validateShow();
                var bindRoutes = obj.routes;
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
        return this.list[path];
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
        var routes = obj.routes;
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
