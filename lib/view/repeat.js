var check = function (obj) {
    var res = obj;
    if (_.isFunction(obj) || _.isArray(obj) || _.isRegExp(obj) || _.isBoolean(obj)
        || _.isNumber(obj) || _.isString(obj) || _.isDate(obj) || !_.isObject(obj)) {
        res = {value: obj};
    }
    res._ids = [];
    res._origins = {};
    return res;
};

var tie = function (item, obj, idx) {
    item = check(item);
    obj = window.tie(obj.$name)();
    obj = _.extend(obj, item);
    return obj;
};

var repeat = function (array, obj, clean, renderer, els) {
    _.forEach(els, function (el) {
        var $ = el.$;
        if (clean) {

        }
        var fragment = document.createDocumentFragment();
        _.forEach(array, function (item) {
            var id = item._origins[el._id];
            var c = id ? document.getElementById(id) : null;
            var newEl = false;
            if (!c) {
                c = $.cloneNode(true);
                fragment.appendChild(c);
                newEl = true;
            }
            var w = new wrap(c, obj);
            _.forIn(item.$view, function (val, prop) {
                if (!_.isHandle(prop)) {
                    renderer.$renderAttr(obj, prop, val, w);
                }
            });
            if (newEl) {
                w.setAttribute(ID, w._id);
                w.setAttribute(TIE);
                item._ids.push(w._id);
                item._origins[el._id] = w._id;
            }
        });
        _.debug('Processed repeat');
        el.insertAfter(fragment);
        el.show(false);
        _.debug('Append repeat to main');
    }, this);
};


viewHandle("repeat", function (view, config, els, obj) {
    var renderer = renders[obj.$name];
    var items = [];
    if (_.isFunction(config)) {
        var idx = 0;
        var next = _.safeCall(config, obj, idx);
        if (config.length == 0 && _.isArray(next)) {
            _.forEach(next, function (item, i) {
                items.push(tie(item, obj, i));
            });
        } else {
            while (next != null) {
                items.push(tie(next, obj, idx));
                next = _.safeCall(config, obj, ++idx);
            }
        }
    } else {
        _.forEach(config, function (item, i) {
            items.push(tie(item, obj, i));
        });
    }
    repeat(items, obj, true, renderer, els);
    var onChange = function (item, prev) {
        if (prev) {
            onRemove(prev);
        }
        if (!item._ids) {
            item = check(item, obj);
        }
        repeat(item, obj, false, renderer, els);
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
    items = renderer.observeArray(items, onChange, onChange, onRemove);
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
    return items;
}, [], true);
