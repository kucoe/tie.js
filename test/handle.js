var tie = require('../src/lib/core')(true);
var handles = tie.handlesRegistry;

var should = require('should');

afterEach(function () {
    var prop;
    for (prop in handles) {
        if (prop === 'attrs' || prop === 'shown' || prop === 'attr') {
            continue;
        }
        if (handles.hasOwnProperty(prop)) {
            delete handles[prop];
        }
    }
});

describe('handle', function () {
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
    it('should watch property', function () {
        tie.handle("a", function (obj, config, watcher) {
            var w = function (obj) {
                obj.total = config + ' ' + obj.name;
            };
            watcher.add('name', w);
            return config;
        });
        var test = tie("test", {$a: "Hello", name: 'Jack'});
        test.total.should.eql("Hello Jack");
        test.name = 'Wolf';
        test.name.should.eql("Wolf");
        test.total.should.eql("Hello Wolf");
    });
    it('should not loose watcher', function () {
        tie.handle("a", function (obj, config, watcher) {
            var w = function (obj) {
                obj.total = config + ' ' + obj.name;
            };
            watcher.add('name', w);
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
        tie.handle("a", function (obj, config, watcher) {
            var w = function (obj) {
                obj.total = config + ' ' + obj.name;
            };
            watch = watcher;
            watcher.add('name', w);
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
        watch.watchers.length.should.eql(1, 'watches')
    });
});
