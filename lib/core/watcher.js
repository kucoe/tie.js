var watcher = function (bind) {
    this.watchers = [];
    this.getters = [];
    this.bind = bind;
    this.handlerId = null;
};

watcher.prototype = {
    watch: function (prop, onChange, onDelete) {
        if (!prop || prop === '*') {
            prop = '.*';
        }
        if (onChange || onDelete) {
            var dyna = {
                property: toRegex(prop),
                handlerId: this.handlerId,
                onChange: onChange,
                onDelete: onDelete
            };
            this.watchers.push(dyna);
            return dyna;
        }
        return null;
    },

    add: function (prop, valueFn) {
        if (this.bind.props.indexOf(prop) == -1) {
            this.bind.newDynamicProps.push(prop);
            this.inspect();
        }
        if (this.bind.newDynamicProps.indexOf(prop) && valueFn) {
            var dyna = {
                property: prop,
                handlerId: this.handlerId,
                valueFn: valueFn
            };
            this.getters.push(dyna);
            return dyna;
        }
        return null;
    },

    remove: function () {
        var indexOf;
        if (arguments.length == 0 && this.handlerId) {
            _.forEach(this.watchers, function (dyna, i) {
                if (dyna.handlerId === this.handlerId) {
                    this.watchers.splice(i, 1);
                }
            }, this, true);
            _.forEach(this.getters, function (dyna, i) {
                if (dyna.handlerId === this.handlerId) {
                    this.getters.splice(i, 1);
                    indexOf = this.bind.newDynamicProps.indexOf(dyna.property);
                    if (indexOf != -1) {
                        this.bind.newDynamicProps.splice(indexOf, 1);
                    }
                }
            }, this, true);
        }
        var prop = arguments[0];
        if (_.isString(prop)) {
            _.forEach(this.watchers, function (dyna, i) {
                if (dyna.property.test(prop) || dyna.handlerId === prop) {
                    this.watchers.splice(i, 1);
                }
            }, this, true);
            _.forEach(this.getters, function (dyna, i) {
                if (dyna.property === prop || dyna.handlerId === prop) {
                    this.getters.splice(i, 1);
                    indexOf = this.bind.newDynamicProps.indexOf(prop);
                    if (indexOf != -1) {
                        this.bind.newDynamicProps.splice(indexOf, 1);
                    }
                }
            }, this, true);
        } else {
            indexOf = this.watchers.indexOf(prop);
            if (indexOf != -1) {
                this.watchers.splice(indexOf, 1);
            }
            indexOf = this.getters.indexOf(prop);
            if (indexOf != -1) {
                this.getters.splice(indexOf, 1);
                indexOf = this.bind.newDynamicProps.indexOf(prop.property);
                if (indexOf != -1) {
                    this.bind.newDynamicProps.splice(indexOf, 1);
                }
            }
        }
    },

    onGet: function (prop, obj, ready) {
        if (!ready) {
            ready = obj.$ready();
        }
        var val = null;
        _.forEach(this.getters, function (dyna) {
            if (dyna.property === prop) {
                var point = dyna.valueFn;
                if (_.isFunction(point)) {
                    val = _.safeCall(point, obj, ready, obj, prop, val);
                }
            }
        });
        return val;
    },

    onChange: function (prop, obj, ready) {
        if (!ready) {
            ready = obj.$ready();
        }
        var v = obj[prop];
        _.forEach(this.watchers, function (dyna) {
            if (dyna.property.test(prop)) {
                var point = dyna.onChange;
                if (_.isFunction(point)) {
                    _.safeCall(point, obj, ready, obj, prop, v);
                }
            }
        });
    },

    onDelete: function (prop, obj, ready) {
        if (!ready) {
            ready = obj.$ready();
        }
        _.forEach(this.watchers, function (dyna) {
            if (dyna.property.test(prop)) {
                var point = dyna.onDelete;
                if (_.isFunction(point)) {
                    _.safeCall(point, obj, ready, obj, prop);
                }
            }
        });
    },

    inspect: function () {
        if (this.bind) {
            proxy(this.bind);
        }
    }
};