/**
 * Tie.js
 * Smart binding, routes, pipes, properties, templates, resources.
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */
(function (window) {
    'use strict';

    /**
     * Properties constants
     */
    var APP = 'app';
    var VALUE = 'value';
    var VALUES = 'values';
    var TEXT = 'text';
    var SHOWN = '$shown';
    var DEPS = '$deps';
    var ATTRS = 'attrs';
    var ROUTES = 'routes';
    var ITEM_NAME = '_item_name';

    /**
     * Attribute constants
     */
    var INDEX = "data-index";
    var TIE = "data-tie";
    var TIED = "data-tied";

    /**
     * Generates 4 chars hex string
     *
     * @returns {string}
     */
    var s4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };

    /**
     * Allow convert array to configuration object extending object passed with array values as properties
     *
     * @returns {Object}
     */
    Array.prototype._ = function (obj) {
        _.forEach(this, function (item) {
            if (!obj.hasOwnProperty(item)) {
                obj[item] = {'_item_name': item};
            }
        });
        return obj;
    };

    /**
     * Properties watcher proxy. Inspects object own properties and attributes from bind and define watching property.
     *
     * @namespace proxy
     * @param {bind} bind element bound tie
     */
    var proxy = function (bind) {
    
        /**
         * Defines new watcher property
         *
         * @param {model} obj inspected object
         * @param {Object} desc property descriptor if any
         * @param {string} prop property name
         * @param {boolean} [dependency] whether the property refers to dependent tie
         */
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
                return obj.$attr(prop);
            };
            var newSet = function (val) {
                if (desc) {
                    if (desc.set) {
                        desc.set.call(this, val);
                    } else {
                        desc.value = val;
                    }
                } else {
                    obj.$attr(prop, val);
                }
                if (prop == SHOWN) {
                    bind.show(val);
                } else {
                    if (prop == ATTRS) {
                        bind.prepareAttrs();
                    } else if (prop == ROUTES) {
                        bind.prepareRoutes();
                    } else if (prop == VALUES) {
                        bind.prepareValues();
                    }
                    _.debug("Calling apply on '" + bind.name + "' after changed property '" + prop + "'");
                    bind.apply();
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
    
        /**
         * Visits object own properties and attributes and add watchers.
         *
         * Note: will recursively observe property of {Object} type
         *
         * @param {model} obj inspected object
         */
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
                    var dep = prop.charAt(0) === '$' && bind.depends.indexOf(prop.substring(1)) != -1;
                    var val = obj[prop];
                    if (_.isObject(val) && !dep && prop != ATTRS && prop != ROUTES && prop != DEPS && prop != VALUES) {
                        _.debug("Exploring " + prop);
                        explore(val);
                    }
                    _.debug("Observing " + prop);
                    observe(obj, desc, prop, dep);
                }
            }
            if (obj.attrs) {
                _.forIn(obj.attrs, function (attr, prop) {
                    // do not override real properties from object and only when attributes have something to change.
                    if (props.indexOf(prop) == -1 && (attr.property || attr.value)) {
                        _.debug("Observing attribute " + prop);
                        observe(obj, null, prop);
                        props.push(prop);
                    }
                }, this);
            }
        };
    
        var obj = bind.obj;
        var props = [];
        _.debug("Exploring " + bind.name);
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
                            bind.render();
                        }
                        bind.obj.$location = function () {
                            return {
                                route: {
                                    has: function () {
                                        return true
                                    }
                                }
                            }
                        };
                        bind.obj.$shown = true;
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
                    return {
                        href: window.location.href,
                        route: current
                    };
                }.bind(this);
                if (current.handler) {
                    safeCall(current.handler, app.obj);
                }
                _.forIn(ties, function (bind) {
                    var obj = bind.obj;
                    obj.$location = app.location;
                    var shown = current.has(obj);
                    obj.$shown = shown;
                    if (!bind.rendered) {
                        bind.render();
                    }
                    bind.validateShow();
                    var bindRoutes = obj.routes;
                    if (bindRoutes && shown) {
                        var r = bindRoutes[current.path];
                        if (r && r.handler) {
                            safeCall(r.handler, obj);
                        }
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
        has: function (obj) {
            var routes = obj.routes;
            if (routes) {
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
            return false;
        }
    };
    
    
    var pipesRegistry = {};
    
    /**
     * Pipes helpers. Exported to allow create and access pipes.
     *
     * @param {string} name pipe name
     * @param {Function} [fn] pipe function that will accept. If not defined existed pipe will return.
     * @param {Object} [opts] options (canWrite, changeRoutes, changeAttrs) default to false
     */
    var pipes = function (name, fn, opts) {
        if (_.isUndefined(fn)) {
            return pipesRegistry[name];
        }
        var defOpts = {
            canWrite: false,
            changeRoutes: false,
            changeAttrs: false
        };
        if (_.isDefined(opts)) {
            _.extend(defOpts, opts);
        }
        var pipe = {
            fn: fn,
            opts: defOpts
        };
        var m = new model(pipe);
        pipesRegistry[name] = m;
        return m;
    };
    
    /**
     * Pipe descriptor. Pipe is the way of transforming input model into new model and hijack new values when rendering element
     * attributes. Here is a pipe example : <i>data|property:'name', 'a'</i>. The result will be model with changed property name to 'a'.
     * <br><i>data|property:'name'</i> will replace property 'value' with value from property 'name'.
     * <br>Simpler form is <i>data.name</i>.
     *
     * @constructor
     * @class pipe
     * @this pipe
     * @param {string} str pipe string.
     */
    var pipe = function (str) {
        var split = str.split(':');
        this.name = _.trim(split[0]);
        this.params = '';
        if (split.length > 1) {
            var p = split[1];
            p = _.trim(p);
            p = '[' + p + ']';
            this.params = p;
        }
    
    };
    
    pipe.prototype = {
    
        /**
         * Process model from bind and returns new model after pipe execution
         *
         * @this pipe
         * @param {model} obj tied model
         * @param {Object} [value] new object value
         */
        process: function (obj, value) {
            var pipe = pipesRegistry[this.name];
            if (!pipe) {
                throw new Error('Pipe ' + this.name + ' not found');
            }
            var fn = pipe.fn;
            var params = [];
            if (this.params.length > 0) {
                var context = _.extend({}, obj);
                context = _.extend(context, pipe);
                var array = _.convert(this.params, context);
                _.forEach(array, function (param) {
                    param = _.trim(param);
                    params.push(param);
                });
            }
            var res = _.isDefined(value) && this.canWrite() ? obj : _.clone(obj);
            if (fn && _.isFunction(fn)) {
                res = safeCall(fn, pipe, true, res, params, value);
            }
            return res;
        },
    
        /**
         * Returns whether this pipe can change object value.
         *
         * @this pipe
         * @return boolean
         */
        canWrite: function () {
            var pipe = pipesRegistry[this.name];
            return pipe ? pipe.opts.canWrite : false;
        },
    
        /**
         * Returns whether this pipe can change routes.
         *
         * @this pipe
         * @return boolean
         */
        changeRoutes: function () {
            var pipe = pipesRegistry[this.name];
            return pipe ? pipe.opts.changeRoutes : false;
        },
    
        /**
         * Returns whether this pipe can change attributes.
         *
         * @this pipe
         * @return boolean
         */
        changeAttrs: function () {
            var pipe = pipesRegistry[this.name];
            return pipe ? pipe.opts.changeAttrs : false;
        }
    };
    
    
    var defaults = {
        type: "GET",
        mime: "json"
    };
    var mimeTypes = {
        script: "text/javascript, application/javascript",
        json: "application/json",
        xml: "application/xml, text/xml",
        html: "text/html",
        text: "text/plain"
    };
    
    var http = function (options, model) {
        if (options) {
            _.extend(this, options);
        }
        this.model = model;
    };
    
    var params = function (params, url) {
        var sign = "";
        if (url) {
            sign = url.indexOf("?") + 1 ? "&" : "?";
        }
        var res = sign;
        _.forIn(params, function (param, name) {
            if (res !== sign) {
                res += "&";
            }
            res += name + "=" + param;
        });
        if (res === sign) {
            return "";
        }
        return res;
    };
    
    var status = function (obj, xhr, dataType, fn) {
        var status = xhr.status;
        if ((status >= 200 && status < 300) || status === 0) {
            callback(obj, response(obj, xhr, dataType, fn), null, fn);
        } else {
            callback(obj, xhr.responseText, status, fn);
        }
    };
    
    var callback = function (obj, response, error, fn) {
        safeCall(fn, obj, obj.$ready(), response, error);
    };
    
    var headers = function (xhr, headers, dataType, contentType) {
        if (contentType) {
            headers["Content-Type"] = contentType;
        }
        if (dataType) {
            headers["Accept"] = mimeTypes[dataType];
        }
        _.forIn(headers, function (header, name) {
            xhr.setRequestHeader(name, header);
        });
    };
    
    var response = function (obj, xhr, dataType, fn) {
        var response;
        response = xhr.responseText;
        if (response) {
            if (dataType === defaults.mime) {
                try {
                    response = JSON.parse(response);
                } catch (error) {
                    callback(obj, response, error, fn);
                }
            } else {
                if (dataType === "xml") {
                    response = xhr.responseXML;
                }
            }
        }
        return response;
    };
    
    var thisOrApp = function (obj, property, defaultValue) {
        if (obj[property]) {
            return obj[property];
        }
        if (app && app.connect && app.connect[property]) {
            return app.connect[property];
        }
        return defaultValue;
    };
    
    var apply = function (obj, opts) {
        var cache = false;
        if (_.isUndefined(obj.cache)) {
            obj.cache = {};
            cache = true;
        }
        _.forIn(opts, function (value, prop) {
            if (value) {
                if (cache) {
                    obj.cache[prop] = obj[prop];
                }
                obj[prop] = value;
            }
        });
    };
    
    var fromCache = function (obj) {
        if (_.isDefined(obj.cache)) {
            _.forIn(obj.cache, function (value, prop) {
                if (value) {
                    obj[prop] = value;
                }
            });
            delete  obj.cache;
        }
    };
    
    var promise = function (obj, xhr) {
        var p = _.clone(obj);
        p.cancel = function () {
            xhr.abort();
        };
        p.ok = function () {
            if (this.fn) {
                safeCall(this.fn, this, this.$ready());
            }
        };
        p.ready = function (fn) {
            this.fn = fn;
        }
    
    };
    
    http.prototype = {
    
        ajax: function () {
            var type = this.getType();
            var url = this.getUrl();
            var data = this.getData();
            var dataType = this.getDataType();
            var contentType = this.getContentType();
            var heads = this.getHeaders();
            var fn = this.getCallback();
            if (type === defaults.type) {
                url += params(data, url);
            } else {
                data = params(data);
            }
            if (/=\$JSONP/ig.test(url)) {
                return this.jsonp(url, data, fn);
            }
            var xhr = new window.XMLHttpRequest();
            var future = promise(this.model, xhr);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    return status(future, xhr, dataType, fn);
                }
                return null;
            }.bind(this);
            xhr.open(type, url);
            headers(xhr, heads, contentType, dataType);
            try {
                xhr.send(data);
            } catch (error) {
                xhr = error;
                callback(future, null, error, fn);
            }
            return xhr;
        },
        jsonp: function (url, data, callback) {
            var head = window.document.getElementsByTagName("head")[0];
            var script = window.document.createElement("script");
            url += this.gatherParams(data, url);
    
            var callbackName = "jsonp" + _.uid();
            window[callbackName] = function (response) {
                head.removeChild(script);
                delete window[callbackName];
                return callback(response);
            };
    
            script.type = "text/javascript";
            script.src = url.replace(/=\$JSONP/ig, "=" + callbackName);
            head.appendChild(script);
        },
        get: function (url, data, dataType, callback) {
            if (arguments.length == 0) {
                fromCache(this);
            } else {
                apply(this, {
                    type: defaults.type,
                    url: url,
                    data: data,
                    callback: callback,
                    dataType: dataType
                });
            }
            return this.ajax();
        },
        post: function (url, data, dataType, callback) {
            return this.form("POST", url, data, dataType, callback);
        },
        put: function (url, data, dataType, callback) {
            return this.form("PUT", url, data, dataType, callback);
        },
        del: function (url, data, dataType, callback) {
            return this.form("DELETE", url, data, dataType, callback);
        },
        delete: function (url, data, dataType, callback) {
            return this.form("DELETE", url, data, dataType, callback);
        },
        form: function (method, url, data, dataType, callback) {
            if (arguments.length == 0) {
                fromCache(this);
            } else {
                apply(this, {
                    type: method,
                    url: url,
                    data: data,
                    callback: callback,
                    dataType: dataType,
                    contentType: "application/x-www-form-urlencoded"
                });
            }
            return this.ajax();
        },
    
        getUrl: function () {
            var url = thisOrApp(this, 'url', '');
            if (!url) {
                throw new Error("URL is not defined");
            }
        },
    
        getData: function () {
            return thisOrApp(this, 'data', {});
        },
    
        getType: function () {
            return thisOrApp(this, 'type', defaults.type);
        },
    
        getContentType: function () {
            return thisOrApp(this, 'contentType', null);
        },
    
        getDataType: function () {
            return thisOrApp(this, 'dataType', defaults.mime);
        },
    
        getHeaders: function () {
            return thisOrApp(this, 'header', []);
        },
    
        getCallback: function () {
            return thisOrApp(this, 'callback', function (response, error) {
                if (response && this.isObject(response)) {
                    this.extend(this, response);
                } else {
                    this.debug("Response received" + response);
                }
                if (error) {
                    console.error("Error received" + error);
                }
                if (this.isFunction(this.ok)) {
                    this.ok();
                }
            });
        }
    };
    
    
    /**
     * DOM manipulations functions
     *
     * @namespace q
     */
    var q = {
    
        /**
         * Appends list of elements to the index element
         *
         * @param {Node} index index node after which new elements will go.
         * @param {Node|Array} newElements one or more elements
         */
        next: function (index, newElements) {
            var parent = index.parentNode;
            _.forEach(newElements, function (node) {
                parent.insertBefore(node, index.nextSibling);
                index = node;
            });
        },
    
        /**
         * Removes element
         *
         * @param {Node} element element to remove.
         */
        remove: function (element) {
            var parent = element.parentNode;
            if (parent) parent.removeChild(element);
        },
    
        /**
         * Adds on load on hash change listener with callback specified.
         * <br>
         * Note: callback will be called when document loaded or instantly if document is already loaded
         * and every time when hash is changed.
         *
         * @param {Function} fn function to call.
         */
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
    
    /**
     * DOM element wrapper
     *
     * @constructor
     * @class $
     * @this $
     * @param {Element} el DOM element.
     * @param {bind} bind element bound tie
     */
    var $ = function (el, bind) {
        var listener = function (event) {
            _.debug("Fired '" + event.type + "' listener on '" + bind.name + "' for element " + el.tagName);
            var value = this.value();
            value = _.trim(value);
    
            if (this.pipes.length > 0) {
                this.pipeline(value);
            } else {
                if (bind.obj.value !== value) {
                    bind.obj.value = value;
                }
            }
        }.bind(this);
    
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
    
        if(this.isInput) {
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
    
        /**
         * Processes pipelines of current element
         *
         * @this $
         * @param {*} value value to use in pipeline
         * @returns {model} new object according to pipes
         */
        this.pipeline = function (value) {
            var res = this.bind.obj;
            if (this.pipes.length > 0) {
                _.forEach(this.pipes, function (pipe) {
                    if (_.isDefined(value)) {
                        res = pipe.process(res,  value);
                    } else {
                        res = pipe.process(res);
                    }
                    if(pipe.changeRoutes() && _.isUndefined(value) && _.isFunction(res.$location)) {
                        res.$shown = res.$location().route.has(res);
                    }
                }, this)
            }
            return res;
        }
    };
    
    $.prototype = {
    
        /**
         * Apply element attribute. Has polymorphic behavior.<br>
         *  <ul>
         *      <li>For attribute "value" calls this {@link $#value},
         *      <li>for attribute "text" calls this {@link $#text},
         *      <li>for function value adds event handler
         *      <li>else simple set attributes element.
         *  </ul>
         *
         * @this $
         * @param {string} name attribute name.
         * @param {*} [value] attribute value.
         */
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
                handler = function (event) {
                    event.index = this.index;
                    event.tie = this.tie;
                    safeCall(value, this.bind.obj, this.bind.obj.$ready(), event);
                }.bind(this);
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
    
        /**
         * Apply elements value or return current value if parameter is empty. Has polymorphic behavior.<br>
         *  <ul>
         *     <li>For input that has check checked attribute will be used,
         *     <li>for other inputs value attribute will be used,
         *     <li>else {@link $#text} will be called.
         *  </ul>
         * @this $
         * @param {*} [val] value.
         */
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
    
        /**
         * Apply elements text content or return current text content if parameter is empty. Has polymorphic behavior.<br>
         *  <ul>
         *     <li>For input next sibling text node will be used,
         *     <li>else underlying element text content will be used.
         *  </ul>
         * @this $
         * @param {string} [text] value.
         */
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
    
        /**
         * Removes underlying element from document and utilize current object from bind.
         *
         * @this $
         */
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
    
        /**
         * Appends list of elements to current element
         *
         * @this $
         * @param {Node|Array} newElements one or more elements
         */
        next: function (newElements) {
            var index = this.$;
            q.next(index, newElements);
        },
    
        /**
         * Show/hide current element. Uses style display property. Stores last display value to use it for restoring.
         *
         * @this $
         * @param {boolean} show
         */
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
    
    /**
     * Utilities. All those methods are available in model prototype. So when creating your tie you can use these utils.
     * For ex.
     * <pre>
     *      tie('data', function(arg) {
     *          if(this.isDefined(arg)) {
     *              return arg;
     *          }
     *      });
     * </pre>
     *
     * @namespace _
     */
    var _ = {
    
        /**
         * Enables debug mode.
         *
         * @property debugEnabled default to true
         */
        debugEnabled: false,
    
        /**
         * Whether value is undefined
         *
         * @param {*} value
         * @returns boolean
         */
        isUndefined: function (value) {
            return value == undefined;
        },
    
        /**
         * Whether value is defined
         *
         * @param {*} value
         * @returns boolean
         */
        isDefined: function (value) {
            return value != undefined;
        },
    
        /**
         * Whether value is object
         *
         * @param {*} value
         * @returns boolean
         */
        isObject: function (value) {
            return value != null && typeof value == 'object';
        },
    
        /**
         * Whether value is string
         *
         * @param {*} value
         * @returns boolean
         */
        isString: function (value) {
            return typeof value == 'string';
        },
    
        /**
         * Whether value is number
         *
         * @param {*} value
         * @returns boolean
         */
        isNumber: function (value) {
            return typeof value == 'number';
        },
    
        /**
         * Whether value is date
         *
         * @param {*} value
         * @returns boolean
         */
        isDate: function (value) {
            return Object.prototype.toString.apply(value) == '[object Date]';
        },
    
        /**
         * Whether value is array. Exact array match. Array-like objects (arguments, node lists) will not pass that check.
         *
         * @param {*} value
         * @returns boolean
         */
        isArray: function (value) {
            return Array.isArray(value) || Object.prototype.toString.apply(value) == '[object Array]';
        },
    
        /**
         * Whether value is array or array-like. Array-like objects (arguments, node lists) will pass that check.
         *
         * @param {*} value
         * @returns boolean
         */
        isCollection: function (value) {
            return this.isArray(value) || value instanceof Array
                || Object.prototype.toString.apply(value) == '[object NodeList]'
                || Object.prototype.toString.apply(value) == '[object NamedNodeMap]'
                || Object.prototype.toString.apply(value) == '[object Arguments]';
        },
    
        /**
         * Whether value is function.
         *
         * @param {*} value
         * @returns boolean
         */
        isFunction: function (value) {
            return typeof value == 'function';
        },
    
        /**
         * Whether value is boolean.
         *
         * @param {*} value
         * @returns boolean
         */
        isBoolean: function (value) {
            return typeof value == 'boolean';
        },
    
        /**
         * Remove trailing whitespaces from string.
         *
         * @param {string} value
         * @returns string
         */
        trim: function (value) {
            return this.isString(value) ? value.replace(/^\s*/, '').replace(/\s*$/, '') : value;
        },
    
        /**
         * Converts string to lower case.
         *
         * @param {string} string
         * @returns string
         */
        lowercase: function (string) {
            return this.isString(string) ? string.toLowerCase() : string;
        },
    
        /**
         * Converts string to upper case.
         *
         * @param {string} string
         * @returns string
         */
        uppercase: function (string) {
            return this.isString(string) ? string.toUpperCase() : string;
        },
    
        /**
         * Converts string to integer.
         *
         * @param {string} string
         * @returns number
         */
        toInt: function (string) {
            return parseInt(string, 10);
        },
    
        /**
         * Converts string to float.
         *
         * @param {string} string
         * @returns number
         */
        toFloat: function (string) {
            return parseFloat(string);
        },
    
        /**
         * Compares two strings ignoring case.
         *
         * @param {string} string1
         * @param {string} string2
         * @returns boolean
         */
        eqi: function (string1, string2) {
            return this.lowercase(string1) === this.lowercase(string2);
        },
    
        /**
         * Clones object using deep referencing.
         *
         * @param {*} obj
         * @returns Object|Array clone
         */
        clone: function (obj) {
            if (!obj || !this.isObject(obj)) {
                return obj;
            }
            var newObj = this.isArray(obj) ? [] : Object.create(Object.getPrototypeOf(obj));
            newObj = this.extend(newObj, obj, function (item) {
                if (item && this.isObject(item)) {
                    item = this.clone(item);
                }
                return item;
            }.bind(this));
            return newObj;
        },
    
        /**
         * Converts string to object of guessing type.
         *
         * Note: supports integer, float, boolean, string. String will be cleaned from quotes.
         *
         * @param {string} string
         * @param {Object} [context] object to get properties
         */
        convert: function (string, context) {
            var res = string;
            var reviver = function (k, v) {
                if (_.isString(v) && v[0] == '#') {
                    return context[v.substring(1)];
                }
                return v;
            };
            if ('true' === string) {
                res = true
            } else if ('false' === string) {
                res = false
            } else if (/^\d*$/.test(string)) {
                if (string.indexOf('.') != -1) {
                    res = this.toFloat(string);
                } else {
                    res = this.toInt(string);
                }
            } else if (string[0] == '[' && string[string.length - 1] == "]") {
                string = string.replace(/'/g, '"');
                res = JSON.parse(string, reviver);
            } else if (string[0] == '{' && string[string.length - 1] == "}") {
                string = string.replace(/'/g, '"');
                res = JSON.parse(string, reviver);
            } else if (string[0] == '"' || string[0] == "'") {
                res = string.substring(1, string.length - 1);
            }
            return res;
        },
    
        /**
         * Iterates through collection calling callback on every element. If only one item passed will call on it.
         *
         * For ex.
         *  <pre>
         *      forEach(array, function(item, i, collection){
         *          item.idx = i;
         *      })
         *  </pre>
         *
         * @param {Array|Object} collection
         * @param {Function} callback function
         * @param {Object} [thisArg] this object inside your callback
         * @param {boolean} [safe] if true will iterate over copy of collection, so you can easily remove elements from collection
         */
        forEach: function (collection, callback, thisArg, safe) {
            if (!thisArg) {
                thisArg = this;
            }
            if (callback) {
                if (this.isCollection(collection)) {
                    var index = -1;
                    var length = collection.length;
                    var coll = [];
                    if (safe) {
                        while (++index < length) {
                            coll.push(collection[index]);
                        }
                        index = -1;
                    } else {
                        coll = collection;
                    }
                    while (++index < length) {
                        if (callback.call(thisArg, coll[index], index, collection) === false) {
                            break;
                        }
                    }
                } else {
                    callback.call(thisArg, collection, 0, [collection]);
                }
            }
            return collection;
        },
    
        /**
         * Iterates through object own properties calling callback on every property.
         *
         * For ex.
         *  <blockquote>
         *      forIn(obj, function(value, prop, obj){
         *          value.prop = prop;
         *      })
         *  </pre>
         *
         * @param {Object} object
         * @param {Function} callback function
         * @param {Object} [thisArg] this object inside your callback
         * @param {boolean} [all = false] whether iterate  through all properties
         */
        forIn: function (object, callback, thisArg, all) {
            if (!thisArg) {
                thisArg = this;
            }
            if (callback) {
                for (var prop in object) {
                    if (object.hasOwnProperty(prop) || all) {
                        if (callback.call(thisArg, object[prop], prop, object) === false) {
                            break;
                        }
                    }
                }
            }
            return object;
        },
    
        /**
         * Generates unique identifier
         *
         * @returns string
         */
        uid: function () {
            return (s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4());
        },
    
        /**
         * Copies all properties/items of source to destination. Supports collections and objects.
         *
         * For ex.
         *  <pre>
         *      extend([], array, function(item, i){
         *          if(i == 0) return 'a';
         *          return item;
         *      });
         *      extend({}, obj, function(value, prop){
         *          if(prop == 'name') return 'a';
         *          return value;
         *      });
         *  </pre>
         *
         * @param {Array|Object} destination
         * @param {Array|Object} source
         * @param {Function} [fn] Function to be called on every item/property to change the item.
         * @returns Object|Array
         */
        extend: function (destination, source, fn) {
            if (this.isCollection(destination) && this.isCollection(source)) {
                this.forEach(source, function (item, i) {
                    if (fn) {
                        item = fn(item, i);
                    }
                    destination.push(item);
                });
            } else {
                this.forIn(source, function (value, prop) {
                    if (fn) {
                        value = fn(value, prop);
                    }
                    destination[prop] = value;
                }, this);
            }
            return destination;
        },
    
        /**
         * Writes debug string to console if debug enabled.
         *
         * @param {string} message
         * @param {string} [group] starts new collapsed group
         */
        debug: function (message, group) {
            if (this.debugEnabled) {
                if (group) {
                    console.groupEnd();
                    console.groupCollapsed(group);
                }
                console.log(message);
            }
        }
    };
    
    /**
     * Model object wrapper. In fact is created to extend originally passed object with utilities.
     *
     * @constructor
     * @class model
     * @this model
     * @param {Object} obj
     */
    var model = function (obj) {
        _.extend(this, obj);
    };
    
    model.prototype = _;
    
    /**
     * Return or override attribute value on current bound
     *
     * @this bind
     * @param {string} name attribute object
     * @param {*} value attribute object
     */
    model.prototype.$attr = function (name, value) {
        if (this.attrs) {
            var attr = this.attrs[name];
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
    
    /**
     * Return or override property value on current bound
     *
     * @this bind
     * @param {string} name property object like "name.length"
     * @param {*} value property object
     */
    model.prototype.$prop = function (name, value) {
        var res = this;
        var split = name.split('.');
        var i = 1;
        var length = split.length;
        while (i < length) {
            res = res[split[i - 1]];
            i++;
        }
        var last = split[length - 1];
        if (_.isUndefined(value)) {
            return res[last];
        } else {
            res[last] = value;
        }
        return null;
    };
    
    /**
     * Returns whether bind is ready. I.e. all dependencies are resolved.
     *
     * @this bind
     * @returns boolean
     */
    model.prototype.$ready = function () {
        var ready = true;
        _.forEach(this.$deps, function (dep) {
            var d = this['$' + dep];
            if (d._empty) {
                ready = false;
                return false;
            }
            return true;
        }, this);
        return ready;
    };
    
    
    /**
     * Execute function in try catch and returns call result or undefined.
     *
     * @param {Function} fn
     * @param {Object} fnThis object that form this reference in function context.
     * @param {boolean} [bindReady] whether bind on which function is called is ready.
     * @returns Object|undefined
     */
    var safeCall = function (fn, fnThis, bindReady) {
        var res;
        var spliceArgs = 3;
        if (_.isUndefined(bindReady) && _.isFunction(fnThis.$ready)) {
            bindReady = fnThis.$ready();
            spliceArgs = 2;
        }
        try {
            var args = Array.prototype.slice.call(arguments, spliceArgs);
            res = fn.apply(fnThis, args);
        } catch (e) {
            res = undefined;
            if (bindReady) {
                console.groupCollapsed("User code error");
                console.error('Is ready and had an error:' + e.message);
                console.dir(e);
                console.groupEnd();
            }
        }
        return res;
    };
    
    /**
     * Function that returns either property from object or from values array.
     *
     * @param {model} obj object that used to search for property.
     * @param {string} name property name.
     * @param {number} [idx = -1] element index or -1.
     * @returns Object|undefined
     */
    var findProperty = function (obj, name, idx) {
        if (_.isUndefined(idx)) {
            idx = -1;
        }
        var values = obj.values;
        if (idx >= 0 && values && _.isDefined(values[idx][name])) {
            return values[idx][name];
        }
        if (idx >= 0 && values && VALUE == name) {
            return values[idx];
        }
        return obj.$prop(name);
    };
    
    /**
     * Function that calculates attribute value.
     *
     * @param {model} obj object that from this reference in function context.
     * @param {number} [idx = -1] element index or -1.
     * @param {boolean} [bindReady] whether bind on which function is called is ready.
     * @returns Object|undefined
     */
    var valueFn = function (obj, idx, bindReady) {
        var name = this.name;
        var val = this.value;
        var property = this.property;
    
        if (_.isUndefined(bindReady)) {
            bindReady = obj.$ready();
        }
    
        if (_.isFunction(val)) {
            return safeCall(val, obj, bindReady)
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
    
    
    /**
     * Bound object wrapper. Represents data manipulation layer and general access to dynamic bindings.
     *
     * @constructor
     * @class bind
     * @this bind
     * @param {string} name tie name
     * @param {Array} dependencies tie dependencies
     * @param {Object} ties already registered ties dictionary
     */
    var bind = function (name, dependencies, ties) {
        this.name = name;
        this.touch = [];
        this.values = {};
        this.depends = dependencies || [];
        this.rendered = false;
        this.loaded = false;
        this.loading = false;
        this.selected = false;
        this.applyCount = 0;
        this.timeout = null;
        this.e = 0;
    
        /**
         * Apply model changes. It renders current bind and updates dependencies.
         *
         * @this bind
         */
        this.apply = function () {
            this.applyCount++;
            if (this.applyCount > 10) {
                _.debug("Too many apply :" + this.name + " - " + this.applyCount);
            }
            if (this.rendered) {
                this.render();
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
    
        /**
         * Internally checks and updates routes information on current bind.
         *
         * @this bind
         */
        prepareRoutes: function () {
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
    
        /**
         * Internally checks and updates attributes information on current bind.
         *
         * @this bind
         */
        prepareAttrs: function () {
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
                        attr = {name: attr[ITEM_NAME]};
                    } else {
                        attr = {name: name, value: attr}
                    }
                    attr.val = valueFn;
                    this.obj.attrs[name] = attr;
                }, this);
            }
        },
    
        /**
         * Internally checks and updates values array current bind.
         *
         * @this bind
         */
        prepareValues: function () {
            var values = this.obj.values;
            if (values) {
                if (this.$.length - this.e == values.length) {
                    this.rendered = false;
                    return;
                }
                var newElements = {};
                var nodes = {};
                _.forEach(this.$, function (el) {
                    if (el.index >= 0) {
                        el.remove();
                    }
                }, this, true);
                _.forEach(values, function (value, i) {
                    _.forEach(this.$, function (el) {
                        var id = el._id;
                        var node = nodes[id];
                        if (!node) {
                            nodes[id] = node = el.$;
                        }
                        var newEls = newElements[id];
                        if (!newEls) {
                            newElements[id] = newEls = [];
                        }
                        var newElement = node.cloneNode(true);
                        node.style.display = '';
                        newElement.setAttribute(INDEX, i);
                        newEls.push(newElement);
                    });
                }, this);
                _.forEach(this.$, function (el) {
                    var node = el.$;
                    node.style.display = 'none';
                    q.next(node, newElements[el._id]);
                });
                this.selected = false;
            }
        },
    
        /**
         * Show/hide elements of current bind.
         *
         * @this bind
         * @param {boolean} shown
         */
        show: function (shown) {
            if (this.rendered) {
                _.forEach(this.$, function (el) {
                    if (el) {
                        el.show(shown);
                    }
                }, this);
            }
        },
    
        /**
         * Check elements show rules
         *
         * @this bind
         */
        validateShow: function () {
            if (!this.loaded && !this.loading) {
                this.load();
            }
            _.forEach(this.$, function (el) {
                if (el) {
                    var shown = el.pipeline().$shown;
                    if (shown && !this.rendered) {
                        this.render();
                    }
                    el.show(shown);
                }
            }, this);
        },
    
        /**
         * Renders all elements of current bind. <br>
         * Rendering means particularly check whether bind is loaded and load it if needed, <br>
         * set value for every element attribute and show element if needed.
         */
        render: function () {
            if (!this.obj.$shown) {
                return;
            }
            _.debug("Render " + this.name, this.name + " Render");
            if (!this.loaded && !this.loading) {
                this.load();
            }
            _.forEach(this.$, function (el) {
                if (el) {
                    var obj = el.pipeline();
                    var ready = obj.$ready();
                    var attrs = obj.attrs;
                    var idx = el.index;
                    if (attrs) {
                        _.forIn(attrs, function (attr) {
                            var val = attr.val(obj, idx, ready);
                            var name = attr.name;
                            _.debug("Render attribute '" + name + "' with value " + val);
                            el.setAttribute(name, val);
                        });
                        el.setAttribute(TIED);
                        if (el.isInput) {
                            el.setAttribute('name', this.name);
                        }
                    }
                }
            }, this);
            this.show(this.obj.$shown);
            this.rendered = true;
            _.debug("Rendered " + this.name);
        }
    
    };
    
    /**
     * Application reference.
     */
    var app = null;
    
    /**
     * Returns function to apply ties with closure ties dictionary.
     */
    var tie = function () {
        var ties = {};
        return function (name, tiedObject, dependencies) {
            if (name != APP && ties[APP] == null) {
                window.tie(APP, {});
            }
            var prev = ties[name];
            if (prev && !prev.obj._empty && (_.isUndefined(dependencies) || prev.depends === dependencies)) {
                return tie.prototype.update(prev, tiedObject);
            } else {
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
        }
    };
    tie.prototype = {
    
        /**
         * Select DOM elements which are bound to current tie. Using 'data-tie' attribute. <br/>
         *
         * @param {string} tieName name of current tie
         * @param {bind} bind current tie bind
         */
        select: function (tieName, bind) {
            var nodes = window.document.querySelectorAll('[' + TIE + '="' + tieName + '"]');
            var res = [];
            _.forEach(nodes, function (el) {
                res.push(new $(el, bind));
            });
            nodes = window.document.querySelectorAll('[' + TIE + '^="' + tieName + '|"]');
            _.forEach(nodes, function (el) {
                res.push(new $(el, bind));
            });
            nodes = window.document.querySelectorAll('[' + TIE + '^="' + tieName + ' |"]');
            _.forEach(nodes, function (el) {
                res.push(new $(el, bind));
            });
            nodes = window.document.querySelectorAll('[' + TIE + '^="' + tieName + '."]');
            _.forEach(nodes, function (el) {
                res.push(new $(el, bind));
            });
            bind.selected = true;
            return res;
        },
    
        /**
         * Create object based on primitive value
         *
         * @param {Object} obj primitive
         */
        wrapPrimitive: function (obj) {
            return {
                value: obj,
                attrs: [VALUE]
            }
        },
    
        /**
         * Create object based on function
         *
         * @param {Function} fn
         */
        wrapFunction: function (fn) {
            return {
                attrs: {
                    value: fn
                }
            }
        },
    
        /**
         * Create object based on array
         *
         * @param {Array} array
         */
        wrapArray: function (array) {
            return {
                values: array,
                attrs: [VALUE]
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
            if (_.isUndefined(obj.$shown)) {
                obj.$shown = true;
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
                _.debug("Calling apply on '" + bind.name + "' after define");
                bind.apply();
            }
        },
    
        update: function (bind, tiedObject) {
            var name = bind.name;
            _.debug("Update tie " + name, name);
            _.extend(bind.obj, this.check(tiedObject));
            bind.prepareAttrs();
            bind.prepareRoutes();
            bind.prepareValues();
            _.debug("Prepared inner array structure");
            bind.obj = proxy(bind);
            if (!bind.selected) {
                this.$ = tie.select(name, bind);
                _.debug("Elements reselected: " + this.$.length);
            }
            if (!bind.rendered) {
                bind.render();
            }
            return prev;
        },
    
        init: function (name, tiedObject, dependencies, ties) {
            _.debug("Tie " + name, name);
            var r = new bind(name, dependencies, ties);
            r.obj = this.check(tiedObject);
            r.prepareAttrs();
            r.prepareRoutes();
            this.resolve(r, dependencies, ties);
            r.obj.$deps = r.depends;
            r.obj = proxy(r);
            _.debug("Bind model ready");
            var tie = this;
            r.load = function () {
                this.loading = true;
                if (!this.selected) {
                    this.$ = tie.select(name, r);
                    this.e = this.$.length;
                    _.debug("Elements selected: " + this.$.length);
                }
                r.prepareValues();
                _.debug("Prepared inner array structure");
                if (!this.selected) {
                    this.$ = tie.select(name, r);
                    _.debug("Elements reselected: " + this.$.length);
                }
                this.loaded = true;
                this.loading = false;
            };
            return r;
        }
    };

    /**
     * Exports
     */
    window.tie = tie();
    window.tie.pipes = pipes;

    /**
     * Property pipeline definition
     */
    pipes("property", function (obj, params, value) {
        if (params) {
            var prop = params[0];
            var target = params.length > 1 ? params[1] : VALUE;
            if (_.isUndefined(value)) {
                obj.$prop(target, obj.$prop(prop))
            } else {
                obj.$prop(prop, value);
            }
        }
        return obj;
    }, {canWrite: true});

    /**
     * Value pipeline definition
     */
    pipes("value", function (obj, params) {
        if (params) {
            var prop = params[0];
            var val = params.length > 1 ? params[1] : null;
            obj.$prop(prop, val);
        }
        return obj;
    });

    /**
     * Routes pipeline definition
     */
    pipes("routes", function (obj, params) {
        if (params) {
            var add = params[0] === '+';
            var subtract = params[0] === '-';
            if (add) {
                params.splice(0, 1);
                this.forEach(params, function (item) {
                    obj.routes[item] = {path: item};
                });
            } else if (subtract) {
                params.splice(0, 1);
                this.forEach(params, function (item) {
                    delete obj.routes[item];
                });
            } else {
                obj.routes = {};
                this.forEach(params, function (item) {
                    obj.routes[item] = {path: item};
                });
            }
        }
        return obj;
    }, {changeRoutes: true});

})(window);
