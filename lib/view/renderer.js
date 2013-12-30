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
        if (this.$) {
            _.forEach(this.$, function (el) {
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
            }, this);
        }
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