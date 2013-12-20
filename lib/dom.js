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

    var ID = "id";
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

        removeChildren: function (element) {
            while (element && element.firstChild) {
                element.removeChild(element.firstChild);
            }
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
                while (~newClass.indexOf(' ' + className + ' ')) {
                    newClass = newClass.replace(' ' + className + ' ', ' ');
                }
                elem.className = newClass.replace(/^\s+|\s+$/g, '');
            }
        },

        ready: function (fn) {
            if (fn) {
                // check if document already is loaded
                var f = this.readyFn.bind(this);
                if (document.readyState === 'complete') {
                    setTimeout(fn, 0);
                    this.domReady = true;
                } else {
                    if (this.readyListeners.length == 0) {
                        window.addEventListener('load', f);
                    }
                }
                if (this.readyListeners.length == 0) {
                    window.addEventListener('hashchange', f);
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
            if (~dot) {
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
        this.prop = prop;
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
        var res = view;
        if (_.isString(view) && (~view.indexOf('#') || view === '*' || view === '@')) {
            //TODO implement @
            res = {};
            if (view === '*') {
                _.forIn(obj, function (val, prop) {
                    if (prop.charAt(0) != '$' && prop.charAt(0) != '_') {
                        res[prop] = createAttr(prop, prop, [prop], obj);
                    }
                });
            } else {
                var s = view.split('#');
                var name = s[0] || VALUE;
                var prop = s[1] || VALUE;
                if (prop == VALUE && _.isFunction(obj.value)) {
                    res[name] = createAttr(name, obj.value, obj.value.$deps, obj);
                } else {
                    res[name] = createAttr(name, prop, [prop], obj);
                }
            }
        } else if (_.isFunction(view)) {
            res = {
                value: createAttr(VALUE, view, view.$deps, obj)
            };
        } else if (_.isFunction(view) || _.isArray(view) || _.isRegExp(view) || _.isBoolean(view)
            || _.isNumber(view) || _.isString(view) || _.isDate(view) || !_.isObject(view)) {
            res = {
                value: new Attr(VALUE, view)
            };
        } else {
            _.forIn(view, function (value, prop) {
                if (prop.charAt(0) == '$' || prop.charAt(0) == '_' || value instanceof  Attr) {
                    view[prop] = value; //prevent view handle or private or attribute
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
            res = view;
        }
        res._ids = [];
        res._parents = {};
        return res;
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

        register: function (viewHandle, onChange, interest) {
            var vh = viewHandlers[viewHandle];
            if (vh && onChange) {
                vh.onChange = function (obj, prop) {
                    if (!interest || interest === prop) {
                        onChange.call(this, obj, prop);
                    }
                }
            }
        },

        select: function (obj, base) {
            var name = obj.$name;
            var res = [];
            if (dom.fetched.length == 0 || base) {
                dom.fetch('[' + TIE + ']', base);
            }
            _.forEach(dom.fetched, function (el) {
                var attribute = el.getAttribute(TIE);
                var s = attribute.charAt(name.length);
                if (attribute.indexOf(name) == 0 && (s == '' || s == ' ' || s == '|' || s == '.')) {
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
            _.forEach(obj.$deps, function (item) {
                var r = renders[item];
                if (!r.rendered) {
                    r.render();
                }
            });
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

        $renderChildren: function (children, obj, clean) {
            var ready = obj.$ready();
            _.forEach(this.$, function (el) {
                var $ = el.$;
                if (clean) {
                    dom.removeChildren($);
                }
                var fragment = document.createDocumentFragment();
                _.forEach(children, function (child) {
                    var id = child._parents[el._id];
                    var c = id ? document.getElementById(id) : null;
                    var newEl = false;
                    if (!c) {
                        c = document.createElement(child.$tag || 'div');
                        fragment.appendChild(c);
                        newEl = true;
                    }
                    var w = new wrap(c, obj);
                    _.forIn(child, function (val) {
                        this.$renderAttr(val, false, obj, ready, w);
                    }, this);
                    if (newEl) {
                        w.setAttribute(ID, w._id);
                        child._ids.push(w._id);
                        child._parents[el._id] = w._id;
                    }
                }, this);
                _.debug('Processed children');
                $.appendChild(fragment);
                _.debug('Append children to main');
            }, this);
        },

        inspectAttr: function (name, val, obj, ready, prop, els) {
            els = els || this.$;
            if (val instanceof  Attr) {
                var deps = val.deps || [];
                if (~deps.indexOf(prop)) {
                    val.value = val.$get(obj, ready);
                    _.forEach(els, function (el) {
                        val.$render(obj, ready, el);
                    });
                }
            } else if (name.charAt(0) == '$') {
                var vh = viewHandlers[name.substring(1)];
                if (vh && _.isFunction(vh.onChange)) {
                    vh.onChange(obj, prop);
                }
            }
        },

        notify: function (obj, prop) {
            _.debug("Fire attributes on property change " + prop);
            var ready = obj.$ready();
            //search among attribute dependencies
            _.forIn(obj.$view, function (val, name) {
                this.inspectAttr(name, val, obj, ready, prop);
            }, this);
            var val = obj.$view.value;
            // search among elements with property pipe
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
                });
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
        h = function (view, config, renderer, obj) {
            _.debug("Process view handle " + name);
            _.forEach(dependencies || [], function (item) {
                h['$$' + item] = viewHandlers[item];
            });
            if (fn && _.isFunction(fn)) {
                config = _.safeCall(fn, h, true, view, config, renderer, obj);
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

    var resolveViewHandle = function (obj, view, name) {
        var vh = viewHandlers[name];
        if (vh && view._resolved) {
            _.forEach(vh.$deps, function (item) {
                if (!~view._resolved.indexOf(item)) {
                    resolveViewHandle(obj, view, item);
                }
            });
            var h = ('$' + name);
            var c = view[h];
            _.debug("View handle " + name + ' with config ' + c);
            var renderer = renders[view.$tie];
            if (_.isDefined(c) && renderer && renderer.rendered) {
                view._silent = true;
                view[h] = vh(view, c, renderer, obj);
                view._silent = false;
                if (!~view._resolved.indexOf(name)) {
                    view._resolved.push(name);
                }
            }
        }
    };

    handle('view', function (obj, config, observer, appConfig) {
        var handlerId = this._uid;
        var view = prepareView(config, obj);
        if (appConfig && !_.isString(config)) {
            var appView = prepareView(appConfig, obj);
            view = _.extend(appView, view);
        }
        var r = new renderer(obj, view);
        var tieName = obj.$name;
        r.observeArray = function () {
            return observer.observeArray.apply(observer, arguments);
        };
        r.render = function (prop) {
            if (this.rendering || (!this.rendered && prop)) {
                return;
            }
            this.rendering = true;
            this.$render(obj, obj.$ready(), prop);
            this.rendering = false;
            this.rendered = true;
            if (!prop) {
                _.forIn(viewHandlers, function (handle, prop) {
                    if (!~view._resolved.indexOf(prop)) {
                        resolveViewHandle(obj, view, prop);
                    }
                });
            }
        };
        renders[tieName] = r;
        observer.watch('.*', handlerId, function (obj, prop, val) {
            if ('_deleted' === prop && !!val) {
                delete renders[tieName];
                observer.remove(handlerId);
            } else if (prop.indexOf('$view.') == 0) {
                var vh = prop.replace('$view.', '');
                if (vh.charAt(0) == '$') {
                    resolveViewHandle(obj, view, vh.substring(1));
                }
                r.render(prop);
            } else if (prop.indexOf('$$') == 0) {
                _.forIn(view, function (val) {
                    if (val instanceof  Attr) {
                        delete val.value;
                    }
                }, this);
                r.render(); // re-render whole element
            } else {
                r.notify(obj, prop);
            }
        });
        if (dom.ready()) {
            setTimeout(function () {
                r.render()
            }, 100);
        }
        return view;
    }, [], true);

    viewHandle("shown", function (view, config, renderer) {
        renderer.show(config);
        return config;
    }, [], true);


    viewHandle("parent", function (view, config, renderer) {
        var parents = [];
        if (_.isString(config)) {
            if (config.charAt(0) == '#') {
                var r = renders[config.substring(1)];
                if (r) {
                    parents = r.$.map(function (el) {
                        return el.$;
                    });
                }
            } else {
                parents = [document.getElementById(config)];
            }
        }
        _.forEach(parents, function (parent) {
            dom.removeChildren(parent);
            _.forEach(renderer.$, function (el) {
                var $ = el.$;
                dom.remove($);
                parent.appendChild($);
            });
        });
        return config;
    }, [], true);

    viewHandle("children", function (view, config, renderer, obj) {
        var views = [];
        var ready = obj.$ready();
        if (_.isFunction(config)) {
            var idx = 0;
            var next = _.safeCall(config, obj, ready, idx);
            while (next != null) {
                views.push(prepareView(next, obj));
                next = _.safeCall(config, obj, ready, ++idx);
            }
        } else {
            _.forEach(config, function (child) {
                views.push(prepareView(child, obj));
            });
        }
        renderer.$renderChildren(views, obj, true);
        var onChange = function (item, prev) {
            if (prev) {
                onRemove(prev);
            }
            if (!item._ids) {
                item = prepareView(item, obj);
            }
            renderer.$renderChildren(item, obj, false);
            return item;
        };
        var onRemove = function (item) {
            _.forEach(item._ids, function (id) {
                var c = document.getElementById(id);
                if (c) {
                    dom.remove(c);
                }
            });
        };
        views = renderer.observeArray(views, onChange, onChange, onRemove);
        renderer.register(this.$name, function (obj, prop) {
            _.forEach(views, function (v) {
                _.forEach(v._ids, function (id) {
                    var c = document.getElementById(id);
                    if (c) {
                        var w = new wrap(c, obj);
                        var ready = obj.$ready();
                        _.forIn(v, function (val, name) {
                            renderer.inspectAttr(name, val, obj, ready, prop, w);
                        });
                    }
                });
            });
        });
        return views;
    }, [], true);

    dom.ready(onReady);

    window.tie.domReady = function() {
        return dom.ready.apply(dom, arguments)
    };
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