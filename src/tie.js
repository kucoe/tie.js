(function (window) {
    'use strict';

    var APP = 'app';
    var VALUE = 'value';
    var VALUES = 'values';
    var TEXT = 'text';
    var SHOWN = 'shown';
    var ATTRS = 'attrs';
    var ROUTES = 'routes';
    var ITEM_NAME = '_item_name';

    var s4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };

    Array.prototype._ = function (obj) {
        _.forEach(this, function (item) {
            if (!obj.hasOwnProperty(item)) {
                obj[item] = {'_item_name': item};
            }
        });
        return obj;
    };

    var proxy = function (tie) {
        var observe = function (obj, desc, prop, dependency) {
            if (desc && desc._proxyMark) {
                return; //proxy already set
            }
            var newGet = function () {
                if (desc) {
                    if (desc.get) {
                        return desc.get.call(obj);
                    }
                    return desc.value;
                }
                return tie.$attrValue(prop);
            };
            var newSet = function (val) {
                if (desc) {
                    if (desc.set) {
                        desc.set.call(this, val);
                    } else {
                        desc.value = val;
                    }
                }
                if (prop == SHOWN) {
                    tie.$show(val);
                } else {
                    if (prop == ATTRS) {
                        tie.$prepareAttrs();
                    } else if (prop == ROUTES) {
                        tie.$prepareRoutes();
                    }
                    tie.$apply();
                }
            };
            var enumerable = desc ? desc.enumerable : false;
            Object.defineProperty(obj, prop, {
                get: newGet,
                set: newSet,
                configurable: true,
                enumerable: enumerable,
                _proxyMark: true
            });
        };
    
        var explore = function (obj) {
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    props.push(prop);
                    if ('prototype' == prop) {
                        continue; // skip prototype
                    }
                    var desc = Object.getOwnPropertyDescriptor(obj, prop);
                    if (desc._proxyMark) {
                        continue; //skip already processed
                    }
                    if (!desc.configurable || (desc.value === undefined && !desc.set) || desc.writable === false) {
                        continue; // skip readonly
                    }
                    var dep = prop.charAt(0) === '$' && tie.depends.indexOf(prop.substring(1)) != -1;
                    var val = obj[prop];
                    if (_.isObject(val) && !dep) {
                        explore(val);
                    }
                    observe(obj, desc, prop, dep);
                }
            }
            if (obj.attrs) {
                _.forIn(obj.attrs, function (attr, prop) {
                    if (props.indexOf(prop) == -1 || attr.property || attr.value) {
                        if (_.isObject(val)) {
                            explore(val);
                        }
                        observe(obj, null, prop);
                    }
                    props.push(prop);
                }, this);
            }
        };
    
        var obj = tie.obj;
        var props = [];
        explore(obj);
    
        return obj;
    };
    
    var routes = {
        list: {},
        init: function () {
            if (app == null) {
                throw new Error("App is not ready");
            }
            if (app.obj.routes) {
                _.forIn(app.obj.routes, function (r, path) {
                    path = path.toLowerCase();
                    this.list[path] = new route(path, r.handler);
                }, this);
                _.debug("Routes init");
            }
        },
    
        locate: function (ties) {
            var current = window.location.hash.substring(1);
            current = this.find(current);
            if (!current) {
                if (app.obj.routes) {
                    this.move('/');
                } else {
                    _.debug("Process default route");
                    _.forIn(ties, function (bind) {
                        if (!bind.rendered) {
                            bind.$render();
                        }
                        bind.obj.$location = function () {
                            return{route: {has: function () {
                                return true
                            }}}
                        };
                        bind.obj.shown = true;
                    });
                    _.debug("Processed default route");
                }
            } else {
                _.debug("Process route " + current.path);
                app.location = function (url) {
                    if (url) {
                        this.move(url);
                        return null;
                    }
                    return {href: window.location.href, route: current};
                }.bind(this);
                if (current.handler) {
                    safeCall(current.handler, app.obj, app.$ready());
                }
                _.forIn(ties, function (bind) {
                    if (!bind.rendered) {
                        bind.$render();
                    }
                    bind.obj.$location = app.location;
                    bind.obj.shown = current.has(bind);
                    var r = bind.obj.routes[current.path];
                    if (r && r.handler) {
                        safeCall(r.handler, bind.obj, bind.$ready());
                    }
                });
                _.debug("Processed route " + current.path);
            }
        },
    
        find: function (path) {
            return this.list[path];
        },
    
        move: function (url) {
            setTimeout(function () {
                window.location.hash = '#' + url;
            }, 100);
        }
    };
    
    var route = function (path, handler) {
        this.path = path;
        this.handler = handler;
    };
    
    route.prototype = {
        has: function (bind) {
            var routes = bind.obj.routes;
            var exclude = routes['-'] != null;
            var contains = false;
            _.forIn(routes, function (route, path) {
                if (path.toLowerCase() == this.path) {
                    contains = true;
                    return false;
                }
                return true;
            }, this);
            return exclude != contains;
        }
    };
    
    
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
        var idx = el.getAttribute(INDEX);
        this.$ = el;
        this._id = _.uid();
        this.index = idx ? parseInt(idx) : -1;
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
                var tied = this.tied;
                var handler = this.events[name];
                if (handler) {
                    this.$.removeEventListener(name, handler);
                }
                handler = function (event) {
                    safeCall(value, obj, tied.$ready(), event);
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
                        this.textEl = window.document.createElement('span');
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
    
    var _ = {
    
        debugEnabled: true,
    
        isUndefined: function (value) {
            return value == undefined;
        },
    
        isDefined: function (value) {
            return value != undefined;
        },
    
        isObject: function (value) {
            return value != null && typeof value == 'object';
        },
    
        isString: function (value) {
            return typeof value == 'string';
        },
    
        isNumber: function (value) {
            return typeof value == 'number';
        },
    
        isDate: function (value) {
            return Object.prototype.toString.apply(value) == '[object Date]';
        },
    
        isArray: function (value) {
            return Array.isArray(value) || Object.prototype.toString.apply(value) == '[object Array]';
        },
    
        isCollection: function (value) {
            return this.isArray(value) || value instanceof Array || value instanceof NodeList ||
                value instanceof NamedNodeMap;
        },
    
        isFunction: function (value) {
            return typeof value == 'function';
        },
    
        isBoolean: function (value) {
            return typeof value == 'boolean';
        },
    
        trim: function (value) {
            return this.isString(value) ? value.replace(/^\s*/, '').replace(/\s*$/, '') : value;
        },
    
        lowercase: function (string) {
            return this.isString(string) ? string.toLowerCase() : string;
        },
    
        uppercase: function (string) {
            return this.isString(string) ? string.toUpperCase() : string;
        },
    
        toInt: function (str) {
            return parseInt(str, 10);
        },
    
        eqi: function (val1, val2) {
            return this.lowercase(val1) === this.lowercase(val2);
        },
    
        forEach: function (collection, callback, thisArg) {
            if (!thisArg) {
                thisArg = this;
            }
            if (callback) {
                if (this.isCollection(collection)) {
                    var index = -1;
                    var length = collection.length;
    
                    while (++index < length) {
                        if (callback.call(thisArg, collection[index], index, collection) === false) {
                            break;
                        }
                    }
                } else {
                    callback.call(thisArg, collection, 0, [collection]);
                }
            }
            return collection;
        },
    
        forIn: function (object, callback, thisArg) {
            if (!thisArg) {
                thisArg = this;
            }
            if (callback) {
                for (var prop in object) {
                    if (object.hasOwnProperty(prop)) {
                        if (callback.call(thisArg, object[prop], prop, object) === false) {
                            break;
                        }
                    }
                }
            }
            return object;
        },
    
        uid: function () {
            return (s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4());
        },
    
        extend: function (dest, source) {
            if (this.isCollection(dest) && this.isCollection(source)) {
                this.forEach(source, function (item) {
                    dest.push(item);
                });
            } else {
                this.forIn(source, function (value, prop) {
                    dest[prop] = value;
                });
            }
        },
    
        debug : function(message) {
            if(this.debugEnabled){
                console.log(message);
            }
        }
    };
    
    var model = function (obj) {
        _.extend(this, obj);
    };
    
    model.prototype = _;
    
    var safeCall = function (fn, fnThis, bindReady) {
        var res;
        try {
            var args = Array.prototype.slice.call(arguments, 3);
            res = fn.apply(fnThis, args);
        } catch (e) {
            res = undefined;
            if (bindReady) {
                console.warn('Is ready and had an error:' + e.message);
            }
        }
        return res;
    };
    
    var valueFn = function (obj, idx, bindReady) {
        var name = this.name;
        var val = this.value;
        var property = this.property;
        var values = obj.values;
    
        var findProperty = function (name) {
            if (idx >= 0 && values && _.isDefined(values[idx][name])) {
                return values[idx][name];
            }
            if (idx >= 0 && values && VALUE == name) {
                return values[idx];
            }
            return obj[name]
        };
    
        if (_.isFunction(val)) {
            return safeCall(val, obj, bindReady)
        } else {
            if (property && _.isUndefined(val)) {
                return findProperty(property);
            }
            if (!name) {
                throw new Error("Where is your property?")
            }
            return findProperty(name);
        }
    };
    
    var bind = function (name, dependencies, ties) {
        this.name = name;
        this.touch = [];
        this.values = {};
        this.depends = dependencies || [];
        this.rendered = false;
        this.loaded = false;
        this.selected = false;
        this.applyCount = 0;
        this.timeout = null;
        this.$apply = function () {
            this.applyCount++;
            if (this.applyCount > 10) {
                _.debug("Too many apply :" + this.name + " - " + this.applyCount);
            }
            if (this.rendered) {
                this.$render();
            }
            _.forEach(this.touch, function (item) {
                var tie = ties[item];
                if (tie) {
                    tie.obj['$' + this.name] = this.obj;
                }
            }, this);
            if (!this.timeout) {
                this.timeout = setTimeout(function () {
                    this.timeout = null;
                    this.applyCount = 0;
                }.bind(this), 3000);
            }
        };
    };
    
    bind.prototype = {
        $ready: function () {
            var ready = true;
            _.forEach(this.depends, function (dep) {
                var d = this.obj['$' + dep];
                if (d._empty) {
                    ready = false;
                    return false;
                }
                return true;
            }, this);
            return ready;
        },
        $prepareRoutes: function () {
            var routes = this.obj.routes;
            if (routes) {
                if (_.isArray(routes)) {
                    this.obj.routes = routes._({});
                }
                _.forIn(this.obj.routes, function (route, path) {
                    if (_.isFunction(route)) {
                        route = {path: path, handler: route}
                    } else {
                        route = {path: path}
                    }
                    this.obj.routes[path] = route;
                }, this);
            }
        },
        $prepareAttrs: function () {
            var attrs = this.obj.attrs;
            if (attrs) {
                if (_.isArray(attrs)) {
                    this.obj.attrs = attrs._({});
                }
                _.forIn(this.obj.attrs, function (attr, name) {
                    if (_.isString(attr) && attr[0] == '#') {
                        attr = {name: name, property: attr.substring(1)}
                    } else if (_.isFunction(attr)) {
                        attr = {name: name, value: attr}
                    } else if (attr[ITEM_NAME]) {
                        attr.name = attr[ITEM_NAME];
                    } else {
                        attr = {name: name, value: attr}
                    }
                    this.obj.attrs[name] = attr;
                }, this);
            }
        },
        $attrValue: function (name, value) {
            if (this.obj.attrs) {
                var attr = this.$attr(name);
                if (_.isUndefined(value)) {
                    if (attr) {
                        return attr.val(this.obj, -1, this.$ready());
                    }
                } else {
                    if (attr && attr.property) {
                        this.obj[attr.property] = value;
                    }
                }
            }
            return null;
        },
        $attr: function (name) {
            if (this.obj.attrs) {
                return this.obj.attrs[name];
            }
            return null;
        },
        $attrs: function (elements, attr) {
            _.forEach(elements, function (el) {
                var val = attr.value;
                if (_.isFunction(val)) {
                    val = val(el.index);
                }
                el.setAttribute(attr.name, val);
            });
        },
        $show: function (shown) {
            _.forEach(this.$, function (el) {
                el.show(shown);
            }, this);
        },
        $render: function () {
            _.debug("Render " + this.name);
            if (!this.loaded) {
                this.$load();
            }
            var attrs = this.obj.attrs;
            if (attrs) {
                var ready = this.$ready();
                _.forIn(attrs, function (attr) {
                    attr.val = valueFn;
                    this.$attrs(this.$, {name: attr.name, value: function (idx) {
                        return attr.val(this.obj, idx, ready);
                    }.bind(this)});
                }, this);
                this.$attrs(this.$, {name: TIED});
                _.forEach(this.$, function (el) {
                    if (el.isInput) {
                        el.setAttribute('name', this.name);
                    }
                }, this);
            }
            this.$show(this.obj.shown);
            this.rendered = true;
            _.debug("Rendered " + this.name);
        }
    
    };
    
    var app = null;
    
    var tie = function () {
        var ties = {};
        return function (name, tiedObject, dependencies) {
            if (name != APP && ties[APP] == null) {
                window.tie(APP, {});
            }
            var r = tie.prototype.init(name, tiedObject, dependencies, ties);
            tie.prototype.define(name, r, ties);
            if (name == APP) {
                app = r;
                routes.init();
                q.ready(function () {
                    routes.locate(ties);
                });
            }
            return r.obj;
        }
    };
    tie.prototype = {
    
        select: function (tieName, tied) {
            var nodes = window.document.querySelectorAll('[' + TIE + '="' + tieName + '"]');
            var res = [];
            _.forEach(nodes, function (el) {
                res.push(new $(el, tied));
            });
            tied.selected = true;
            return res;
        },
    
        wrapPrimitive: function (obj) {
            return {
                value: obj,
                attrs: ['value']
            }
        },
    
        wrapFunction: function (fn) {
            return {
                attrs: {
                    value: fn
                }
            }
        },
    
        wrapArray: function (array) {
            return {
                values: array,
                attrs: ['value']
            };
        },
    
        check: function (obj) {
            if (_.isFunction(obj)) {
                obj = this.wrapFunction(obj);
            } else if (!_.isObject(obj) || _.isDate(obj)) {
                obj = this.wrapPrimitive(obj);
            } else if (_.isArray(obj)) {
                obj = this.wrapArray(obj);
            }
            if (_.isUndefined(obj.shown)) {
                obj.shown = true;
            }
            if (_.isUndefined(obj.attrs)) {
                obj.attrs = {};
            }
            if (_.isUndefined(obj.routes)) {
                if (app != null && app.obj.routes) {
                    obj.routes = app.obj.routes;
                }
            }
            return new model(obj);
        },
    
        prepare: function (bind) {
            bind.$prepareAttrs();
            bind.$prepareRoutes();
            var values = bind.obj.values;
            var newElements = {};
            var nodes = {};
            if (values) {
                _.forEach(values, function (value, i) {
                    _.forEach(bind.$, function (el) {
                        var id = el._id;
                        var node = nodes[id];
                        if(!node) {
                            nodes[id] = node = el.$;
                        }
                        if(el.index >=0) {
                            el.remove();
                        }
                        var newEls = newElements[id];
                        if (!newEls) {
                            newElements[id] = newEls = [];
                        }
                        var newElement = node.cloneNode(true);
                        newElement.setAttribute(INDEX, i);
                        newEls.push(newElement);
                    });
                }, this);
                _.forEach(bind.$, function (el) {
                    var node = el.$;
                    node.style.display = 'none';
                    q.next(node, newElements[el._id]);
                });
                bind.selected = false;
            }
        },
    
        prepareDependency: function (bind) {
            var obj = _.extend({}, bind.obj);
            _.forEach(bind.depends, function (dep) {
                delete obj['$' + dep];
            });
            return obj;
        },
    
        resolve: function (bind, dependencies, ties) {
            if (!dependencies) {
                return;
            }
            _.forEach(dependencies, function (dep) {
                var found = ties[dep];
                if (!found) {
                    found = {name: dep, touch: [], obj: {_empty: true}};
                    this.define(dep, found, ties);
                }
                bind.obj['$' + dep] = found.obj;
                if (found.touch.indexOf(bind.name) == -1) {
                    found.touch.push(bind.name);
                }
            }, this);
        },
    
        define: function (name, bind, ties) {
            var old = ties[name];
            ties[name] = bind;
            if (old && old.touch) {
                bind.touch = old.touch;
                bind.rendered = old.rendered;
                bind.$apply();
            }
        },
    
        init: function (name, tiedObject, dependencies, ties) {
            _.debug("Tie " + name);
            var r = new bind(name, dependencies, ties);
            _.debug("Bind ready");
            r.obj = this.check(tiedObject);
            _.debug("Model checked");
            this.resolve(r, dependencies, ties);
            _.debug("Dependencies resolved");
            r.obj = proxy(r);
            _.debug("Model proxy done");
            var tie = this;
            r.$load = function () {
                if (!this.selected) {
                    this.$ = tie.select(name, r);
                    _.debug("Elements selected: " + this.$.length);
                }
                tie.prepare(this);
                _.debug("Prepared inner structure");
                if (!this.selected) {
                    this.$ = tie.select(name, r);
                    _.debug("Elements reselected: " + this.$.length);
                }
                this.loaded = true;
            };
            return r;
        }
    };

    window.tie = tie();

})(window);
