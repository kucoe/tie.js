var renderChildren = function (children, obj, clean, renderer, els) {
    els = els || renderer.$;
    _.forEach(els, function (el) {
        var $ = el.$;
        if (clean) {
            dom.removeChildren($);
        }
        var fragment = document.createDocumentFragment();
        _.forEach(children, function (child) {
            var id = child._parents[el._id];
            var c = id ? document.getElementById(id) : null;
            var newEl = false;
            if (!c) {
                c = document.createElement(child.$tag || 'div');
                fragment.appendChild(c);
                newEl = true;
            }
            var w = new wrap(c, obj);
            _.forIn(child, function (val, prop) {
                if (_.isHandle(prop)) {
                    child.$tie = obj.$name;
                    child._resolved = [];
                    resolveViewHandle(obj, child, prop.substring(1), [w]);
                } else {
                    renderer.$renderAttr(obj, prop, val, w);
                }
            });
            if (newEl) {
                w.setAttribute(ID, w._id);
                child._ids.push(w._id);
                child._parents[el._id] = w._id;
            }
        });
        _.debug('Processed children');
        $.appendChild(fragment);
        _.debug('Append children to main');
    }, this);
};


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
    renderChildren(views, obj, true, renderer, els);
    var onChange = function (item, prev) {
        if (prev) {
            onRemove(prev);
        }
        if (!item._ids) {
            item = prepareView(item, obj);
        }
        renderChildren(item, obj, false, renderer, els);
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
    renderer.register(this.$name, function (obj, prop, name, val) {
        _.forEach(val, function (v, i) {
            _.forEach(v._ids, function (id) {
                var c = document.getElementById(id);
                if (c) {
                    var w = new wrap(c, obj);
                    renderer.inspectChange(obj, prop, name, val[i], w);
                }
            });
        });
    });
    return views;
}, [], true);