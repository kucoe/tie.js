/**
 * Tie.js View handle
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */
(function (window) {
    'use strict';

    var document = window.document;
    var _ = window.tie._;
    var handle = window.tie.handle;
    var parse = window.tie.$;

    var HANDLE_PREFIX = '$';

    var VALUE = 'value';
    var TEXT = 'text';

    var ID = "id";
    var INDEX = "data-index";
    var TIE = "data-tie";
    var TIED = "data-tied";
    var CLASS = "class";
    var NAME = "name";

    /**  DOM **/

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
                while (newClass.contains(' ' + className + ' ')) {
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
                    _.nextTick(fn);
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

    /**  EL **/

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
        this.tie = el.getAttribute(TIE) || name;
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

    /**  VIEWHANDLE **/

    var viewHandlers = {};
    
    var viewHandle = function (name, fn, dependencies, sealed) {
        var h = viewHandlers[name];
        if (_.isUndefined(fn)) {
            return  h;
        }
        if (h && h.$sealed) {
            throw new Error(name + ' view handle already registered and sealed. Please choose another name for your handle');
        }
        h = function (view, config, els, obj) {
            _.debug("Process view handle " + name);
            _.forEach(dependencies || [], function (item) {
                h['$' + item] = viewHandlers[item];
            });
            if (fn && _.isFunction(fn)) {
                config = _.safeCall(fn, h, view, config, els, obj);
            }
            _.debug("Processed view handle " + name);
            return config;
        };
        _.define(h, name, sealed, dependencies);
        h = _.extend(h, _);
        viewHandlers[name] = h;
        return h;
    };
    
    var resolveViewHandle = function (obj, view, name, els) {
        var vh = viewHandlers[name];
        if (vh && view._resolved) {
            _.forEach(vh.$deps, function (item) {
                if (!view._resolved.contains(item)) {
                    resolveViewHandle(obj, view, item, els);
                }
            });
            var h = (HANDLE_PREFIX + name);
            var c = view[h];
            _.debug("View handle " + name + ' with config ' + c);
            var renderer = renders[view.$tie];
            if (_.isDefined(c) && renderer && renderer.rendered) {
                els = els || renderer.$;
                view._silent = true;
                view[h] = vh(view, c, els, obj);
                delete view._silent;
                if (!view._resolved.contains(name)) {
                    view._resolved.push(name);
                }
            }
        }
    };

    /**  RENDERER **/

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
    
        register: function (viewHandle, onChange, onRender, interest) {
            var vh = viewHandlers[viewHandle];
            if (vh && onChange) {
                vh.onChange = function (obj, prop, name, val, els) {
                    if (!interest || interest === prop) {
                        onChange.call(this, obj, prop, name, val, els);
                    }
                }
            }
            if (vh && onRender) {
                vh.onRender = function (obj, val) {
                    return onRender.call(this, obj, val);
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
    
        $renderAttr: function (obj, prop, val, el) {
            if (_.isEnumerable(prop)) {
                _.debug("Render attribute '" + prop + "' with value " + val);
                el.setAttribute(prop, val, obj);
            }
        },
    
        $render: function (obj, prop) {
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
                    var updated = obj;
                    if (el.tie !== tieName) {
                        updated = parse(el.tie, undefined, updated);
                        $shown = updated.$view.$shown;
                    }
                    if (prop) {
                        var val = updated.$prop('$view.' + prop);
                        if (!val && obj.$view._amap) {
                            val = updated.$prop(prop);
                        }
                        if (val) {
                            this.$renderAttr(obj, prop, val, el);
                        }
                    } else {
                        if (obj.$view._amap) {
                            var attrs = [].slice.call(el.$.attributes);
                            _.forEach(attrs, function (item) {
                                prop = item.nodeName;
                                var val = updated.$prop(prop);
                                this.$renderAttr(obj, prop, val, el);
                            }, this);
                        } else {
                            _.forIn(updated.$view, function (val, prop) {
                                this.$renderAttr(obj, prop, val, el);
                            }, this);
                        }
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
    
        inspectChange: function (obj, prop, name, val, els) {
            var tieName = obj.$name;
            els = els || this.$;
            if (_.isHandle(name)) {
                var end = name.indexOf('.');
                var h = name.substring(1, end);
                var vh = viewHandlers[h];
                if (vh && _.isFunction(vh.onChange)) {
                    vh.onChange(obj, prop, name.substring(end + 1), val[HANDLE_PREFIX + h], els);
                }
            } else {
                _.forEach(els, function (el) {
                    var value = val[name];
                    if (el.tie !== tieName) {
                        var updated = parse(el.tie, undefined, obj);
                        value = updated.$prop(prop);
                    }
                    this.$renderAttr(obj, name, value, el);
                }, this);
            }
        }
    };

    /**  SHOWN **/

    viewHandle("shown", function (view, config, els) {
        _.forEach(els, function (el) {
            if (el) {
                el.show(config);
            }
        });
        return config;
    }, [], true);

    /**  PARENT **/

    viewHandle("parent", function (view, config, els) {
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
            _.forEach(els, function (el) {
                var $ = el.$;
                dom.remove($);
                parent.appendChild($);
            });
        });
        return config;
    }, [], true);

    /**  CHILDREN **/

    var renderChildren = function (children, obj, clean, renderer, els) {
        _.forEach(els, function (el) {
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
                _.forIn(child, function (val, prop) {
                    if (_.isHandle(prop)) {
                        child.$tie = obj.$name;
                        child._resolved = [];
                        resolveViewHandle(obj, child, prop.substring(1), [w]);
                    } else {
                        renderer.$renderAttr(obj, prop, val, w);
                    }
                });
                if (newEl) {
                    w.setAttribute(ID, w._id);
                    child._ids.push(w._id);
                    child._parents[el._id] = w._id;
                }
            });
            _.debug('Processed children');
            $.appendChild(fragment);
            _.debug('Append children to main');
        }, this);
    };
    
    
    viewHandle("children", function (view, config, els, obj) {
        var renderer = renders[obj.$name];
        var views = [];
        if (_.isFunction(config)) {
            var idx = 0;
            var next = _.safeCall(config, obj, idx);
            while (next != null) {
                views.push(prepareView(next, obj));
                next = _.safeCall(config, obj, ++idx);
            }
        } else {
            _.forEach(config, function (child) {
                views.push(prepareView(child, obj));
            });
        }
        renderChildren(views, obj, true, renderer, els);
        var onChange = function (item, prev) {
            if (prev) {
                onRemove(prev);
            }
            if (!item._ids) {
                item = prepareView(item, obj);
            }
            renderChildren(item, obj, false, renderer, els);
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
        renderer.register(this.$name, function (obj, prop, name, val) {
            _.forEach(val, function (v, i) {
                _.forEach(v._ids, function (id) {
                    var c = document.getElementById(id);
                    if (c) {
                        var w = new wrap(c, obj);
                        renderer.inspectChange(obj, prop, name, val[i], w);
                    }
                });
            });
        });
        return views;
    }, [], true);

    /**  VIEW **/

    var prepareView = function (view, obj) {
        var res = view;
        if (_.isString(view) && (view.contains('#') || view === '*' || view === '@')) {
            res = {};
            if (view === '@') {
                res._amap = true;
            } else if (view === '*') {
                _.forIn(obj, function (val, prop) {
                    if (_.isEnumerable(prop)) {
                        res[prop] = prop.prop();
                    }
                });
            } else {
                var s = view.split('#');
                var name = s[0] || VALUE;
                var prop = s[1] || VALUE;
                res[name] = prop.prop();
            }
        } else if (_.isFunction(view) || _.isArray(view) || _.isRegExp(view) || _.isBoolean(view)
            || _.isNumber(view) || _.isString(view) || _.isDate(view) || !_.isObject(view)) {
            res = {
                value: view
            };
        } else {
            res = view;
        }
        res._ids = [];
        res._parents = {};
        return res;
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
            this.$render(obj, prop);
            this.rendering = false;
            this.rendered = true;
            if (!prop) {
                _.forIn(viewHandlers, function (handle, prop) {
                    if (!view._resolved.contains(prop)) {
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
                var name = prop.replace('$view.', '');
                if (_.isHandle(name) && !name.contains('.')) {
                    resolveViewHandle(obj, view, name.substring(1));
                } else {
                    r.inspectChange(obj, prop, name, view);
                }
            }
            if (_.isDefined(obj.$view.value)) {
                _.forEach(r.$, function (el) {
                    if (prop === el.property) {
                        var value = val;
                        if (el.tie !== tieName) {
                            var updated = parse(el.tie, undefined, obj);
                            value = updated.$prop(prop);
                        }
                        r.$renderAttr(obj, VALUE, value, el)
                    }
                });
            }
        });
        if (dom.ready()) {
            setTimeout(function () {
                if (!r.rendered) {
                    r.render()
                }
            }, 100);
        }
        return view;
    }, [], true);

    var onReady = function () {
        _.debug("Render app");
        _.forIn(renders, function (r) {
            if (!r.rendered) {
                r.render();
            }
        });
        _.debug("Rendered app");
    };

    dom.ready(onReady);

    window.tie.domReady = function () {
        return dom.ready.apply(dom, arguments)
    };
    window.tie.viewHandle = viewHandle;

    if (typeof window.exports === 'object') {
        var res = {};
        res.q = dom;
        res.el = wrap;
        res.renders = renders;
        res.clean = function () {
            dom.fetched = [];
            res.renders = renders = {};
        };
        window.exports = res;
    }

})(window);