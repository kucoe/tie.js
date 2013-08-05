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

        domReady: false,

        isListenersSet: false,

        readyListeners: [],

        readyFn: function () {
            _.forEach(this.readyListeners, function (listener) {
                setTimeout(listener, 100);
            });
            this.domReady = true;
        },

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
            if (fn) {
                // check if document already is loaded
                if (document.readyState === 'complete') {
                    setTimeout(fn, 0);
                } else {
                    if (this.isListenersSet) {
                        window.addEventListener('load', this.readyFn);
                    }
                }
                if (this.isListenersSet) {
                    window.addEventListener('hashchange', this.readyFn);
                    this.isListenersSet = true;
                }
                this.readyListeners.push(fn);
            }
            return this.domReady;
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

            var prop = that.getProperty();
            if (obj.$prop(prop) !== value) {
                obj.$prop(prop, value);
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

        getProperty: function () {
            var string = this.tie;
            string = _.trim(string || '');
            var tokens = string.split('|');
            var t = tokens[0];
            var dot = t.indexOf('.');
            if (dot != -1) {
                return t.substring(dot + 1);
            }
            var index = t.indexOf(':');
            var name = _.trim(index + 1 ? t.substr(0, index) : t);
            if (name === 'property') {
                if (index >= 0) {
                    var p = _.trim(t.substr(++index));
                    p = '[' + p + ']';
                    var array = _.convert(p, {});
                    return array[0];
                }
            }
            return VALUE;
        },

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

    var attrValue = function (name, value) {
        if (this.$attrs) {
            var attr = this.$attrs[name];
            if (_.isUndefined(value)) {
                if (attr) {
                    return attr.val(this);
                }
            } else {
                if (attr && attr.property) {
                    this.$prop(attr.property, value);
                } else if (attr) {
                    this.$prop(name, value);
                }
            }
        }
        return null;
    };

    var checkProperty = function (attr) {
        var name = attr.name;
        var index = name.indexOf('#');
        if (index != -1) {
            attr.name = name.substring(0, index);
            attr.property = name.substring(index + 1);
            attr.deps.push(attr.property);
        } else {
            attr.deps.push(name);
        }
        return attr;
    };

    var parse = window.tie.$;

    var renders = {};

    var renderer = function (obj) {
        this.obj = obj;
        obj.$shown = true;
        obj.$attr = attrValue;
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
        prepareAttrs: function (attrs, watcher) {
            if (attrs && _.isArray(attrs)) {
                var res = {};
                var r = this;
                _.forEach(attrs, function (attr) {
                    if (_.isString(attr)) {
                        attr = {
                            name: attr,
                            property: null,
                            deps: [],
                            value: null,
                            val: valueFn
                        };
                        attr = checkProperty(attr);
                    }
                    var name = attr.name;
                    if (attr.property || attr.value) {
                        watcher.add(name, function (obj) {
                            return obj.$attr(name);
                        });
                        watcher.watch(name, function (obj, prop, val) {
                            obj.$attr(name, val);
                        });
                    }
                    if (attr.deps.length > 0) {
                        var d = attr.deps.join('|');
                        watcher.watch(d, function () {
                            r.render(name);
                        });
                    }
                    res[name] = attr;
                });
                attrs = res;
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
            if (!this.rendered && property && !force) {
                return;
            }
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
                    obj = parse(el.tie, obj);
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

    var onReady = function () {
        _.debug("Render app");
        _.forIn(renders, function (r) {
            if (!r.rendered) {
                r.render();
            }
        });
        _.debug("Rendered app");
    };

    var add = function (obj, watcher, handlerId) {
        var r = new renderer(obj);
        renders[obj.$name] = r;
        watcher.watch('_deleted', function (obj, prop, val) {
            if (val) {
                delete renders[obj.$name];
                watcher.remove(handlerId)
            }
        });
        if (!q.ready()) {
            setTimeout(function () {
                r.render();
            }, 100);
        }
        return r;
    };

    handle("attr", function () {
        return attrValue;
    }, ['attrs'], true);

    handle("attrs", function (obj, config, watcher) {
        if (config) {
            var r = add(obj, watcher, this._uid);
            config = r.prepareAttrs(config, watcher);
        }
        return config;
    }, [], true);

    handle("shown", function (obj, config) {
        var r = renders[obj.$name];
        if (r) {
            r.show(config);
        }
        return config;
    }, ['attrs'], true);


    q.ready(onReady);

    window.tie.domReady = q.ready;

    window.tie.attr = function (name, value, dependencies) {
        var attr = {
            name: name,
            property: null,
            deps: dependencies || [],
            value: value,
            val: valueFn
        };
        if (value && name.indexOf('#') != -1) {
            throw new Error('Property and calculated value combination is not supported');
        }
        if (!value) {
            attr = checkProperty(attr);
        }
        return attr;
    };

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

