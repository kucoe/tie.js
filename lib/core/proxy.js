var proxy = function (bind) {

    var observe = function (obj, desc, prop, top) {
        if (desc && desc._proxyMark) {
            return false; //proxy already set
        }
        var fullProp = top ? top + '.' + prop : prop;
        var newGet = function () {
            if (desc) {
                if (desc.get) {
                    return desc.get.call(obj);
                }
                return desc.value;
            }
            return bind.watcher.onGet(fullProp, bind.obj);
        };
        var changed = function (val) {
            var prev = newGet();
            return !_.isEqual(prev, val);
        };
        var newSet = function (val) {
            if (!changed(val)) {
                return;
            }
            if (desc) {
                if (desc.set) {
                    desc.set.call(this, val);
                } else {
                    desc.value = val;
                }
            }
            bind.apply(fullProp);
        };
        var enumerable = desc ? desc.enumerable : false;
        Object.defineProperty(obj, prop, {
            get: newGet,
            set: newSet,
            configurable: true,
            enumerable: enumerable,
            _proxyMark: true
        });
        return true;
    };

    var explore = function (obj, top) {
        var added = [];
        var watcher = bind.watcher;
        var main = bind.obj;
        var ready = main.$ready();
        _.forIn(obj, function (value, prop) {
            props.push(prop);
            if ('prototype' == prop) {
                return true;// skip prototype
            }
            var desc = Object.getOwnPropertyDescriptor(obj, prop);
            if (desc._proxyMark) {
                return true; //skip already processed
            }
            if (!desc.configurable || (desc.value === undefined && !desc.set) || desc.writable === false) {
                return true; // skip readonly
            }
            var dep = prop.indexOf(DEP_PREFIX) == 0 && bind.obj.$deps.indexOf(prop.substring(2)) != -1;
            if (_.isObject(value) && !dep && prop != DEPS && prop !== (DEP_PREFIX + APP)) {
                _.debug("Exploring " + prop);
                _.extend(added, explore(value, prop));
            }
            _.debug("Observing " + prop);
            if (observe(obj, desc, prop, top)) {
                added.push(prop);
                var fullProp = top ? top + '.' + prop : prop;
                watcher.onChange(fullProp, main, ready);
            }
            return true;
        });
        return added;
    };

    var obj = bind.obj;
    var props = [];
    _.debug("Exploring " + bind.name);
    var added = explore(obj);
    if (bind.newDynamicProps) {
        _.forEach(bind.newDynamicProps, function (prop) {
            _.debug("Observing dynamic property " + prop);
            if (observe(obj, null, prop)) {
                added.push(prop);
            }
            props.push(prop);
        });
        bind.newDynamicProps = [];
    }
    _.forEach(bind.props, function (prop) {
        if (_.isUndefined(bind.obj.$prop(prop))) {
            _.debug("Notify deleted property " + prop);
            bind.watcher.onDelete(prop, bind.obj);
        }
    }, this);
    return added;
};