/**
 * Tie.js File handle
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */

var fs = require('fs');

var _;

module.exports = function (core, test) {
    if (test) {
        file.fsyncs = fsyncs;
    }
    _ = core._;
    init(core);
    return file;
};

var fsyncs = {};

var fsync = function (path, obj, observer) {
    this.started = false;
    this.path = path;
    this.observer = observer;
    this.obj = obj;
};

fsync.prototype = {
    read: function () {
        file.read(this.path, this.obj, this.observer);
    },

    write: function () {
        file.write(this.path, this.obj);
    },

    start: function (interval, handleId) {
        if (!this.started) {
            this.started = true;
            var self = this;
            this.fWatch = file.watch(this.path, this.obj, interval, this.watcher);
            this.watch = this.observer.watch('*', handleId, function () {
                self.write();
            });
            this.observer.watch('_deleted', handleId, function (obj, prop, val) {
                if (val) {
                    delete fsyncs[obj.$name];
                    self.stop();
                }
            });
        }
    },

    stop: function () {
        if (this.started) {
            this.started = false;
            file.unwatch(this.path, this.fWatch);
            this.observer.remove(this.watch);
        }
    }
};

var file = {

    read: function (path, obj, observer) {
        var data = fs.readFileSync(path, 'utf-8');
        _.extend(obj, JSON.parse(data));
        if(observer) {
            observer.observe();
        }
        return data;
    },

    write: function (path, obj) {
        var data = fs.readFileSync(path, 'utf-8');
        var o = JSON.parse(data);
        _.forIn(o, function (item, prop) {
            o[prop] = obj[prop];
        }, this);
        fs.writeFileSync(path, JSON.stringify(o), 'utf-8');
    },

    watch: function (path, obj, interval, observer) {
        this.read(path, obj, observer);
        var fWatch = function (curr, prev) {
            if (curr.mtime.getTime() > prev.mtime.getTime()) {
                file.read(path, obj, observer)
            }
        };
        fs.watchFile(path, {interval: (interval || 5007) }, fWatch);
        return fWatch;
    },

    unwatch: function (path, listener) {
        fs.unwatchFile(path, listener);
    }
};

var init = function(tie) {
    tie.handle("file", function (obj, config, observer) {
        if (this.isString(config)) {
            config = {
                path: config,
                sync: 0
            }
        }
        var f = new fsync(config.path, obj, observer);
        var name = obj.$name;
        var prev = fsyncs[name];
        if (prev) {
            prev.stop();
        }
        if (config.sync > 0) {
            fsyncs[name] = f;
            f.start(config.sync, this._uid);
        }
        config.read = function () {
            f.read();
        };
        config.write = function () {
            f.write();
        };
        return config;
    });
};




