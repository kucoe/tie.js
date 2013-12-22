var parser = function (string, fn, obj) {
    string = _.trim(string || "");
    var tokens = string.split('|');
    var t = tokens[0];
    var dot = t.indexOf('.');
    if (dot != -1) {
        tokens[0] = t.substring(dot);
        t = t.substring(0, dot);
    } else {
        tokens = tokens.splice(1);
    }
    if (!obj) {
        obj = tie(t);
    } else {
        if (obj.$name) {
            var r = ties[obj.$name];
            if (r) {
                obj = r.observer.unbind(obj);
            }
        }
        obj = pipeModel(obj);
    }
    _.forEach(tokens, function (item) {
        var p = parser.prototype.parse(item);
        var args = [p.name];
        args = _.extend(args, p.params);
        _.debug("Parsed pipe" + JSON.stringify(args));
        obj = obj.apply(obj, args);
    });
    if (_.isFunction(fn)) {
        return obj.apply(obj, [fn]);
    } else {
        return obj();
    }
};

parser.prototype = {
    parse: function (str) {
        var index = str.indexOf(':');
        var pipe = {};
        var hasParams = index != -1;
        pipe.name = _.trim(hasParams ? str.substr(0, index) : str);
        pipe.params = [];
        if (pipe.name.charAt(0) == '.') {
            pipe.params = [pipe.name.substring(1)];
            pipe.name = 'property';
            index = -1;
        }
        if (hasParams) {
            var p = _.trim(str.substr(++index));
            p = '[' + p + ']';
            var array = _.convert(p, {});
            _.forEach(array, function (param) {
                param = _.trim(param);
                pipe.params.push(param);
            });
        }
        return pipe;
    }
};