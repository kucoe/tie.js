var pipesRegistry = {};

/**
 * Pipes helpers. Exported to allow create and access pipes.
 *
 * @param {string} name pipe name
 * @param {Function} [fn] pipe function that will accept. If not defined existed pipe will return.
 * @param {Object} [opts] options (canWrite, changeRoutes, changeAttrs, async) default to false
 */
var pipes = function (name, fn, opts) {
    if (_.isUndefined(fn)) {
        return pipesRegistry[name];
    }
    var defOpts = {
        canWrite: false,
        changeRoutes: false,
        changeAttrs: false,
        async: false
    };
    if (_.isDefined(opts)) {
        _.extend(defOpts, opts);
    }
    var pipe = {
        fn: fn,
        opts: defOpts
    };
    var m = new model(pipe);
    pipesRegistry[name] = m;
    return m;
};

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
    this.params = '';
    if (split.length > 1) {
        var p = split[1];
        p = _.trim(p);
        p = '[' + p + ']';
        this.params = p;
    }

};

pipe.prototype = {

    /**
     * Process model from bind and returns new model after pipe execution
     *
     * @this pipe
     * @param {model} obj tied model
     * @param {Object} [value] new object value
     * @param {Function} [next] function to be passed to asynchronous pipe
     */
    process: function (obj, value, next) {
        var pipe = pipesRegistry[this.name];
        if (!pipe) {
            throw new Error('Pipe ' + this.name + ' not found');
        }
        var fn = pipe.fn;
        var params = [];
        if (this.params.length > 0) {
            var context = _.extend({}, obj);
            context = _.extend(context, pipe);
            var array = _.convert(this.params, context);
            _.forEach(array, function (param) {
                param = _.trim(param);
                params.push(param);
            });
        }
        var res = _.isDefined(value) && this.canWrite() ? obj : _.clone(obj);
        if (fn && _.isFunction(fn)) {
            res = safeCall(fn, pipe, true, res, params, value, next);
        }
        return res;
    },

    /**
     * Returns whether this pipe uses asynchronous calls.
     *
     * @this pipe
     * @return boolean
     */
    async: function () {
        var pipe = pipesRegistry[this.name];
        return pipe ? pipe.opts.async : false;
    },

    /**
     * Returns whether this pipe can change object value.
     *
     * @this pipe
     * @return boolean
     */
    canWrite: function () {
        var pipe = pipesRegistry[this.name];
        return pipe ? pipe.opts.canWrite : false;
    },

    /**
     * Returns whether this pipe can change routes.
     *
     * @this pipe
     * @return boolean
     */
    changeRoutes: function () {
        var pipe = pipesRegistry[this.name];
        return pipe ? pipe.opts.changeRoutes : false;
    },

    /**
     * Returns whether this pipe can change attributes.
     *
     * @this pipe
     * @return boolean
     */
    changeAttrs: function () {
        var pipe = pipesRegistry[this.name];
        return pipe ? pipe.opts.changeAttrs : false;
    }
};
