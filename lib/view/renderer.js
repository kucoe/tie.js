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
            vh.onChange = function (obj, prop, val, vanes) {
                if (!interest || interest === prop) {
                    onChange.call(this, obj, prop, val, vanes);
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
                if (el.tie !== tieName) {
                    obj = parse(el.tie, undefined, obj);
                    $shown = obj.$view.$shown;
                }
                if (prop) {
                    var val = obj.$prop('$view.' + prop);
                    if (!val && obj.$view._amap) {
                        val = obj.$prop(prop);
                    }
                    if (val) {
                        this.$renderAttr(obj, prop, val, el);
                    }
                } else {
                    if (obj.$view._amap) {
                        var attrs = [].slice.call(el.$.attributes);
                        _.forEach(attrs, function (item) {
                            prop = item.nodeName;
                            var val = obj.$prop(prop);
                            this.$renderAttr(obj, prop, val, el);
                        }, this);
                    } else {
                        _.forIn(obj.$view, function (val, prop) {
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

    $renderChildren: function (children, obj, clean, els) {
        els = els || this.$;
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
                        this.$renderAttr(obj, prop, val, w);
                    }
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


    inspectAttrs: function (obj, prop, val, vanes, els) {
        els = els || this.$;
        _.forEach(vanes, function (item) {
            if (item.indexOf('$view') == 0) {
                var name = item.replace(/\$view\./g, '');
                if (_.isHandle(name)) {
                    var vh = viewHandlers[name.substring(1)];
                    if (vh && _.isFunction(vh.onChange)) {
                        vh.onChange(obj, prop, val, vanes);
                    }
                } else {
                    _.forEach(els, function (el) {
                        this.$renderAttr(obj, name, obj.$prop(item), el);
                    }, this);
                }
            }
        }, this);
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