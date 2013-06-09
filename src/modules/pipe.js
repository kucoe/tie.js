var pipes = {};

var pipe = function (str) {
    var split = str.split(':');
    this.name = split[0];
    this.params = [];
    if (split.length > 1) {
        this.params = split[1].split(',');
    }

};

pipe.prototype = {
    process: function (bind, ties) {
        var tie = ties[this.name];
        if (!tie) {
            throw new Error('Pipe ' + this.name + ' not found');
        }
        var value = tie.$attrValue(VALUE);
        var params = [];
        if (this.params.length > 0) {
            _.forEach(this.params, function (param) {
                var res = _.convert(param);
                if (bind.$attrValue(param)) {
                    res = bind.$attrValue(param);
                } else if (pipes[param]) {
                    res = pipes[param];
                }
                params.push(res);
            });
        }
        var res = bind.obj;
        if (value && _.isFunction(value)) {
            return safeCall(value, tie, tie.$ready(), res, params);
        }
        return res;
    }
};
