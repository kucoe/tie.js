global.test = true;
var tie = require('../lib/tie');
var handles = tie.handlesRegistry;

var should = require('should');

describe('handle', function () {
    afterEach(function () {
        var prop;
        for (prop in handles) {
            if (prop === 'http'
                || prop === 'require' || prop === 'file' || prop === 'view' || prop === 'request' || prop == 'route') {
                continue;
            }
            if (handles.hasOwnProperty(prop)) {
                delete handles[prop];
            }
        }
    });
    it('should prevent existing', function () {
        tie.handle("a", function () {
        }, [], true);
        var a = function () {
            tie.handle("a", function () {
            });
        }.should.throw();
    });
    it('should have name', function () {
        var a = tie.handle("a", function (obj, config) {
            config.name = this.$name;
            return config;
        });
        a({}, {}).name.should.eql("a");
    });
    it('should have dependencies', function () {
        tie.handle("a", function (obj, config) {
            config.name = "John";
            return config;
        });
        var b = tie.handle("b", function (obj, config) {
            return this.$$a(obj, config);
        }, ['a']);
        b({}, {}).name.should.eql("John");
    });
    it('should allow memoization', function () {
        var a = tie.handle("a", function (obj, config) {
            config.age = this.memo[config.name] || 0;
            return config;
        });
        a.memo = {'John': 12};
        var b = tie.handle("b", function (obj, config) {
            return config;
        });
        b.memo = {'John': 14};
        a({}, {name: 'John'}).age.should.eql(12);
    });
    it('should handle property', function () {
        tie.handle("a", function (obj, config) {
            obj.name = config;
            return {name: config};
        });
        var a = tie("a", {$a: 'John'});
        a.$a.should.eql({name: 'John'}, 'config');
        a.name.should.eql('John', 'name');
    });
    it('should handle property from app', function () {
        tie.handle("a", function (obj, config) {
            obj.name = config;
            return {name: config};
        });
        tie("app", {$a: 'John'});
        var a = tie("a", {});
        a.name.should.eql('John', 'name');
        a.$a.should.eql({name: 'John'}, 'config');
    });
    it('should use dependencies order', function () {
        var b = tie.handle("b", function (obj, config) {
            obj.name = obj.name + ' ' + config;
            return config;
        }, ['a']);
        tie.handle("a", function (obj, config) {
            obj.name = config;
            return config;
        });
        var test = tie("test", {$a: "Jack", $b: "Wolf"});
        test.name.should.eql("Jack Wolf");
    });
    it('should not recall deps', function () {
        var b = tie.handle("b", function (obj, config) {
            obj.name = obj.name + ' ' + config;
            return config
        }, ['a']);
        tie.handle("a", function (obj, config) {
            obj.name = config == 'Jack' ? 'Wolf' : 'Jack';
            return config;
        });
        var test = tie("test", {$a: "Jack", $b: "Wolf"});
        test.name.should.eql("Wolf Wolf");
        test.$b = "Jack";
        test.name.should.eql("Wolf Wolf Jack");
    });
    it('should watch config', function () {
        tie.handle("a", function (obj, config) {
            obj.name = config;
            return config;
        });
        var test = tie("test", {$a: "Jack"});
        test.name.should.eql("Jack");
        test.$a = 'Wolf';
        test.name.should.eql("Wolf");
    });
    it('should prevent config in handler', function () {
        tie.handle("a", function () {
            return 'Me';
        });
        var test = tie("test", {$a: 'Wolf'});
        test.$a = 'Wolf';
        test.$a.should.eql("Me");
    });
    it('should watch property change', function () {
        tie.handle("a", function (obj, config, observer) {
            var w = function (obj) {
                obj.total = config + ' ' + obj.name;
            };
            observer.watch('name', this._uid, w);
            return config;
        });
        var test = tie("test", {$a: "Hello", name: 'Jack'});
        test.total.should.eql("Hello Jack");
        test.name = 'Wolf';
        test.name.should.eql("Wolf");
        test.total.should.eql("Hello Wolf");
    });
    it('should watch property delete', function () {
        var watch = null;
        tie.handle("a", function (obj, config, observer) {
            var w = function (obj) {
                obj.total = config + ' deleted';
            };
            watch = observer;
            observer.watch('name', this._uid, {}, w);
            return config;
        });
        var test = tie("test", {$a: "Hello", name: 'Jack'});
        if (watch) {
            delete test.name;
            watch.observe();
        }
        test.total.should.eql("Hello deleted");
    });
    it('should watch array change on demand', function () {
        tie.handle("array", function (obj, config, observer) {
            var onChange = function (item) {
                return 'Hello ' + item;
            };
            tie._.forEach(config, function(item, i) {
                config[i] = onChange(item);
            });
            config = observer.observeArray(config, onChange);
            return config;
        });
        var test = tie("test", {$array: ["Jack"]});
        test.$array[0].should.eql("Hello Jack");
        test.$array.set(0, 'Wolf');
        test.$array[0].should.eql("Hello Wolf");
    });
    it('should watch array addition on demand', function () {
        tie.handle("array", function (obj, config, observer) {
            var onChange = function (item) {
                return 'Hello ' + item;
            };
            tie._.forEach(config, function(item, i) {
                config[i] = onChange(item);
            });
            config = observer.observeArray(config, onChange, onChange);
            return config;
        });
        var test = tie("test", {$array: ["Jack"]});
        test.$array[0].should.eql("Hello Jack");
        test.$array.push('Wolf');
        test.$array[1].should.eql("Hello Wolf");
    });
    it('should watch array remove on demand', function () {
        tie.handle("array", function (obj, config, observer) {
            var onChange = function (item) {
                return 'Hello ' + item;
            };
            config = observer.observeArray(config, onChange, onChange, onChange);
            return config;
        });
        var test = tie("test", {$array: ["Jack"]});
        test.$array[0].should.eql("Jack");
        test.$array.pop().should.eql("Hello Jack", 'removed');
    });
    it('should watch array complex changes on demand', function () {
        tie.handle("array", function (obj, config, observer) {
            var onChange = function (item) {
                return 'Changed ' + item;
            };
            config = observer.observeArray(config, onChange);
            return config;
        });
        var test = tie("test", {$array: ["Jack", "Pepe", "Olly"]});
        test.$array.sort();
        test.$array[0].should.eql("Jack");
        test.$array[1].should.eql("Changed Olly");
        test.$array[2].should.eql("Changed Pepe");
        test.$array[0] = "Jacky";
        test.$array[0].should.eql("Jacky");
        test.$array.check();
        test.$array[0].should.eql("Changed Jacky");
    });
    it('should not loose watcher', function () {
        tie.handle("a", function (obj, config, observer) {
            var w = function (obj) {
                obj.total = config + ' ' + obj.name;
            };
            observer.watch('name', this._uid, w);
            return config;
        });
        tie("test", {$a: "Hello", name: 'Jack'});
        var test = tie("test", {$a: "Bye", name: 'Jack'});
        test.total.should.eql("Bye Jack");
        test.name = 'Wolf';
        test.name.should.eql("Wolf");
        test.total.should.eql("Bye Wolf");
    });
    it('should not duplicate watches', function () {
        var watch = null;
        tie.handle("a", function (obj, config, observer) {
            var w = function (obj) {
                obj.total = config + ' ' + obj.name;
            };
            watch = observer;
            observer.watch('name', this._uid, w);
            w(obj);
            return config;
        });
        var test = tie("test", {$a: "Hello", name: 'Jack'});
        test.$a = 'Bye';
        test.total.should.eql("Bye Jack");
        test.name = 'Wolf';
        test.name.should.eql("Wolf");
        test.total.should.eql("Bye Wolf");
        should.exist(watch);
        watch.listeners.length.should.eql(1, 'watches')
    });
    it('should prevent from cycling in watcher', function () {
        var watch = null;
        tie.handle("a", function (obj, config, observer) {
            var w = function (obj, prop, val) {
                obj[prop] = this.lowercase(val);
            };
            watch = observer;
            observer.watch(config + '_.+', this._uid, w);
            return config + ' resolver';
        });
        var test = tie("test", {$a: "app", name:'uu', app_name: 'Jack'});
        test.app_name.should.eql('jack', 'app name');
        test.$a = 'name';
    });
    it('should work with require', function () {
        var test = tie("a", { value: function () {
            return this.$$b.value;
        }, $require: '../example/require_test.js'}, ['b']);
        test.value().should.eql('b', 'dynamic value');
    });
    it('should clone with functionality', function (done) {
        tie.handle('test', function (obj, config) {
            if (config !== '') {
                config.should.eql('debug', 'type');
                obj.value.should.eql('b', 'logged');
                done();
            }
            return config;
        });
        var test = tie("a", { value: 'a', name: 'b', $test: ''});
        var r = tie("a")('property', 'name')();
        r.$test = 'debug';
        test.value.should.eql('a', 'original');
    });
});
