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
        _.debug("Routes init");
    },

    locate: function (ties) {
        var current = window.location.hash.substring(1);
        current = this.find(current);
        if (!current) {
            this.move('/');
        } else {
            _.debug("Process route" + current.path);
            app.location = function (url) {
                if (url) {
                    this.move(url);
                    return null;
                }
                return {href: window.location.href, route: current};
            }.bind(this);
            if (current.handler) {
                safeCall(current.handler, app.obj, app.$ready());
            }
            _.forIn(ties, function (bind) {
                setTimeout(function(){
                   this.renderItem(current, bind);
                }.bind(this), 50)
            }, this);
            _.debug("Processed route" + current.path);
        }
    },

    renderItem : function(route, bind) {
        if (!bind.rendered) {
            bind.$render();
        }
        bind.obj.$location = app.location;
        bind.obj.shown = route.has(bind);
        var r = bind.obj.routes[route.path];
        if (r && r.handler) {
            safeCall(r.handler, bind.obj, bind.$ready());
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
