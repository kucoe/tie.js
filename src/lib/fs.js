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

var fsync = function (path, obj, watcher) {
    this.started = false;
    this.path = path;
    this.watcher = watcher;
    this.obj = obj;
};

fsync.prototype = {
    read: function () {
        file.read(this.path, this.obj);
    },

    write: function () {
        file.write(this.path, this.obj);
    },

    start: function (interval) {
        if (!this.started) {
            this.started = true;
            var self = this;
            this.fWatch = file.watch(this.path, this.obj, interval, this.watcher);
            this.watch = this.watcher.watch('*', function () {
                self.write();
            });
            this.watcher.watch('_deleted', function (obj, prop, val) {
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
            this.watcher.remove(this.watch);
        }
    }
};

var file = {

    read: function (path, obj, watcher) {
        var data = fs.readFileSync(path, 'utf-8');
        _.extend(obj, JSON.parse(data));
        if(watcher) {
            watcher.inspect();
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

    watch: function (path, obj, interval, watcher) {
        this.read(path, obj, watcher);
        var fWatch = function (curr, prev) {
            if (curr.mtime.getTime() > prev.mtime.getTime()) {
                file.read(path, obj, watcher)
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
    tie.handle("file", function (obj, config, watcher) {
        if (this.isString(config)) {
            config = {
                path: config,
                sync: 0
            }
        }
        var f = new fsync(config.path, obj, watcher);
        var name = obj.$name;
        var prev = fsyncs[name];
        if (prev) {
            prev.stop();
        }
        if (config.sync > 0) {
            fsyncs[name] = f;
            f.start(config.sync);
        }
        config.read = function () {
            f.read.call(f);
        };
        config.write = function () {
            f.write.call(f);
        };
        return config;
    });
};




