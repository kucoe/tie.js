var viewHandlers = {};

var viewHandle = function (name, fn, dependencies, sealed) {
    var h = viewHandlers[name];
    if (_.isUndefined(fn)) {
        return  h;
    }
    if (h && h.$sealed) {
        throw new Error(name + ' view handle already registered and sealed. Please choose another name for your handle');
    }
    h = function (view, config, renderer, obj, els) {
        _.debug("Process view handle " + name);
        _.forEach(dependencies || [], function (item) {
            h['$$' + item] = viewHandlers[item];
        });
        if (fn && _.isFunction(fn)) {
            config = _.safeCall(fn, h, view, config, renderer, obj, els);
        }
        _.debug("Processed view handle " + name);
        return config;
    };
    _.define(h, name, sealed, dependencies);
    h = _.extend(h, _);
    viewHandlers[name] = h;
    return h;
};

var resolveViewHandle = function (obj, view, name, els) {
    var vh = viewHandlers[name];
    if (vh && view._resolved) {
        _.forEach(vh.$deps, function (item) {
            if (!view._resolved.contains(item)) {
                resolveViewHandle(obj, view, item, els);
            }
        });
        var h = (HANDLE_PREFIX + name);
        var c = view[h];
        _.debug("View handle " + name + ' with config ' + c);
        var renderer = renders[view.$tie];
        if (_.isDefined(c) && renderer && renderer.rendered) {
            view._silent = true;
            view[h] = vh(view, c, renderer, obj, els);
            delete view._silent;
            if (!view._resolved.contains(name)) {
                view._resolved.push(name);
            }
        }
    }
};