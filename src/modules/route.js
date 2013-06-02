var routes = {
    list: {},
    init: function () {
        if (app == null) {
            throw new Error("App is not ready");
        }
        _.forEach(app.obj.routes, function (path) {
            path = path.toLowerCase();
            this.list[path] = new route(path);
        }, this);
    },

    locate: function (ties) {
        var current = window.location.hash.substring(1);
        if (!current) {
            current = '/';
        }
        current = this.find(current);
        if (!current) {
            this.move(this.stripHash(window.location.href));
        } else {
            for (var prop in ties) {
                if (ties.hasOwnProperty(prop)) {
                    var bind = ties[prop];
                    bind.obj.shown = current.has(bind);
                    if(!bind.rendered){
                        bind.$render();
                    }
                }
            }
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
            window.location.replace(url);
        }, 100);
    }
};

var route = function (path) {
    this.path = path;
};

route.prototype = {
    has: function (bind) {
        var routes = bind.obj.routes;
        var exclude = routes[0] == '-';
        var contains = false;
        _.forEach(routes, function (route) {
            if (route.toLowerCase() == this.path) {
                contains = true;
                return false;
            }
            return true;
        }, this);
        return exclude != contains;
    }
};
