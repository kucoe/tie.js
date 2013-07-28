/**
 * Tie.js DOM handle
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */
(function (window) {
    'use strict';

    var _ = window.tie._;
    var document = window.document;

    var VALUE = 'value';
    var TEXT = 'text';

    var INDEX = "data-index";
    var TIE = "data-tie";
    var TIED = "data-tied";

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

    var $ = function (el, obj) {
        var that = this;
        var name = obj.$name;
        var tagName = el.tagName;
        var listener = function (event) {
            _.debug("Fired '" + event.type + "' listener on '" + name + "' for element " + tagName);
            var value = that.value();
            value = _.trim(value);

            //TODO pointcut
            if (obj.value !== value) {
                obj.value = value;
            }
        };
        var idx = el.getAttribute(INDEX);
        this.$ = el;
        this._id = _.uid();
        this.index = idx ? parseInt(idx) : -1;
        this.tie = el.getAttribute(TIE);
        this.obj = obj;
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

    $.prototype = {

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
                var that = this;
                handler = function (event) {
                    event.index = that.index;
                    event.tie = that.tie;
                    _.safeCall(value, that.obj, that.obj.$ready(), event);
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
                    var options = Array.prototype.slice.call(el.options);
                    _.forEach(options, function (item, i) {
                        console.log(i);
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
                        this.next(this.textEl);
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

        remove: function () {
            var element = this.$;
            delete this.$;
            delete this.obj;
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

    var renderer = function(obj) {
        this.values = {};
        this.rendered = false;
        this.rendering = false;
        this.loaded = false;
        this.loading = false;
        this.selected = false;
        this.e = 0;
        this.$ = [];
    };

    tie.handle("render", function (obj, config) {
        if(config) {
            return renderer(obj);
        }
        return config;
    });

    tie.handle("shown", function (obj, config) {

        return config;
    });

    if (typeof window.exports === 'object') {
        window.exports = function () {
            var res = {};
            res.q = q;
            res.el = $;
            return res;
        };
    }

})(window);

