var handlesRegistry = {};

var handles = function (name, fn, dependencies, sealed) {
    var h = handlesRegistry[name];
    if (_.isUndefined(fn)) {
        return  h;
    }
    if (h && h.$sealed) {
        throw new Error(name + ' handle already registered and sealed. Please choose another name for your handle');
    }
    h = handle(name, fn, dependencies || []);
    fillSystemFields(h, name, sealed, dependencies);
    h = _.extend(h, _);
    handlesRegistry[name] = h;
    return h;
};

var handle = function (name, fn, dependencies) {
    var h = function (obj, config, watcher, appConfig) {
        _.debug("Process handle " + name);
        _.forEach(dependencies, function (item) {
            h[DEP_PREFIX + item] = handlesRegistry[item];
        });
        if (fn && _.isFunction(fn)) {
            obj = _.safeCall(fn, h, true, obj, config, watcher, appConfig);
        }
        _.debug("Processed handle " + name);
        return obj;
    };
    return h;
};