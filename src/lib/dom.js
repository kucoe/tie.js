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

    var $ = function (el, bind) {
        var that = this;
        var listener = function (event) {
            _.debug("Fired '" + event.type + "' listener on '" + bind.name + "' for element " + el.tagName);
            var value = that.value();
            value = _.trim(value);

            if (that.pipes.length > 0) {
                that.pipeline(function () {
                }, value);
            } else {
                if (bind.obj.value !== value) {
                    bind.obj.value = value;
                }
            }
        };

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

        if (this.isInput) {
            if (!this.hasCheck) {
                if ('oninput' in el) {
                    _.debug("Added input listener on '" + bind.name + "' for element " + el.tagName);
                    el.addEventListener('input', listener);
                } else {
                    _.debug("Added keydown listener on '" + bind.name + "' for element " + el.tagName);
                    el.addEventListener('keydown', function (event) {
                        var key = event.keyCode;
                        // ignore command         modifiers                   arrows
                        if (key === 91 || (15 < key && key < 19) || (37 <= key && key <= 40)) return;
                        listener(event);
                    });
                }
            } else {
                _.debug("Added change listener on '" + bind.name + "' for element " + el.tagName);
                el.addEventListener('change', listener);
            }
        }

        var pipes = this.tie.replace(/\.([^.|]+(\.[^.|]+)*)/g, '|property:"$1"').match(/[^|]+/g).splice(1);
        this.pipes = [];
        _.forEach(pipes, function (string) {
            this.pipes.push(new pipe(string));
        }, this);

        this.pipeline = function (next, value) {
            var orig = this.bind.obj;
            var res = orig;
            if (this.pipes.length > 0) {
                _.sequence(this.pipes, function (pipe, next) {
                    var update = function (data) {
                        res = data;
                        if (pipe.updateRoutes() && _.isUndefined(value) && _.isFunction(res.$location)) {
                            res.$shown = res.$location().route.has(res);
                        }
                        if ((_.isDefined(value) && pipe.updateModel()) || (pipe.fetchModel() && _.isUndefined(value))) {
                            _.extend(orig, data);
                            res._fetched  = orig._fetched = true;

                        }
                        next(res);
                    };
                    var c;
                    var clone = _.clone(res);
                    if (_.isDefined(value)) {
                        c = pipe.process(clone, update, value);
                    } else {
                        c = pipe.process(clone, update);
                    }
                    if (c) {
                        update(c);
                    }

                }, function () {
                    if (next) {
                        next(res);
                    }
                })
            } else {
                next(res);
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
                    safeCall(value, that.bind.obj, that.bind.obj.$ready(), event);
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

        text: function (text) {
            if (_.isDefined(text)) {
                if (this.isInput) {
                    if (this.textEl == null) {
                        this.textEl = document.createElement('span');
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

    if (typeof window.exports === 'object') {
        window.exports = function () {
            var res = {};
            res.q = q;
            res.$ = $;
            return res;
        };
    }

})(window);

