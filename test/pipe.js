var tie = require('../src/lib/core')(true);
var pipes = tie.pipesRegistry;

var should = require('should');

describe('pipe', function () {
    afterEach(function () {
        var prop;
        for (prop in pipes) {
            if (prop === 'property') {
                continue;
            }
            if (pipes.hasOwnProperty(prop)) {
                delete pipes[prop];
            }
        }
    });
    it('should prevent existing', function () {
        tie.pipe("a", function () {
        }, [], true);
        var a = function () {
            tie.pipe("a", function () {
            });
        }.should.throw('a pipe already registered and sealed. Please choose another name for your pipe');
    });
    it('should prevent dot', function () {
        var a = function () {
            tie.pipe(".a", function () {
            });
        }.should.throw('.a is not valid name for your pipe');
    });
    it('should have dependencies', function () {
        tie.pipe("a", function (obj) {
            obj.name = "John";
            return obj;
        });
        var b = tie.pipe("b", function (obj) {
            return this.$$a(obj);
        }, ['a']);
        b({}).name.should.eql("John");
    });
    it('should allow memoization', function () {
        var a = tie.pipe("a", function (obj) {
            obj.age = this.memo[obj.name] | 0;
            return obj;
        });
        a.memo = {'John': 12};
        var b = tie.pipe("b", function (obj) {
            return obj;
        });
        b.memo = {'John': 14};
        a({name: 'John'}).age.should.eql(12);
    });
    it('should pipe tie by name', function () {
        var a = tie("a", "aaa");
        tie.pipe("upper", function (obj) {
            obj.value = this.uppercase(obj.value);
            return obj;
        });
        var b = tie("a")('upper')();
        a.value.should.eql("aaa", "original");
        b.value.should.eql("AAA", "pipe");
    });
    it('should pipe tie by name and use updated', function () {
        var a = tie("a", "aaa");
        tie.pipe("upper", function (obj) {
            obj.value = this.uppercase(obj.value);
            return obj;
        });
        tie("a", "bbb");
        var b = tie("a")('upper')();
        a.value.should.eql("aaa", "original");
        b.value.should.eql("BBB", "pipe");
    });
    it('should chain pipes for tie by name', function () {
        var a = tie("a", "aral");
        tie.pipe("upper", function (obj) {
            obj.value = this.uppercase(obj.value);
            return obj;
        });
        tie.pipe("filter", function (obj, params) {
            var search = new RegExp(params.join('|'), 'gi');
            obj.value = obj.value.replace(search, '');
            return obj;
        });
        var b = tie("a")('upper')('filter', 'r', 'l')();
        a.value.should.eql("aral", "original");
        b.value.should.eql("AA", "pipe");
    });
    it('should parse pipes', function () {
        var a = tie("a", "aral");
        tie.pipe("upper", function (obj) {
            obj.value = this.uppercase(obj.value);
            return obj;
        });
        tie.pipe("filter", function (obj, params) {
            var search = new RegExp(params.join('|'), 'gi');
            obj.value = obj.value.replace(search, '');
            return obj;
        });
        var b = tie.$("a|upper|filter:'r','l'");
        a.value.should.eql("aral", "original");
        b.value.should.eql("AA", "pipe");
    });
    it('should call property pipe', function () {
        var a = tie("a", {name: "aral"});
        var b = tie.$("a|property:'name'");
        a.name.should.eql("aral", "original");
        b.value.should.eql("aral", "pipe");
    });
    it('should allow target property pipe', function () {
        var a = tie("a", {name: "aral"});
        var b = tie.$("a|property:'name', 'desc'");
        a.name.should.eql("aral", "original");
        b.desc.should.eql("aral", "pipe");
    });
    it('should parse and call property pipe', function () {
        var a = tie("a", {name: "aral"});
        var b = tie.$("a.name");
        a.name.should.eql("aral", "original");
        b.value.should.eql("aral", "pipe");
    });
    it('should not allow target property pipe implicitly', function () {
        var a = tie("a", {name: "aral"});
        var b = tie.$("a.name, 'desc'");
        a.name.should.eql("aral", "original");
        should.not.exist(b.desc);
    });
    it('should allow dot in pipe', function () {
        tie.pipe("upper.pipe", function (obj) {
            obj.value = this.uppercase(obj.value);
            return obj;
        });
        var a = tie("a", {name: "aral"});
        var b = tie.$("a.name|upper.pipe");
        a.name.should.eql("aral", "original");
        b.value.should.eql("ARAL", "pipe");
    });
    it('should combine pipes', function () {
        tie.pipe("upper", function (obj) {
            obj.value = this.uppercase(obj.value);
            return obj;
        });
        var a = tie("a", {name: "aral"});
        var b = tie.$("a.name|upper");
        a.name.should.eql("aral", "original");
        b.value.should.eql("ARAL", "pipe");
    });
    it('should use deep properties', function () {
        tie.pipe("upper", function (obj) {
            obj.value = this.uppercase(obj.value);
            return obj;
        });
        var a = tie("a", {name: "aral"});
        var b = tie.$("a.name.0|upper");
        a.name.should.eql("aral", "original");
        b.value.should.eql("A", "pipe");
    });
    it('should do not mix properties', function () {
        tie.pipe("upper", function (obj) {
            obj.value = this.uppercase(obj.value);
            return obj;
        });
        var a = tie("a", {value: "aral"});
        (function () {
            tie.$("a|upper.name");
        }.should.throw('Pipe upper.name not found'));
    });
    it('should allow pipe for properties', function () {
        tie.pipe("upper", function (obj) {
            obj.value = this.uppercase(obj.value);
            return obj;
        });
        var a = tie("a", {value: "aral", name: 'uu'});
        var b = tie.$("a|upper|.name");
        a.value.should.eql("aral", "original");
        b.value.should.eql("uu", "pipe");
    });
    it('should allow async pipe', function (done) {
        tie.pipe("upper", function (obj, params, next) {
            var self = this;
            setTimeout(function () {
                obj.value = self.uppercase(obj.value);
                next(obj);
            }, 200);
        });
        var a = tie("a", {value: "aral", name: 'uu'});
        tie.$("a|upper|.name", function (obj) {
            a.value.should.eql("aral", "original");
            obj.value.should.eql("uu", "pipe");
            done();
        });
    });
    it('should chain async pipes', function (done) {
        tie.pipe("upper", function (obj, params, next) {
            var self = this;
            setTimeout(function () {
                obj.value = self.uppercase(obj.value);
                next(obj);
            }, 200);
        });
        var a = tie("a", {value: "aral", name: 'uu'});
        tie("a")('upper')("property", "name")(function(obj) {
            a.value.should.eql("aral", "original");
            obj.value.should.eql("uu", "pipe");
            done();
        });
    });
});