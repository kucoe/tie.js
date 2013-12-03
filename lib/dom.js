/**
 * Tie.js DOM handle
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */
(function (window) {
    'use strict';

    var document = window.document;
    var _ = window.tie._;
    var parse = window.tie.$;

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

        hasClass: function (elem, className) {
            return new RegExp(' ' + className + ' ').test(' ' + elem.className + ' ');
        },

        addClass: function (elem, className) {
            if (!this.hasClass(elem, className)) {
                elem.className += ' ' + className;
            }
        },

        removeClass: function (elem, className) {
            var newClass = ' ' + elem.className.replace(/[\t\r\n]/g, ' ') + ' ';
            if (this.hasClass(elem, className)) {
                while (newClass.indexOf(' ' + className + ' ') >= 0) {
                    newClass = newClass.replace(' ' + className + ' ', ' ');
                }
                elem.className = newClass.replace(/^\s+|\s+$/g, '');
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

            var prop = that.property;
            if (obj.$prop(prop) !== value) {
                obj.$prop(prop, value);
            }
        };
        var idx = el.getAttribute(INDEX);
        this.$ = el;
        this._id = _.uid();
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
                    _.safeCall(value, obj, obj && obj.$ready(), event);
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

    var Attr = function (name, value, prop, deps) {
        this.name = name;
        if (value) {
            this.value = value;
            this.$get = function () {
                return value;
            }
        } else {
            this.deps = deps || [];
            this.$get = function (obj, bindReady) {
                if (_.isFunction(prop)) {
                    return _.safeCall(prop, obj, bindReady)
                } else {
                    return obj.$prop(prop);
                }
            };
        }
        //TODO think on index
        this.$render = function (obj, ready, el) {
            var name = this.name;
            var value = this.value;
            if (_.isUndefined(value)) {
                value = this.value = this.$get(obj, ready);
            }
            _.debug("Render attribute '" + name + "' with value " + value);
            el.setAttribute(name, value, obj);
        };
    };

    var createAttr = function (name, prop, deps, obj) {
        var attr = new Attr(name, null, prop, deps);
        attr.value = attr.$get(obj);
        return attr;
    };

    var prepareView = function (view, obj) {
        if (_.isString(view) && (view.indexOf('#') != -1 || view === '*' || view === '@')) {
            //TODO implement @
            var res = {};
            if (view === '*') {
                _.forIn(obj, function (val, prop) {
                    if (prop.charAt(0) != '$' && prop.charAt(0) != '_') {
                        res[prop] = createAttr(prop, prop, [prop], obj);
                    }
                });
                return res;
            }
            var s = view.split('#');
            var name = s[0] || VALUE;
            var prop = s[1] || VALUE;
            if (prop == VALUE && _.isFunction(obj.value)) {
                res[name] = createAttr(name, obj.value, obj.value.$deps, obj);
            } else {
                res[name] = createAttr(name, prop, [prop], obj);
            }
            return res;
        }
        if (_.isFunction(view)) {
            return {
                value: createAttr(VALUE, view, view.$deps, obj)
            };
        }
        if (_.isFunction(view) || _.isArray(view) || _.isRegExp(view) || _.isBoolean(view)
            || _.isNumber(view) || _.isString(view) || _.isDate(view) || !_.isObject(view)) {
            return {
                value: new Attr(VALUE, view)
            };
        }
        _.forIn(view, function (value, prop) {
            if (prop.charAt(0) == '$') {
                resolveViewHandle(view, prop.substring(1));
            } else if (VALUE === prop && _.isFunction(obj.value)) {
                view[prop] = createAttr(VALUE, obj.value, [VALUE], obj);
            } else if (_.isString(value) && value.charAt(0) === '#') {
                var property = value.substring(1) || prop;
                view[prop] = createAttr(prop, property, [property], obj);
            } else if (_.isFunction(value) && (value.name == VALUE || value.$name == VALUE)) {
                view[prop] = createAttr(prop, value, value.$deps, obj);
            } else {
                view[prop] = new Attr(prop, value)
            }
        });
        return view;
    };

    var renders = {};

    var renderer = function (obj, view) {
        if (_.isUndefined(view.$shown)) {
            view.$shown = true;
        }
        view.$tie = obj.$name;
        view._resolved = [];
        this.$ = [];
        this.rendered = false;
        this.rendering = false;
    };

    renderer.prototype = {

        select: function (obj, base) {
            var name = obj.$name;
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
        },

        $renderAttr: function (attr, pipe, obj, ready, el) {
            if (attr instanceof Attr) {
                if (pipe) {
                    delete attr.value;
                }
                attr.$render(obj, ready, el);
            }
        },

        $render: function (obj, ready, prop) {
            var tieName = obj.$name;
            _.debug("Render " + tieName, tieName + " Render");
            if (this.$.length == 0) {
                this.$ = this.select(obj);
                _.debug("Elements selected: " + this.$.length);
            }
            var $shown = obj.$view.$shown;
            _.forEach(this.$, function (el) {
                if (el) {
                    var pipe = el.tie !== tieName;
                    if (pipe) {
                        obj = parse(el.tie, undefined, obj);
                        $shown = obj.$view.$shown;
                    }
                    if (prop) {
                        var p = obj.$prop('$view.' + prop);
                        this.$renderAttr(p, pipe, obj, ready, el);
                    } else {
                        _.forIn(obj.$view, function (val) {
                            this.$renderAttr(val, pipe, obj, ready, el);
                        }, this);
                        el.setAttribute(TIED);
                        el.setAttribute(CLASS, tieName);
                        if (el.isInput) {
                            el.setAttribute(NAME, tieName);
                        }
                        el.show($shown);
                    }
                }
            }, this);
            _.debug("Rendered " + tieName);
        },

        notify: function (obj, prop) {
            var ready = obj.$ready();
            _.forIn(obj.$view, function (val) {
                if (val instanceof  Attr) {
                    var deps = val.deps || [];
                    if (deps.indexOf(prop) != -1) {
                        val.value = val.$get(obj, ready);
                        _.forEach(this.$, function (el) {
                            val.$render(obj, ready, el);
                        });
                    }
                }
            }, this);
            var val = obj.$view.value;
            _.forEach(this.$, function (el) {
                if (prop === el.property && val instanceof Attr) {
                    val.value = obj.$prop(prop);
                    val.$render(obj, ready, el);
                }
            });
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
        h = function (view, config) {
            _.debug("Process view handle " + name);
            _.forEach(dependencies || [], function (item) {
                h['$$' + item] = viewHandlers[item];
            });
            if (fn && _.isFunction(fn)) {
                config = _.safeCall(fn, h, true, view, config);
            }
            _.debug("Processed view handle " + name);
            return config;
        };
        _.define(h, name, sealed, dependencies);
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
        var vh = viewHandlers[name];
        if (vh && view._resolved) {
            _.forEach(vh.$deps, function (item) {
                if (view._resolved.indexOf(item) == -1) {
                    resolveViewHandle(view, item);
                }
            });
            var h = ('$' + name);
            var c = view[h];
            _.debug("View handle " + name + ' with config ' + c);
            if (_.isDefined(c)) {
                view[h] = vh(view, c);
            }
            if (view._resolved.indexOf(name) == -1) {
                view._resolved.push(name);
            }
        }
    };

    handle('view', function (obj, config, observer) {
        var handlerId = this._uid;
        var view = prepareView(config, obj);
        var r = new renderer(obj, view);
        var tieName = obj.$name;
        r.render = function (prop) {
            if (this.rendering || (!this.rendered && prop)) {
                return;
            }
            this.rendering = true;
            this.$render(obj, obj.$ready(), prop);
            this.rendering = false;
            this.rendered = true;
        };
        renders[tieName] = r;
        observer.watch('.*', handlerId, function (obj, prop, val) {
            if (r.silent) {
                return;
            }
            if ('_deleted' === prop && !!val) {
                delete renders[tieName];
                observer.remove(handlerId);
            } else if (prop.indexOf('$view.') == 0) {
                var vh = prop.replace('$view.', '');
                if (vh.charAt(0) == '$') {
                    resolveViewHandle(view, vh.substring(1));
                }
                r.render(prop);
            } else {
                r.notify(obj, prop);
            }
        });
        _.forIn(viewHandlers, function (handle, prop) {
            if (view._resolved.indexOf(prop) == -1) {
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

    viewHandle("shown", function (view, config) {
        var r = renders[view.$tie];
        if (r) {
            r.show(config);
        }
        return config;
    }, [], true);

    dom.ready(onReady);

    Function.prototype.val = function (dependencies) {
        _.define(this, VALUE, false, dependencies || [VALUE]);
        return this;
    };

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