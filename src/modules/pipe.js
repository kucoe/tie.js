var pipesRegistry = {};

/**
 * Pipes helpers. Exported to allow create and access pipes.
 *
 * @param {string} name pipe name
 * @param {Function} [fn] pipe function that will accept. If not defined existed pipe will return.
 * @param {Object} [opts] options (updateModel, updateRoute, fetchModel) default to false
 */
var pipes = function (name, fn, opts) {
    if (_.isUndefined(fn)) {
        return pipesRegistry[name];
    }
    var defOpts = {
        fetchModel: false,
        updateModel: false,
        updateRoutes: false
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
    var index = str.indexOf(':');
    this.name = _.trim(index + 1 ? str.substr(0, index) : str);
    this.params = '';
    if (index >= 0) {
        var p = _.trim(str.substr(++index));
        p = '[' + p + ']';
        this.params = p;
    }

};

pipe.prototype = {

    /**
     * Process model from bind and passed it result to next function
     *
     * @this pipe
     * @param {model} obj tied model
     * @param {Function} next function to be passed to pipe
     * @param {Object} [value] new object value
     */
    process: function (obj, next, value) {
        var name = this.name;
        _.debug("Process pipe " + name);
        var pipe = pipesRegistry[name];
        if (!pipe) {
            throw new Error('Pipe ' + name + ' not found');
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
        var res = obj;
        if (fn && _.isFunction(fn)) {
            res = safeCall(fn, pipe, true, res, params, next, value);
        }
        _.debug("Ready pipe " + name);
        return res;
    },

    /**
     * Returns whether this pipe can fetch object model.
     *
     * @this pipe
     * @return boolean
     */
    fetchModel: function () {
        var pipe = pipesRegistry[this.name];
        return pipe ? pipe.opts.fetchModel : false;
    },

    /**
     * Returns whether this pipe can change object model.
     *
     * @this pipe
     * @return boolean
     */
    updateModel: function () {
        var pipe = pipesRegistry[this.name];
        return pipe ? pipe.opts.updateModel : false;
    },

    /**
     * Returns whether this pipe can change routes.
     *
     * @this pipe
     * @return boolean
     */
    updateRoutes: function () {
        var pipe = pipesRegistry[this.name];
        return pipe ? pipe.opts.updateRoutes : false;
    }

};
