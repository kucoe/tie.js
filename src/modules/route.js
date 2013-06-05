var routes = {
    list: {},
    init: function () {
        if (app == null) {
            throw new Error("App is not ready");
        }
        _.forIn(app.obj.routes, function (r, path) {
            path = path.toLowerCase();
            this.list[path] = new route(path, r.handler);
        }, this);
    },

    locate: function (ties) {
        var current = window.location.hash.substring(1);
        if (!current) {
            current = '/';
        }
        current = this.find(current);
        if (!current) {
            this.move('/');
        } else {
            app.location = function(url) {
                if(url){
                    this.move(url);
                    return null;
                } else {
                    return {href: window.location.href, route: current};
                }
            }.bind(this);
            if(current.handler) {
                safeCall(current.handler, app.obj, app.$ready());
            }
            _.forIn(ties, function (bind) {
                bind.obj.$location = app.location;
                bind.obj.shown = current.has(bind);
                var r = bind.obj.routes[current.path];
                if(r && r.handler) {
                    safeCall(r.handler, bind.obj, bind.$ready());
                }
                if (!bind.rendered) {
                    bind.$render();
                }
            })
        }
    },

    find: function (path) {
        return this.list[path];
    },

    stripHash: function (url) {
        var index = url.indexOf('#');
        return index == -1 ? url : url.substr(0, index);
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
    has: function (bind) {
        var routes = bind.obj.routes;
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
};
