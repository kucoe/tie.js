var observer = function (obj) {
    this.obj = obj;
    this.props = [];
    this.listeners = [];
    this.deps = {};
    this.proxy = {};
};

observer.prototype = {

    unbind: function (obj, top) {
        if (!obj) {
            obj = this.obj;
        }
        var res = Object.create(Object.getPrototypeOf(obj));
        _.forIn(obj, function (value, prop) {
            var full = top ? top + '.' + prop : prop;
            var proxy = this.proxy[full];
            var val = proxy ? proxy.value : value;
            if (_.isObject(value)) {
                res[prop] = this.unbind(val, prop);
            } else {
                res[prop] = val;
            }
        }, this);
        return res;
    },

    observe: function () {
        var obj = this.obj;
        _.debug("Exploring object " + obj.$name);
        var added = explore(obj, this);
        _.forEach(this.props, function (prop, i) {
            _.debug('Check for property being deleted ' + prop);
            if (_.isUndefined(this.obj.$prop(prop))) {
                _.debug("Notify deleted property " + prop);
                this.onDelete(prop);
                //this.props.splice(i, 1);
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
            var property = listener(toRegex(prop), handlerId, onChange, onDelete);
            this.listeners.push(property);
            return function () {
                this.listeners.remove(property);
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
                    return onAdd ? _.safeCall(onAdd, array, arg) : arg;
                });
                return [][item].apply(array, args);
            };
        });
        _.forEach(['pop', 'shift'], function (item) {
            array[item] = function () {
                var res = [][item].call(array);
                return onRemove ? _.safeCall(onRemove, array, res) : res;
            };
        });
        _.forEach(['sort', 'reverse', 'splice'], function (item) {
            array[item] = function () {
                var res = [][item].call(array, arguments);
                if ('splice' === item) {
                    res = res.map(function (r) {
                        return onRemove ? _.safeCall(onRemove, array, r) : r;
                    });
                }
                this.check();
                return res;
            };
        });
        array._cmp = function (index, item, prev) {
            if (_.isUndefined(prev)) {
                this[index] = _.safeCall(onAdd, array, item);
            } else if (!_.isEqual(item, prev)) {
                this[index] = _.safeCall(onChange, array, item, prev, index);
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
        _.debug('Array observer bound');
        return array;
    },

    remove: function (prop) {
        if (_.isString(prop)) { //removes listeners by handlerId or by property name
            _.forEach(this.listeners, function (item, i) {
                var property = item.property;
                if (prop && (property === prop || (_.isRegExp(property) && property.test(prop)) || item.handlerId === prop)) {
                    this.listeners.splice(i, 1);
                }
            }, this, true);
        }
    },

    onChange: function (prop) {
        _.debug('Property change: ' + prop);
        return react(prop, this, 'change');
    },

    onDelete: function (prop) {
        _.debug('Property delete: ' + prop);
        return react(prop, this, 'del');
    },

    apply: function (prop) {
        this.onChange(prop);
    }
};

function clean(observer, name) {
    var proxy = observer.proxy[name];
    if (proxy) {
        delete proxy.memo;
    }
}

var listener = function (prop, handlerId, onChange, onDelete) {
    return {
        property: prop,
        handlerId: handlerId,
        onChange: onChange,
        onDelete: onDelete
    };
};

var notify = function (obj, prop, observer) {
    //update itself first
    clean(observer, prop);
    // dependencies lookup
    _.forIn(observer.deps, function (list, name) {
        if (_.isDependency(prop) && _.isEqual(list, [VALUE])) {
            clean(observer, name);
            observer.onChange(name);
        } else {
            _.forEach(list, function (item) {
                if (item === prop && name != prop) {
                    clean(observer, name);
                    observer.onChange(name);
                }
            });
        }
    });
};

var react = function (prop, observer, action) {
    var obj = observer.obj;
    notify(obj, prop, observer);
    _.debug('React on ' + action + ' for ' + prop);
    var val = obj[prop];
    _.forEach(observer.listeners, function (item) {
        var property = item.property;
        var test = _.isRegExp(property) && property.test(prop);
        if (test) {
            var fn = action === 'del' ? item.onDelete : item.onChange;
            if (_.isFunction(fn)) {
                val = _.safeCall(fn, obj, obj, prop, val);
            }
        }
    });
    return val;
};

var explore = function (obj, observer, context) {
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
        var dep = _.isDependency() && obj.$deps.indexOf(prop.substring(2)) != -1;
        var fullProp = context ? context + '.' + prop : prop;
        if (_.isObject(value) && !_.isArray(value) && !dep && prop != DEPS && prop !== (DEP_PREFIX + APP)) {
            _.debug("Exploring object " + prop);
            _.extend(visited, explore(value, observer, fullProp));
        }
        _.debug("Observing property " + prop);
        if (observeProperty(obj, prop, desc, observer, fullProp)) {
            visited.push(prop);
            observer.onChange(fullProp);
        }
        return true;
    });
    return visited;
};

var observeProperty = function (obj, prop, desc, observer, fullProp) {
    var proxy = observer[fullProp];
    if (_.isDefined(proxy)) {
        return false; //proxy already set
    }
    proxy = {
        get: desc.get,
        set: desc.set,
        value: desc.value,
        memo: desc.memo
    };

    var newGet = function () {
        var val = null;
        if (proxy.get) {
            val = proxy.get.call(this);
        } else {
            val = proxy.value;
        }
        if(_.isString(val) && val.indexOf('#{') == 0 && val.indexOf('}') == (val.length -1)) {
            var s = val.substring(2, val.length -1) || VALUE;
            val = function () {
                return this.$prop(s);
            }.val(s);
        }
        if (_.isFunction(val)) {
            if (val.$name == VALUE_FN) {
                if (_.isUndefined(proxy.memo)) {
                    observer.deps[fullProp] = val.$deps;
                    val = proxy.memo = _.safeCall(val, observer.obj);
                } else {
                    val = proxy.memo;
                }
            } else if (val.$name == CALC_FN) {
                val = _.safeCall(val, observer.obj);
            }
        }
        return val;
    };
    var newSet = function (val) {
        if (!_.isDependency(prop) && _.isEqual(proxy.value, val)) {
            return;
        }
        if (proxy.set) {
            proxy.set.call(this, val);
        } else {
            proxy.value = val;
        }
        if (!newSet._apply && !this._silent) {
            newSet._apply = true;
            observer.apply(fullProp);
            newSet._apply = false;
        }
    };
    newGet.call(obj);
    var enumerable = desc.enumerable;
    Object.defineProperty(obj, prop, {
        get: newGet,
        set: newSet,
        configurable: true,
        enumerable: enumerable
    });
    observer.proxy[fullProp] = proxy;
    return true;
};