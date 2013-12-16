var observer = function (obj) {
    this.obj = obj;
    this.props = [];
    this.newProps = [];
    this.listeners = [];
};

observer.prototype = {

    observe: function () {
        var obj = this.obj;
        var ready = obj.$ready();
        _.debug("Exploring object " + obj.$name);
        var added = explore(obj, ready, this);
        if (this.newProps.length > 0) {
            _.forEach(this.newProps, function (prop) {
                _.debug("Observing dynamic property " + prop);
                var splits = prop.split('.');
                var next = splits.shift();
                var o = obj;
                var current = '';
                while (next) {
                    current += next;
                    var desc = Object.getOwnPropertyDescriptor(o, next);
                    if (o && observeProperty(o, next, desc, ready, this, current)) {
                        added.push(prop);
                    }
                    o = o[next];
                    next = splits.shift();
                    current += '.';
                }
            }, this);
            this.newProps = [];
        }
        _.forEach(this.props, function (prop) {
            _.debug('Check for property being deleted ' + prop);
            if (_.isUndefined(this.obj.$prop(prop))) {
                _.debug("Notify deleted property " + prop);
                this.onDelete(prop, ready);
            }
        }, this);
        this.props = added;
    },

    watch: function (prop, handlerId, onChange, onDelete) {
        if (!prop || prop === '*') {
            prop = '.*';
        }
        _.debug('Dynamic property listener: ' + prop);
        if (onChange || onDelete) {
            var property = listener(toRegex(prop), handlerId, null, onChange, onDelete);
            this.listeners.push(property);
            return function () {
                var indexOf = this.listeners.indexOf(property);
                if (indexOf != -1) {
                    this.listeners.splice(indexOf, 1);
                }
            }.bind(this);
        }
        return null;
    },

    observeArray: function (array, onChange, onAdd, onRemove) {
        if (!_.isArray(array)) {
            array = [array];
        }
        if (!onChange) {
            throw 'Change function need to be implemented';
        }
        _.forEach(['push', 'unshift'], function (item) {
            array[item] = function () {
                var args = [].map.call(arguments, function (arg) {
                    return onAdd ? _.safeCall(onAdd, array, true, arg) : arg;
                });
                return [][item].apply(array, args);
            };
        });
        _.forEach(['pop', 'shift'], function (item) {
            array[item] = function () {
                var res = [][item].call(array);
                return onRemove ? _.safeCall(onRemove, array, true, res) : res;
            };
        });
        _.forEach(['sort', 'reverse', 'splice'], function (item) {
            array[item] = function () {
                var res = [][item].call(array, arguments);
                if ('splice' === item) {
                    res = res.map(function (r) {
                        return onRemove ? _.safeCall(onRemove, array, true, r) : r;
                    });
                }
                this.check();
                return res;
            };
        });
        array._cmp = function (index, item, prev) {
            if (_.isUndefined(prev)) {
                this[index] = _.safeCall(onAdd, array, true, item);
            } else if (!_.isEqual(item, prev)) {
                this[index] = _.safeCall(onChange, array, true, item, prev, index);
            }
        };
        array.set = function (index, item) {
            var prev = this[index];
            this._cmp(index, item, prev);
        };
        array.check = function () {
            _.forEach(this, function (item, i) {
                var copy = this._copy[i];
                this._cmp(i, item, copy);
            }, this);
            this.memo();
        };
        array.memo = function () {
            this._copy = _.extend({}, this);
        };
        array.memo();
        return array;
    },

    add: function (prop, handlerId, valueFn) {
        if (this.props.indexOf(prop) == -1) {
            this.newProps.push(prop);
            if (this.props.length > 0) { //check whether it was observed already
                this.observe()
            }
        }
        if (this.newProps.indexOf(prop) != -1 && valueFn) {
            _.debug('Dynamic property added: ' + prop);
            var property = listener(prop, handlerId, valueFn);
            this.listeners.push(property);
            return function () {
                var indexOf = this.listeners.indexOf(property);
                if (indexOf != -1) {
                    this.listeners.splice(indexOf, 1);
                }
                indexOf = this.newProps.indexOf(prop);
                if (indexOf != -1) {
                    this.newProps.splice(indexOf, 1);
                }
            }.bind(this);
        }
        return null;
    },

    remove: function (prop) {
        var indexOf;
        if (_.isString(prop)) { //removes listeners by handlerId or by property name
            _.forEach(this.listeners, function (item, i) {
                var property = item.property;
                if (prop && (property === prop || (_.isRegExp(property) && property.test(prop)) || item.handlerId === prop)) {
                    this.listeners.splice(i, 1);
                    indexOf = this.newProps.indexOf(property);
                    if (indexOf != -1) {
                        this.newProps.splice(indexOf, 1);
                    }
                }
            }, this, true);
        }
    },

    onGet: function (prop, ready) {
        return react(prop, this.obj, ready, this.listeners, 'get');
    },

    onChange: function (prop, ready) {
        return react(prop, this.obj, ready, this.listeners, 'change');
    },

    onDelete: function (prop, ready) {
        return react(prop, this.obj, ready, this.listeners, 'del');
    },

    apply: function (prop, ready) {
        this.onChange(prop, ready);
    }
};

var listener = function (prop, handlerId, valueFn, onChange, onDelete) {
    return {
        property: prop,
        handlerId: handlerId,
        valueFn: valueFn,
        onChange: onChange,
        onDelete: onDelete
    };
};

var react = function (prop, obj, ready, array, action) {
    if (!ready) {
        ready = obj.$ready();
    }
    _.debug('React on ' + action + ' for ' + prop);
    var val = action === 'get' ? null : obj[prop];
    _.forEach(array, function (item) {
        var property = item.property;
        var test = action === 'get' ? property === prop : (_.isRegExp(property) && property.test(prop));
        if (test) {
            var fn = action === 'get' ? item.valueFn : (action === 'del' ? item.onDelete : item.onChange);
            if (_.isFunction(fn)) {
                val = _.safeCall(fn, obj, ready, obj, prop, val);
            }
        }
    });
    return val;
};

var explore = function (obj, ready, observer, context) {
    var visited = [];
    _.forIn(obj, function (value, prop) {
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
        var dep = prop.indexOf(DEP_PREFIX) == 0 && obj.$deps.indexOf(prop.substring(2)) != -1;
        var fullProp = context ? context + '.' + prop : prop;
        if (_.isObject(value) && !_.isArray(value) && !dep && prop != DEPS && prop !== (DEP_PREFIX + APP)) {
            _.debug("Exploring object " + prop);
            _.extend(visited, explore(value, ready, observer, fullProp));
        }
        _.debug("Observing property " + prop);
        if (observeProperty(obj, prop, desc, ready, observer, fullProp)) {
            visited.push(prop);
            observer.onChange(fullProp, ready);
        }
        return true;
    });
    return visited;
};

var observeProperty = function (obj, prop, desc, ready, observer, fullProp) {
    if (desc && desc._proxyMark) {
        return false; //proxy already set
    }
    var newGet = function () {
        if (desc) {
            if (desc.get) {
                return desc.get.call(this);
            }
            return desc.value;
        }
        return observer.onGet(fullProp, ready);
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
        if (!newSet._apply) {
            newSet._apply = true;
            observer.apply(fullProp, ready);
            newSet._apply = false;
        }
    };
    var enumerable = desc ? desc.enumerable : true;
    Object.defineProperty(obj, prop, {
        get: newGet,
        set: newSet,
        configurable: true,
        enumerable: enumerable,
        _proxyMark: true
    });
    return true;
};