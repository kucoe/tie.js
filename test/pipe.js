var tie = require('../src/next/core')(true);
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
        tie.pipes("a", function () {
        });
        var a = function () {
            tie.pipes("a", function () {
            });
        }.should.throw();
    });
    it('should pipe tie', function () {
        var a = tie("a", "aaa");
        tie.pipes("upper", function (obj) {
            obj.value = this.uppercase(obj.value);
            return obj;
        });
        var b = a.$pipe()('upper')();
        a.value.should.eql("aaa", "original");
        b.value.should.eql("AAA", "pipe");
    });
    it('should pipe tie by name', function () {
        var a = tie("a", "aaa");
        tie.pipes("upper", function (obj) {
            obj.value = this.uppercase(obj.value);
            return obj;
        });
        var b = tie._("a")('upper')();
        a.value.should.eql("aaa", "original");
        b.value.should.eql("AAA", "pipe");
    });
    it('should pipe tie by name and use updated', function () {
        var a = tie("a", "aaa");
        tie.pipes("upper", function (obj) {
            obj.value = this.uppercase(obj.value);
            return obj;
        });
        tie("a", "bbb");
        var b = tie._("a")('upper')();
        a.value.should.eql("aaa", "original");
        b.value.should.eql("BBB", "pipe");
    });
    it('should chain pipes', function () {
        var a = tie("a", "aral");
        tie.pipes("upper", function (obj) {
            obj.value = this.uppercase(obj.value);
            return obj;
        });
        tie.pipes("filter", function(obj, params) {
            var search = new RegExp(params.join('|'), 'gi');
            obj.value = obj.value.replace(search, '');
            return obj;
        });
        var b = a.$pipe()('upper')('filter', 'r', 'l')();
        a.value.should.eql("aral", "original");
        b.value.should.eql("AA", "pipe");
    });
    it('should chain pipes for tie by name', function () {
        var a = tie("a", "aral");
        tie.pipes("upper", function (obj) {
            obj.value = this.uppercase(obj.value);
            return obj;
        });
        tie.pipes("filter", function(obj, params) {
            var search = new RegExp(params.join('|'), 'gi');
            obj.value = obj.value.replace(search, '');
            return obj;
        });
        var b = tie._("a")('upper')('filter', 'r', 'l')();
        a.value.should.eql("aral", "original");
        b.value.should.eql("AA", "pipe");
    });
});