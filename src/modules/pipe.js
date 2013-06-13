/**
 * Pipes helpers. Exported to allow assign pipe parameters.
 */
var pipes = {};

/**
 * Pipe descriptor. Pipe is the way of transforming input model into new model and hijack new values when rendering element
 * attributes. Here is a pipe example : <i>data|property:'name', 'a'</i>. The result will be model with changed property name to 'a'.
 * <br><i>data|property:'name'</i> will replace property 'value' with value from property 'name'.
 * <br>Simpler form is <i>data.name</i>.
 *
 * @constructor
 * @class pipe
 * @this pipe
 * @param {string} str pipe string.
 */
var pipe = function (str) {
    var split = str.split(':');
    this.name = _.trim(split[0]);
    this.params = [];
    if (split.length > 1) {
        this.params = split[1].split(',');
    }

};

pipe.prototype = {

    /**
     * Process model from bind and returns new model after pipe execution
     *
     * @this pipe
     * @param {model} obj tied model
     * @param {Object} ties named ties object
     * @param {Object} [value] new object value
     */
    process: function (obj, ties, value) {
        var tie = ties[this.name];
        if (!tie) {
            throw new Error('Pipe ' + this.name + ' not found');
        }
        var callback = tie.obj[CALLBACK];
        var params = [];
        if (this.params.length > 0) {
            _.forEach(this.params, function (param) {
                param = _.trim(param);
                var res = _.convert(param);
                if (obj[param]) {
                    res = obj[param];
                } else if (pipes[param]) {
                    res = pipes[param];
                }
                params.push(res);
            });
        }
        var res = _.isDefined(value) ? obj : _.clone(obj);
        if (callback && _.isFunction(callback)) {
            res = safeCall(callback, tie.obj, tie.obj.$ready(), res, params, value);
        }
        return res;
    }
};
