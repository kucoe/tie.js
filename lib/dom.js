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
    var CLASS = "class";
    var NAME = "name";

    var dom = {

        domReady: false,

        readyListeners: [],

        fetched: [],

        readyFn: function () {
            _.forEach(this.readyListeners, function (listener) {
                setTimeout(listener, 100);
            });
            this.domReady = true;
        },

        insertAfter: function (index, newElements) {
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

        hasClass: function (el, cls) {
            return el.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));
        },

        addClass: function (el, cls) {
            if (!this.hasClass(el, cls)) {
                el.className += " " + cls;
                el.className = _.trim(el.className);
            }
        },

        removeClass: function (el, cls) {
            if (this.hasClass(el, cls)) {
                var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
                el.className = el.className.replace(reg, ' ');
                el.className = _.trim(el.className);
            }
        },

        ready: function (fn) {
            if (fn) {
                // check if document already is loaded
                if (document.readyState === 'complete') {
                    setTimeout(fn, 0);
                    this.domReady = true;
                } else {
                    if (this.readyListeners.length == 0) {
                        window.addEventListener('load', this.readyFn.bind(this));
                    }
                }
                if (this.readyListeners.length == 0) {
                    window.addEventListener('hashchange', this.readyFn.bind(this));
                }
                this.readyListeners.push(fn);
            }
            return this.domReady;
        },

        fetch: function (selector, base) {
            if (!base) {
                this.fetched = [];
                base = document;
            }
            var nodes = base.querySelectorAll(selector);
            _.forEach(nodes, function (el) {
                this.fetched.push(el);
            }, this);
        }
    };

    var wrap = function (el, obj) {
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

    wrap.prototype = {

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

        isTied: function () {
            return this.$.getAttribute(TIED);
        },

        setAttribute: function (name, value) {
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
            delete this.obj;
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

    var valueFn = function (obj, bindReady) {
        var property = this.property;
        if (_.isUndefined(bindReady)) {
            bindReady = obj.$ready();
        }
        if (_.isFunction(property)) {
            return _.safeCall(property, obj, bindReady)
        } else {
            return obj.$prop(property);
        }
    };

    var View = {

    };

    var Collection = function (array) {
        this.$render = function (obj, ready) {
            _.forEach(array, function (view) {
                view.$render(obj, ready);
            })
        };
    };

    var Element = function (view) {
        _.extend(this, view);
        this.$ = [];
        this.$select = function (obj, base) {
            var name = this.$tie;
            var res = [];
            if (dom.fetched.length == 0 || base) {
                dom.fetch('[' + TIE + ']', base);
            }
            _.forEach(dom.fetched, function (el) {
                if (el.getAttribute(TIE).indexOf(name) == 0) {
                    res.push(new wrap(el, obj));
                }
            });
            return res;
        };
        this.$render = function (obj, ready, prop) {
            if (this.$.length == 0) {
                this.$ = this.$select(obj);
                _.debug("Elements selected: " + this.$.length);
            }
            _.forEach(this.$, function (el) {
                if (el && !el.isTied()) {
                    if (prop) {
                        var p = this[prop];
                        if(p && _.isFunction(p.$render)){
                            p.$render(obj, ready, el);
                        }
                    } else {
                        _.forIn(view, function (val) {
                            val.$render(obj, ready, el);
                        }, this);
                    }
                }
                el.setAttribute(TIED);
                el.setAttribute(CLASS, obj.$name);
                if (el.isInput) {
                    el.setAttribute(NAME, obj.$name);
                }
            }, this);
        };
    };

    var Attr = function (name, value, prop, deps) {
        this.name = name;
        if (value) {
            this.val = function () {
                return value;
            }
        } else {
            this.deps = deps || [];
            if (!_.isFunction(prop)) {
                this.deps.push(prop);
            }
            this.property = prop;
            this.val = valueFn;
        }
        //TODO think on index
        this.$render = function (obj, ready, el) {
            var name = this.name;
            var val = this.val(obj, ready);
            _.debug("Render attribute '" + name + "' with value " + val);
            el.setAttribute(name, val);
        };
    };

    var prepareView = function (view, obj, name) {
        if (_.isArray(view)) {
            var res = {};
            _.forEach(view, function (item) {
                res.push(prepareView(item, obj));
            });
            return res;
        } else if (_.isFunction(view)) {
            var n = view.name || view.$name;
            if (VALUE === n) {
                return new Attr(VALUE, null, view, view.$deps);
            }
        } else if (_.isString(view) && view.charAt(0) === '#') {
            var property = view.substring(1) || name;
            return new Attr(name, null, property)
        } else if (_.isObject(view)) {
            _.forIn(view, function (value, prop) {
                if (VALUE === prop && _.isFunction(obj.value)) {
                    view[prop] = new Attr(VALUE, null, obj.value, [VALUE]);
                } else {
                    view[prop] = prepareView(value, obj, prop);
                }
            });
            return new Element(view);
        }
        return new Attr(name, view);
    };

    var parse = window.tie.$;

    var renders = {};

    var renderer = function (obj, view) {
        this.obj = obj;
        if (_.isUndefined(view.$shown)) {
            view.$shown = true;
        }
        if (!view.$tag) {
            view.$tag = 'div';
        }
        view.$tie = obj.$name;
        view._processedHandles = [];
        this.view = view;
        this.values = {};
        this.rendered = false;
        this.rendering = false;
    };

    renderer.prototype = {

        render: function (prop) {
            console.log('Rendering' + prop);
            if (!this.rendered && prop) {
                return;
            }
            if (this.rendering) {
                return;
            }
            this.rendering = true;
            var obj = this.obj;
            var view = this.view;
            var tieName = obj.$name;
            _.debug("Render " + tieName, tieName + " Render");
            var ready = obj.$ready();
            view.$render(obj, ready, prop);
            this.rendering = false;
            this.rendered = true;
            _.debug("Rendered " + tieName);
        },

        notify: function (property) {
            console.log('Notify' + property);
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

    var viewHandlers = {};

    var viewHandle = function (name, fn, dependencies, sealed) {
        var h = viewHandlers[name];
        if (_.isUndefined(fn)) {
            return  h;
        }
        if (h && h.$sealed) {
            throw new Error(name + ' view handle already registered and sealed. Please choose another name for your handle');
        }
        h = function (obj, config) {
            _.debug("Process view handle " + name);
            _.forEach(dependencies || [], function (item) {
                h['$$' + item] = viewHandlers[item];
            });
            if (fn && _.isFunction(fn)) {
                obj = _.safeCall(fn, h, true, obj, config);
            }
            _.debug("Processed view handle " + name);
            return obj;
        };
        _.close(h, name, sealed, dependencies);
        h = _.extend(h, _);
        viewHandlers[name] = h;
        return h;
    };

    var onReady = function () {
        _.debug("Render app");
        _.forIn(renders, function (r) {
            if (!r.rendered) {
                r.render();
            }
        });
        _.debug("Rendered app");
    };

    var resolveViewHandle = function (view, name) {
        var handle = viewHandlers[name];
        if (handle) {
            _.forEach(handle.$deps, function (item) {
                if (view._processedHandles.indexOf(item) == -1) {
                    resolveViewHandle(view, item);
                }
            });
            var c = view['$' + name];
            _.debug("View handle " + name + ' with config' + c);
            if (_.isDefined(c)) {
                view['$' + name] = handle(view, c);
            }
            if (view._processedHandles.indexOf(name) == -1) {
                view._processedHandles.push(name);
            }
        }
    };

    handle('view', function (obj, config, observer) {
        var handlerId = this._uid;
        var view = prepareView(config, obj);
        if (view instanceof Collection) {
            view = new Element({$values: view});
        } else if (view instanceof  Attr) {
            view.name = VALUE;
            view = new Element({value: view});
        }
        var r = new renderer(obj, view);
        renders[obj.$name] = r;
        observer.watch('.*', handlerId, function (obj, prop, val) {
            if ('_deleted' === prop && !!val) {
                delete renders[obj.$name];
                observer.remove(handlerId);
            } else if (prop.indexOf('$view.') == 0) {
                var vh = prop.replace('$view.', '');
                if (vh && vh[0] == '$') {
                    var name = vh.substring(1);
                    resolveViewHandle(view, name);
                }
                r.render(prop);
            } else {
                r.notify(prop);
            }
        });
        _.forIn(viewHandlers, function (handle, prop) {
            if (view._processedHandles.indexOf(prop) == -1) {
                resolveViewHandle(view, prop);
            }
        }, this);
        if (dom.ready()) {
            setTimeout(function () {
                r.render()
            }, 100);
        }
        return view;
    }, [], true);

    viewHandle("shown", function (obj, config) {
        var r = renders[obj.$name];
        if (r) {
            r.show(config);
        }
        return config;
    }, [], true);

    dom.ready(onReady);

    window.tie.domReady = dom.ready;
    window.tie.viewHandle = viewHandle;

    if (typeof window.exports === 'object') {
        window.exports = function () {
            var res = {};
            res.q = dom;
            res.el = wrap;
            res.renders = renders;
            res.clean = function () {
                dom.fetched = [];
                res.renders = renders = {};
            };
            return res;
        };
    }

})(window);

