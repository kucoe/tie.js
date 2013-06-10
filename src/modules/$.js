/**
 * DOM manipulations functions
 *
 * @namespace q
 */
var q = {

    /**
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
     * Removes element
     *
     * @param {Node} element element to remove.
     */
    remove: function (element) {
        var parent = element.parentNode;
        if (parent) parent.removeChild(element);
    },

    /**
     * Adds on load on hash change listener with callback specified.
     * <br>
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
 * DOM element wrapper
 *
 * @constructor
 * @class $
 * @this $
 * @param {Node} el DOM element.
 * @param {bind} bind element bound tie
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
    this.tie = el.getAttribute(TIE);
    this.bind = bind;
    this.events = {};
    this.isInput = _.eqi(el.tagName, 'input');
    this.hasCheck = _.eqi(el.type, 'radio') || _.eqi(el.type, 'checkbox');
    this.display = el.style.display;
    this.shown = true;
    this.textEl = null;
    var pipes = this.tie.replace(/\.([^.|1-9]+)/g, '|property:"$1"').match(/[^|]+/g).splice(1);
    this.pipes = [];
    _.forEach(pipes, function (string) {
        this.pipes.push(new pipe(string));
    }, this);
};

$.prototype = {

    /**
     * Apply element attribute. Has polymorphic behavior.<br>
     *  <ul>
     *      <li>For attribute "value" calls this {@link $#value},
     *      <li>for attribute "text" calls this {@link $#text},
     *      <li>for function value adds event handler
     *      <li>else simple set attributes element.
     *  </ul>
     *
     * @this $
     * @param {string} name attribute name.
     * @param {*} [value] attribute value.
     */
    setAttribute: function (name, value) {
        if (VALUE === name) {
            this.value(value);
        } else if (TEXT === name) {
            this.text(value);
        } else if (_.isFunction(value)) {
            var handler = this.events[name];
            if (handler) {
                this.$.removeEventListener(name, handler);
            }
            handler = function (event) {
                event.index = this.index;
                event.tie = this.tie;
                safeCall(value, this.bind.obj, this.bind.$ready(), event);
            }.bind(this);
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
     * Apply elements value or return current value if parameter is empty. Has polymorphic behavior.<br>
     *  <ul>
     *     <li>For input that has check checked attribute will be used,
     *     <li>for other inputs value attribute will be used,
     *     <li>else {@link $#text} will be called.
     *  </ul>
     * @this $
     * @param {*} [val] value.
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
     * Apply elements text content or return current text content if parameter is empty. Has polymorphic behavior.<br>
     *  <ul>
     *     <li>For input next sibling text node will be used,
     *     <li>else underlying element text content will be used.
     *  </ul>
     * @this $
     * @param {string} [text] value.
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
     * Removes underlying element from document and utilize current object from bind.
     *
     * @this $
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
     * Appends list of elements to current element
     *
     * @this $
     * @param {Node|Array} newElements one or more elements
     */
    next: function (newElements) {
        var index = this.$;
        q.next(index, newElements);
    },

    /**
     * Show/hide current element. Uses style display property. Stores last display value to use it for restoring.
     *
     * @this $
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
     * Processes pipes of current element
     *
     * @this $
     * @returns {model} new object according to pipes
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