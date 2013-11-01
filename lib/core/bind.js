var bind = function (name) {
    this.name = name;
    this.touch = [];
    this.props = [];
    this.newDynamicProps = [];
    this.processedHandles = [];
    this.values = {};
    this.applyCount = 0;
    this.timeout = null;
    this.currentProperty = null;
    this.watcher = new watcher(this);
};

bind.prototype = {
    apply: function (property) {
        if (property === this.currentProperty) {
            return;
        }
        this.currentProperty = property;
        this.applyCount++;
        if (this.applyCount > 10) {
            _.debug("Too many apply :" + this.name + " - " + this.applyCount);
        }
        _.debug("Calling apply on '" + this.name + "' after changed property '" + property + "'");
        if (property && property[0] == HANDLE_PREFIX) {
            var n = property.substring(1);
            var h = handlesRegistry[n];
            if (h) {
                this.resolveHandle(this.obj, n, h, this.processedHandles);
            }
        }
        if (property) {
            this.watcher.onChange(property, this.obj);
        }
        _.forEach(this.touch, function (item) {
            var bind = ties[item];
            if (bind) {
                bind.obj[DEP_PREFIX + this.name] = this.obj;
            }
        }, this);
        this.currentProperty = null;
        if (!this.timeout) {
            var that = this;
            this.timeout = setTimeout(function () {
                that.timeout = null;
                that.applyCount = 0;
            }, 3000);
        }
    },

    resolveHandles: function () {
        var name = this.name;
        var obj = this.obj;
        if (name != APP) {
            this.processedHandles = [];
            _.forIn(handlesRegistry, function (handle, prop) {
                if (this.processedHandles.indexOf(prop) == -1) {
                    this.resolveHandle(obj, prop, handle, this.processedHandles);
                }
            }, this);
        }
    },

    resolveHandle: function (obj, prop, handle, processed) {
        _.debug("Check handle " + prop);
        _.forEach(handle.$deps, function (item) {
            if (processed.indexOf(item) == -1) {
                var h = handlesRegistry[item];
                this.resolveHandle(obj, item, h, processed);
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
            this.currentProperty = n; //prevent apply update
            this.watcher.handlerId = handle._uid;
            this.watcher.remove();
            obj[n] = handle(obj, config, this.watcher, appConfig);
            this.watcher.handlerId = null;
            this.currentProperty = null;
        }
        processed.push(prop);
    }
};