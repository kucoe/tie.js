/**
 * Tie.js File handle
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */

var fs = require('fs');
var tie = require('./core')();

var fsyncs = {};

var fsync = function (path, obj, watcher) {
    this.started = false;
    this.path = path;
    this.watcher = watcher;
    this.obj = obj;
};

fsync.prototype = {
    read: function () {
        var data = fs.readFileSync(this.path, 'utf-8');
        tie._.extend(this.obj, JSON.parse(data));
        this.watcher.inspect();
    },

    write: function () {
        var data = fs.readFileSync(this.path, 'utf-8');
        var o = JSON.parse(data);
        tie._.forIn(o, function (item, prop) {
            o[prop] = this.obj[prop];
        }, this);
        fs.writeFileSync(this.path, JSON.stringify(o), 'utf-8');
    },

    start: function (interval) {
        if (!this.started) {
            this.started = true;
            var self = this;
            this.read();
            this.fWatch = function (curr, prev) {
                if (curr.mtime.getTime() > prev.mtime.getTime()) {
                    self.read()
                }
            };
            fs.watchFile(this.path, {interval: interval}, this.fWatch);
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
            fs.unwatchFile(this.path, this.fWatch);
            this.watcher.remove(this.watch);
        }
    }
};


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
    if(prev) {
        prev.stop();
    }
    if (config.sync > 0) {
        fsyncs[name] = f;
        f.start(config.sync);
    }
    config.read = function() {
        f.read.call(f);
    };
    config.write = function(){
        f.write.call(f);
    };
    return config;
});

