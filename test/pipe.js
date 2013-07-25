var tie = require('../src/lib/core')(true);
var pipes = tie.pipesRegistry;

var should = require('should');

afterEach(function () {
    var prop;
    for (prop in pipes) {
        if (pipes.hasOwnProperty(prop)) {
            delete pipes[prop];
        }
    }
});

describe('pipe', function () {
    it('should prevent existing', function () {
        tie.pipe("a", function () {
        }, [], true);
        var a = function () {
            tie.pipe("a", function () {
            });
        }.should.throw();
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
        a.memo = {'John':12};
        var b = tie.pipe("b", function (obj) {
            return obj;
        });
        b.memo = {'John':14};
        a({name:'John'}).age.should.eql(12);
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
        tie.pipe("filter", function(obj, params) {
            var search = new RegExp(params.join('|'), 'gi');
            obj.value = obj.value.replace(search, '');
            return obj;
        });
        var b = tie("a")('upper')('filter', 'r', 'l')();
        a.value.should.eql("aral", "original");
        b.value.should.eql("AA", "pipe");
    });
});