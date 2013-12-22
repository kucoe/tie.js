var bind = function (name, obj) {
    this.name = name;
    this.reliers = [];
    this.processedHandles = [];
    this.applyCount = 0;
    this.obj = obj;
    this.observer = new observer(obj);
    var self = this;
    this.observer.apply = function (prop) {
        self.apply(prop);
    };
};

bind.prototype = {

    apply: function (property) {
        _.debug("Calling apply on '" + this.name + "' after changed property '" + property + "'");
        if (_.isHandle(property)) {
            var n = property.substring(1);
            var h = handlesRegistry[n];
            if (h) {
                this.resolveHandle(this.obj, n, h);
            }
        }
        if (property) {
            this.observer.onChange(property);
        }
        _.forEach(this.reliers, function (item) {
            var bind = ties[item];
            if (bind) {
                bind.obj[DEP_PREFIX + this.name] = this.obj;
                delete bind.obj._ready;
            }
        }, this);
    },

    resolveHandles: function () {
        var name = this.name;
        var obj = this.obj;
        if (name != APP) {
            this.processedHandles = [];
            _.forIn(handlesRegistry, function (handle, prop) {
                if (!this.processedHandles.contains(prop)) {
                    this.resolveHandle(obj, prop, handle);
                }
            }, this);
        }
    },

    resolveHandle: function (obj, prop, handle) {
        _.debug("Check handle " + prop);
        _.forEach(handle.$deps, function (item) {
            if (!this.processedHandles.contains(item)) {
                var h = handlesRegistry[item];
                if (h) {
                    this.resolveHandle(obj, item, h);
                }
            }
        }, this);
        var n = (HANDLE_PREFIX + prop);
        var config = obj[n];
        var appConfig = app ? app.obj[n] : undefined;
        if (_.isUndefined(config) && _.isDefined(appConfig)) {
            config = appConfig;
        }
        _.debug("Got handle config " + config);
        if (_.isDefined(config)) {
            this.observer.remove(handle._uid);
            obj._silent = true;
            obj[n] = handle(obj, config, this.observer, appConfig);
            delete obj._silent;
        }
        if (!this.processedHandles.contains(prop)) {
            this.processedHandles.push(prop);
        }
    },

    checkApplyCount: function () {
        this.applyCount++;
        if (this.applyCount > 10) {
            _.debug("Too many apply :" + this.name + " - " + this.applyCount);
        }
        if (!this.timeout) {
            var self = this;
            this.timeout = setTimeout(function () {
                self.timeout = null;
                self.applyCount = 0;
            }, 3000);
        }
    }
};
