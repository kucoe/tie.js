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
    var ITEM_NAME = '_item_name';

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

    var valueFn = function (obj, idx, bindReady) {
        var name = this.name;
        var val = this.value;
        var property = this.property;

        if (_.isUndefined(bindReady)) {
            bindReady = obj.$ready();
        }

        if (_.isFunction(val)) {
            return _.safeCall(val, obj, bindReady)
        } else {
            if (property && _.isUndefined(val)) {
                return findProperty(obj, property, idx);
            }
            if (!name) {
                throw new Error("Where is your property?")
            }
            return findProperty(obj, name, idx);
        }
    };

    var findProperty = function (obj, name, idx) {
        if (_.isUndefined(idx)) {
            idx = -1;
        }
        var values = obj.$values;
        if (idx >= 0 && values && _.isDefined(values[idx][name])) {
            return values[idx][name];
        }
        if (idx >= 0 && values && VALUE == name) {
            return values[idx];
        }
        return obj.$prop(name);
    };

    var renders = {};

    var renderer = function (obj) {
        this.obj = obj;
        this.obj.$shown = true;
        this.values = {};
        this.rendered = false;
        this.rendering = false;
        this.loaded = false;
        this.loading = false;
        this.selected = false;
        this.e = 0;
        this.$ = [];
    };

    renderer.prototype = {
        prepareAttrs: function (attrs) {
            if (attrs) {
                if (_.isArray(attrs)) {
                    attrs = attrs._({});
                }
                _.forIn(attrs, function (attr, name) {
                    if (_.isString(attr) && attr[0] == '#') {
                        attr = {name: name, property: attr.substring(1)}
                    } else if (_.isFunction(attr)) {
                        attr = {name: name, value: attr}
                    } else if (attr[ITEM_NAME]) {
                        attr = {name: attr[ITEM_NAME]};
                    } else {
                        attr = {name: name, value: attr}
                    }
                    attr.val = valueFn;
                    attrs[name] = attr;
                }, this);
            }
            return attrs;
        },

        select: function () {
            var obj = this.obj;
            var name = obj.$name;
            var query = document.querySelectorAll;
            var nodes = query('[' + TIE + '="' + name + '"]');
            var res = [];
            _.forEach(nodes, function (el) {
                res.push(new $(el, obj));
            });
            nodes = query('[' + TIE + '^="' + name + '|"]');
            _.forEach(nodes, function (el) {
                res.push(new $(el, obj));
            });
            nodes = query('[' + TIE + '^="' + name + ' |"]');
            _.forEach(nodes, function (el) {
                res.push(new $(el, obj));
            });
            nodes = query('[' + TIE + '^="' + name + '."]');
            _.forEach(nodes, function (el) {
                res.push(new $(el, obj));
            });
            obj.selected = true;
            return res;
        },

        load: function () {
            this.loading = true;
            if (!this.selected) {
                this.$ = this.select();
                this.e = this.$.length;
                _.debug("Elements selected: " + this.$.length);
            }
            this.loaded = true;
            this.loading = false;
        },

        renderAttr: function (attr, obj, idx, ready, el) {
            var name = attr.name;
            var val = attr.val(obj, idx, ready);
            _.debug("Render attribute '" + name + "' with value " + val);
            el.setAttribute(name, val);
        },

        render: function (property, force) {
            var obj = this.obj;
            if (!obj.$shown || (this.rendering && !force)) {
                return;
            }
            this.rendering = true;
            var tieName = obj.$name;
            _.debug("Render " + tieName, tieName + " Render");
            if (!this.loaded && !this.loading) {
                this.load();
            }
            var ready = obj.$ready();
            _.forEach(this.$, function (el) {
                if (el) {
                    var attrs = obj.$attrs;
                    var idx = el.index;
                    if (attrs) {
                        if (property) {
                            var attr = attrs[property];
                            if (attr) {
                                this.renderAttr(attr, obj, idx, ready, el);
                            }
                        } else {
                            _.forIn(attrs, function (attr) {
                                this.renderAttr(attr, obj, idx, ready, el);
                            }, this);
                            el.setAttribute(TIED);
                            if (el.isInput) {
                                el.setAttribute('name', tieName);
                            }
                        }
                    }
                }
            }, this);
            this.rendering = false;
            this.rendered = true;
            _.debug("Rendered " + tieName);
        },

        show: function (shown) {
            console.log('Rendered ' + this.rendered);
            if (this.rendered) {
                _.forEach(this.$, function (el) {
                    if (el) {
                        el.show(shown);
                    }
                }, this);
            }
        }
    };

    var handle = window.tie.handle;

    var add = function (obj, watcher) {
        var r = new renderer(obj);
        renders[obj.$name] = r;
        watcher.add('_deleted', function (obj) {
            delete renders[obj.$name];
        });
        watcher.add('*', function (obj, prop) {
            r.render(prop);
        });
        return r;
    };

    handle("attrs", function (obj, config, watcher) {
        if (config) {
            var r = add(obj, watcher);
            config = r.prepareAttrs(config);
            setTimeout(function () {
                r.render();
            }, 200);
        }
        return config;
    });

    handle("shown", function (obj, config, watcher) {
        var r = renders[obj.$name];
        console.log('On show ' + r.rendered);
        if (!r) {
            r = add(obj, watcher);
            r.show(config);
        }
        return config;
    });

    if (typeof window.exports === 'object') {
        window.exports = function () {
            var res = {};
            res.q = q;
            res.el = $;
            res.renders = renders;
            return res;
        };
    }

})(window);

