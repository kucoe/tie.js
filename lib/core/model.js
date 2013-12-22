var modelUtil = function () {
    this.$prop = function (name, value) {
        var res = this;
        var split = name.split('.');
        var i = 1;
        var length = split.length;
        while (i < length) {
            res = res[split[i - 1]];
            i++;
            if (_.isUndefined(res)) {
                return undefined;
            }
        }
        var last = split[length - 1];
        if (_.isUndefined(value)) {
            return res[last];
        } else {
            res[last] = value;
        }
        return undefined;
    };

    this.$ready = function () {
        if(_.isDefined(this._ready)) {
            return this._ready;
        }
        this._ready = true;
        _.forEach(this.$deps, function (dep) {
            var d = this[DEP_PREFIX + dep];
            if (!d || d._empty) {
                this._ready = false;
                return false;
            }
            return true;
        }, this);
        return this._ready;
    };
};

modelUtil.prototype = _;

var model = function (obj) {
    _.extend(this, obj);
};

model.prototype = new modelUtil();