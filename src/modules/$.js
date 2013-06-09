var INDEX = "data-index";
var TIE = "data-tie";
var TIED = "data-tied";

/**
 * @description
 * DOM manipulations
 */
var q = {

    /**
     * @description
     * Appends list of elements to the index element
     *
     * @param {Node} index index node after which new elements will go.
     * @param {Node|Array} newElements one or more elements
     */
    next: function (index, newElements) {
        var parent = index.parentNode;
        _.forEach(newElements, function (node) {
            parent.insertBefore(node, index.nextSibling);
            index = node;
        });
    },

    /**
     * @description
     * Removes element
     *
     * @param {Node} element element to remove.
     */
    remove: function (element) {
        var parent = element.parentNode;
        if (parent) parent.removeChild(element);
    },

    /**
     * @description
     * Adds on load on hash change listener with callback specified.
     *
     * Note: callback will be called when document loaded or instantly if document is already loaded
     * and every time when hash is changed.
     *
     * @param {Function} fn function to call.
     */
    ready: function (fn) {
        // check if document already is loaded
        if (document.readyState === 'complete') {
            setTimeout(fn, 0);
        } else {
            window.addEventListener('load', fn);
        }
        window.addEventListener('hashchange', fn);
    }
};

/**
 * @description
 * DOM element wrapper
 *
 * @param {Node} el DOM element.
 * @param {bind} bind element bound tie
 * @returns wrapper.
 */
var $ = function (el, bind) {
    var listener = function () {
        var value = this.value();
        value = _.trim(value);

        if (bind.$attrValue(VALUE) !== value) {
            bind.$attrValue(VALUE, value);
        }
    }.bind(this);
    if (_.isDefined(el.value)) {
        if ('oninput' in el) {
            el.addEventListener('input', listener);
        } else {
            el.addEventListener('keydown', function (event) {
                var key = event.keyCode;
                // ignore command         modifiers                   arrows
                if (key === 91 || (15 < key && key < 19) || (37 <= key && key <= 40)) return;
                listener(event);
            });
        }
    }
    el.addEventListener('change', listener);
    var idx = el.getAttribute(INDEX);
    this.$ = el;
    this._id = _.uid();
    this.index = idx ? parseInt(idx) : -1;
    this.tie = el.getAttribute(TIE).replace(/\.([^.|1-9]+)/g,'|property:"$1"');
    this.bind = bind;
    this.events = {};
    this.isInput = _.eqi(el.tagName, 'input');
    this.hasCheck = _.eqi(el.type, 'radio') || _.eqi(el.type, 'checkbox');
    this.display = el.style.display;
    this.shown = true;
    this.textEl = null;
    var pipes = this.tie.match(/[^|]+/g);
    this.pipes = [];
    _.forEach(pipes, function (string) {
        this.pipes.push(new pipe(string));
    }, this);
};

$.prototype = {

    /**
     * @description
     * Apply element attribute. Has polymorphic behavior.
     * For attribute "value" calls this {$.value},
     * for attribute "text" calls this {$.text},
     * for function value adds event handler
     * else simple set attributes element.
     *
     * @param {string} name attribute name.
     * @param {*} value attribute value.
     */
    setAttribute: function (name, value) {
        if (VALUE === name) {
            this.value(value);
        } else if (TEXT === name) {
            this.text(value);
        } else if (_.isFunction(value)) {
            var obj = this.bind.obj;
            var bind = this.bind;
            var handler = this.events[name];
            if (handler) {
                this.$.removeEventListener(name, handler);
            }
            handler = function (event) {
                safeCall(value, obj, bind.$ready(), event);
            };
            this.events[name] = handler;
            this.$.addEventListener(name, handler);
        } else {
            if (_.isDefined(value)) {
                this.$.setAttribute(name, value);
            } else {
                this.$.setAttribute(name, "");
            }
        }
    },

    /**
     * @description
     * Apply elements value or return current value if parameter is empty. Has polymorphic behavior.
     * For input that has check checked attribute will be used,
     * for other inputs value attribute will be used,
     * else {$.text} will be called.
     *
     * @param {*} val value.
     */
    value: function (val) {
        if (this.hasCheck) {
            if (_.isDefined(val)) {
                if (val) {
                    this.$.setAttribute('checked', 'checked');
                } else {
                    this.$.removeAttribute('checked');
                }
            } else {
                return this.$.checked;
            }
        } else if (this.isInput) {
            if (_.isDefined(val)) {
                this.$.value = val;
            } else {
                return this.$.value;
            }
        } else {
            return this.text(val);
        }
        return null;
    },

    /**
     * @description
     * Apply elements text content or return current text content if parameter is empty. Has polymorphic behavior.
     * For input next sibling text node will be used,
     * else underlying element text content will be used.
     *
     * @param {string} text value.
     */
    text: function (text) {
        if (_.isDefined(text)) {
            if (this.isInput) {
                if (this.textEl == null) {
                    this.textEl = window.document.createElement('span');
                    this.next(this.textEl);
                }
                this.textEl.textContent = text;
            } else {
                this.$.textContent = text
            }
        } else {
            if (this.isInput) {
                return this.$.nextSibling.textContent || '';
            } else {
                return this.$.textContent || '';
            }
        }
        return null;
    },

    /**
     * @description
     * Removes underlying element from document and utilize current object from bind.
     */
    remove: function () {
        var element = this.$;
        var array = this.bind.$;
        array.splice(array.indexOf(this), 1);
        delete this.$;
        delete this.bind;
        delete this._id;
        delete this.isInput;
        delete this.hasCheck;
        delete  this.events;
        q.remove(element);
    },

    /**
     * @description
     * Appends list of elements to current element
     *
     * @param {Node|Array} newElements one or more elements
     */
    next: function (newElements) {
        var index = this.$;
        q.next(index, newElements);
    },

    /**
     * @description
     * Show/hide current element. Uses style display property. Stores last display value to use it for restoring.
     *
     * @param {boolean} show
     */
    show: function (show) {
        if (this.shown === show) {
            return;
        }
        if (!show) {
            this.display = this.$.style.display;
            this.$.style.display = 'none';
            if (this.textEl != null) {
                this.textEl.style.display = 'none';
            }
        } else {
            this.$.style.display = this.display;
            if (this.textEl != null) {
                this.textEl.style.display = this.display;
            }
        }
        this.shown = show;
    },

    /**
     * @description
     * Processes pipes of current element
     *
     * @returns new bind object according to pipes
     */
    pipe: function (ties) {
        var res = this.bind;
        if (this.pipes) {
            _.forEach(this.pipes, function (pipe) {
                res = pipe.process(res, ties);
            })
        }
        return res;
    }
};