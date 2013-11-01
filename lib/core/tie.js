var tie = function (name, tiedObject, dependencies, sealed) {
    if (name != APP && ties[APP] == null) {
        module.tie(APP, {});
    }
    var r = ties[name];
    if (_.isUndefined(tiedObject)) {
        return  pipeModel(r.obj);
    }
    if (r && r.obj.$sealed) {
        throw new Error(name + ' tie is already registered and sealed. Please choose another name for your tie');
    }
    r = tie.prototype.init(name, tiedObject, dependencies, sealed);
    tie.prototype.define(name, r);
    if (name == APP) {
        app = r;
    }
    return r.obj;
};

tie.prototype = {

    check: function (obj) {
        if (_.isFunction(obj) || _.isArray(obj) || _.isRegExp(obj) || _.isBoolean(obj)
            || _.isNumber(obj) || _.isString(obj) || _.isDate(obj) || !_.isObject(obj)) {
            obj = {value: obj};
        }
        return new model(obj);
    },

    resolveDependencies: function (bind, dependencies) {
        var name = bind.name;
        if (name != APP) {
            bind.obj[DEP_PREFIX + APP] = app.obj;
            if (app.touch.indexOf(name) == -1) {
                app.touch.push(name);
            }
        }
        if (!dependencies) {
            return;
        }
        _.forEach(dependencies, function (dep) {
            _.debug("Check dependency " + dep);
            var found = ties[dep];
            if (!found) {
                _.debug("Dependency stub " + dep);
                found = {name: dep, touch: [], obj: {_empty: true}};
                this.define(dep, found);
            }
            bind.obj[DEP_PREFIX + dep] = found.obj;
            if (found.touch.indexOf(name) == -1) {
                found.touch.push(name);
            }
        }, this);
    },

    define: function (name, bind) {
        var old = ties[name];
        ties[name] = bind;
        if (old) {
            old.obj._deleted = true;
            if (old.touch) {
                bind.touch = old.touch;
                _.debug("Calling apply on '" + bind.name + "' after define");
                bind.apply('*');
            }
        }
    },

    init: function (name, tiedObject, dependencies, sealed) {
        _.debug("Tie " + name, name);
        var r = new bind(name);
        var obj = r.obj = this.check(tiedObject);
        fillSystemFields(obj, name, sealed, dependencies);
        obj._deleted = false;
        r.resolveHandles();
        this.resolveDependencies(r, dependencies);
        r.props = proxy(r);
        _.debug("Bind model ready");
        return r;
    }
};