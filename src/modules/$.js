var q = {
    next: function (index, newElements) {
        var parent = index.parentNode;
        _.forEach(newElements, function (node) {
            parent.insertBefore(node, index.nextSibling);
            index = node;
        });
    },

    remove: function (element) {
        var parent = element.parentNode;
        if (parent) parent.removeChild(element);
    },

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

var $ = function (el, tied) {
    var listener = function () {
        var value = this.value();
        value = _.trim(value);

        if (tied.obj[VALUE] !== value) {
            tied.obj[VALUE] = value;
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
    this.$ = el;
    this._id = _.uid();
    this.tied = tied;
    this.events = {};
    this.isInput = _.eqi(el.tagName, 'input');
    this.hasCheck = _.eqi(el.type, 'radio') || _.eqi(el.type, 'checkbox');
    this.display = el.style.display;
    this.shown = true;
    this.textEl = null;
};

$.prototype = {
    setAttribute: function (name, value) {
        if (VALUE === name) {
            this.value(value);
        } else if (TEXT === name) {
            this.text(value);
        } else if (_.isFunction(value)) {
            var obj = this.tied.obj;
            var handler = this.events[name];
            if (handler) {
                this.$.removeEventListener(name, handler);
            }
            handler = function (event) {
                value.call(obj, event);
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

    value: function (val) {
        var v;
        if (this.hasCheck) {
            if (_.isDefined(val)) {
                if (val) {
                    this.$.setAttribute('checked', 'checked');
                } else {
                    this.$.removeAttribute('checked');
                }
            } else {
                v = this.$.checked;
            }
        } else if (this.isInput) {
            if (_.isDefined(val)) {
                this.$.value = val;
            } else {
                v = this.$.value;
            }
        } else {
            v = this.text(val);
        }
        return v;
    },

    text: function (text) {
        var v = null;
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
                v = this.$.nextSibling.textContent || '';
            } else {
                v = this.$.textContent || '';
            }
        }
        return v;
    },

    remove: function () {
        var element = this.$;
        var array = this.tied.$;
        delete array[array.indexOf(this)];
        delete this.$;
        delete this.tied;
        delete this._id;
        delete this.isInput;
        delete this.hasCheck;
        delete  this.events;
        q.remove(element);
    },

    next: function (newElements) {
        var index = this.$;
        q.next(index, newElements);
    },

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
    }
};