var proxy = function (tie) {
    var observe = function (obj, desc, prop, dependency) {
        if (desc && desc._proxyMark) {
            return; //proxy already set
        }
        var newGet = function () {
            if (desc) {
                if (desc.get) {
                    return desc.get.call(obj);
                }
                return desc.value;
            }
            return tie.$attrValue(prop);
        };
        var newSet = function (val) {
            if (desc) {
                if (desc.set) {
                    desc.set.call(this, val);
                } else {
                    desc.value = val;
                }
            }
            if (prop == SHOWN) {
                tie.$show(val);
            } else {
                if (prop == ATTRS) {
                    tie.$prepareAttrs();
                } else if (prop == ROUTES) {
                    tie.$prepareRoutes();
                }
                tie.$apply();
            }
        };
        var enumerable = desc ? desc.enumerable : false;
        Object.defineProperty(obj, prop, {
            get: newGet,
            set: newSet,
            configurable: true,
            enumerable: enumerable,
            _proxyMark: true
        });
    };

    var explore = function (obj) {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                props.push(prop);
                if ('prototype' == prop) {
                    continue; // skip prototype
                }
                var desc = Object.getOwnPropertyDescriptor(obj, prop);
                if (desc._proxyMark) {
                    continue; //skip already processed
                }
                if (!desc.configurable || (desc.value === undefined && !desc.set) || desc.writable === false) {
                    continue; // skip readonly
                }
                var dep = prop.charAt(0) === '$' && tie.depends.indexOf(prop.substring(1)) != -1;
                var val = obj[prop];
                if (_.isObject(val) && !dep) {
                    explore(val);
                }
                observe(obj, desc, prop, dep);
            }
        }
        if (obj.attrs) {
            _.forIn(obj.attrs, function (attr, prop) {
                if (props.indexOf(prop) == -1 || attr.property || attr.value) {
                    if (_.isObject(val)) {
                        explore(val);
                    }
                    observe(obj, null, prop);
                }
                props.push(prop);
            }, this);
        }
    };

    var obj = tie.obj;
    var props = [];
    explore(obj);

    return obj;
};