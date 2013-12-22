var wrap = function (el, obj) {
    var that = this;
    var name = obj.$name;
    var tagName = el.tagName;
    var listener = function (event) {
        _.debug("Fired '" + event.type + "' listener on '" + name + "' for element " + tagName);
        var value = that.value();
        value = _.trim(value);

        var prop = that.property;
        if (obj.$prop(prop) !== value) {
            obj.$prop(prop, value);
        }
    };
    var idx = el.getAttribute(INDEX);
    this.$ = el;
    this._id = el.getAttribute(ID) || _.uid();
    this.index = idx ? parseInt(idx) : -1;
    this.tie = el.getAttribute(TIE);
    this.property = this.getProperty(this.tie);
    this.events = {};
    this.isSelect = _.eqi(tagName, 'select');
    this.isInput = _.eqi(tagName, 'input') || _.eqi(tagName, 'textarea') || this.isSelect;
    this.hasCheck = _.eqi(el.type, 'radio') || _.eqi(el.type, 'checkbox');
    this.display = el.style.display;
    this.shown = true;
    this.textEl = null;

    if (this.isInput) {
        if (!this.hasCheck && !this.isSelect) {
            if ('oninput' in el) {
                _.debug("Added input listener on '" + name + "' for element " + tagName);
                el.addEventListener('input', listener);
            } else {
                _.debug("Added keydown listener on '" + name + "' for element " + tagName);
                el.addEventListener('keydown', function (event) {
                    var key = event.keyCode;
                    // ignore command         modifiers                   arrows
                    if (key === 91 || (15 < key && key < 19) || (37 <= key && key <= 40)) return;
                    listener(event);
                });
            }
        } else {
            _.debug("Added change listener on '" + name + "' for element " + tagName);
            el.addEventListener('change', listener);
        }
    }
};

wrap.prototype = {

    getProperty: function (string) {
        string = _.trim(string || '');
        var tokens = string.split('|');
        var t = tokens[0];
        var dot = t.indexOf('.');
        if (dot != -1) {
            return t.substring(dot + 1);
        }
        return VALUE;
    },

    isTied: function () {
        return this.$.getAttribute(TIED);
    },

    setAttribute: function (name, value, obj) {
        if (VALUE === name) {
            this.value(value);
        } else if (TEXT === name) {
            this.text(value);
        } else if (CLASS === name) {
            dom.addClass(this.$, value);
        } else if (_.isFunction(value)) {
            var handler = this.events[name];
            if (handler) {
                this.$.removeEventListener(name, handler);
            }
            var that = this;
            handler = function (event) {
                event.index = that.index;
                event.tie = that.tie;
                _.safeCall(value, obj, event);
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
        var el = this.$;
        if (this.hasCheck) {
            if (_.isDefined(val)) {
                if (val) {
                    el.setAttribute('checked', 'checked');
                } else {
                    el.removeAttribute('checked');
                }
            } else {
                return el.checked;
            }
        } else if (this.isSelect) {
            if (_.isDefined(val)) {
                var options = [].slice.call(el.options);
                _.forEach(options, function (item, i) {
                    if (_.isEqual(item.value, val)) {
                        el.selectedIndex = i;
                        return false;
                    }
                    return true;
                });
            } else {
                return el.options[el.selectedIndex].value;
            }
        } else if (this.isInput) {
            if (_.isDefined(val)) {
                el.value = val;
            } else {
                return el.value;
            }
        } else {
            return this.text(val);
        }
        return null;
    },

    text: function (text) {
        var el = this.$;
        if (_.isDefined(text)) {
            if (this.isInput) {
                if (this.textEl == null) {
                    this.textEl = document.createElement('span');
                    this.insertAfter(this.textEl);
                }
                this.textEl.textContent = text;
            } else if (this.isSelect) {
                _.forEach(el.options, function (item, i) {
                    if (_.isEqual(item.text, text)) {
                        el.selectedIndex = i;
                        return false;
                    }
                    return true;
                });
            } else {
                el.textContent = text
            }
        } else {
            if (this.isInput) {
                return el.nextSibling.textContent || '';
            } else if (this.isSelect) {
                return el.options[el.selectedIndex].text;
            } else {
                return el.textContent || '';
            }
        }
        return null;
    },

    html: function (html) {
        var el = this.$;
        if (_.isDefined(html)) {
            if (!this.isInput && !this.isSelect) {
                el.innerHTML = html;
            }
        } else {
            if (!this.isInput && !this.isSelect) {
                return el.innerHTML || '';
            }
        }
        return null;
    },

    remove: function () {
        var element = this.$;
        delete this.$;
        delete this._id;
        delete this.isInput;
        delete this.hasCheck;
        delete  this.events;
        dom.remove(element);
    },

    insertAfter: function (newElements) {
        var index = this.$;
        dom.insertAfter(index, newElements);
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