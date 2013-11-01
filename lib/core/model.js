var modelUtil = {
    $prop: function (name, value) {
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
    },

    $ready: function () {
        var ready = true;
        _.forEach(this.$deps, function (dep) {
            var d = this[DEP_PREFIX + dep];
            if (!d || d._empty) {
                ready = false;
                return false;
            }
            return true;
        }, this);
        return ready;
    }
};

var handler = function () {
    _.extend(this, modelUtil);
};

handler.prototype = _;

var model = function (obj) {
    _.extend(this, obj);
};

model.prototype = new handler();