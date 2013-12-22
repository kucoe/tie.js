viewHandle("children", function (view, config, renderer, obj, els) {
    var views = [];
    if (_.isFunction(config)) {
        var idx = 0;
        var next = _.safeCall(config, obj, idx);
        while (next != null) {
            views.push(prepareView(next, obj));
            next = _.safeCall(config, obj, ++idx);
        }
    } else {
        _.forEach(config, function (child) {
            views.push(prepareView(child, obj));
        });
    }
    renderer.$renderChildren(views, obj, true, els);
    var onChange = function (item, prev) {
        if (prev) {
            onRemove(prev);
        }
        if (!item._ids) {
            item = prepareView(item, obj);
        }
        renderer.$renderChildren(item, obj, false, els);
        return item;
    };
    var onRemove = function (item) {
        _.forEach(item._ids, function (id) {
            var c = document.getElementById(id);
            if (c) {
                dom.remove(c);
            }
        });
    };
    views = renderer.observeArray(views, onChange, onChange, onRemove);
    renderer.register(this.$name, function (obj, prop, val, vanes) {
        _.forEach(views, function (v) {
            _.forEach(v._ids, function (id) {
                var c = document.getElementById(id);
                if (c) {
                    var w = new wrap(c, obj);
                    _.forIn(v, function (val, name) {
                        renderer.inspectAttrs(obj, name, val, w);
                    });
                }
            });
        });
    });
    return views;
}, [], true);