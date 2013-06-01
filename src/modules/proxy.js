var proxy = function (tie) {
    var obj = tie.obj;
    var watch = function (desc, prop, dependency) {
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
            tie.$apply();
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

    var props = [];

    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            props.push(prop);
            if ('attrs' == prop || 'prototype' == prop) {
                continue; // skip attributes
            }
            var desc = Object.getOwnPropertyDescriptor(obj, prop);
            if (desc._proxyMark) {
                continue; //skip already processed
            }
            if (!desc.configurable || (desc.value === undefined && !desc.set) || desc.writable === false) {
                continue; // skip readonly
            }
            var dep = prop.charAt(0) === '$' && tie.depends.indexOf(prop.substring(1)) != -1;
            watch(desc, prop, dep);
        }
    }
    if (obj.attrs) {
        _.forEach(obj.attrs, function (attr) {
            if (_.isString(attr)) {
                attr = {
                    name: attr
                };
            }
            var prop = attr.name;
            if (props.indexOf(prop) == -1 || attr.property || attr.value) {
                watch(null, prop);
            }
        }, this);
    }
    return obj;
};