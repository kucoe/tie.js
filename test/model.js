var tie = require('../src/next/core')(true);
var util = tie.util;
var model = tie.model;
var bind = tie.bind;
var ties = tie.ties;

var should = require('should');

afterEach(function () {
    var prop;
    for (prop in ties) {
        if (ties.hasOwnProperty(prop)) {
            delete ties[prop];
        }
    }
});

describe('model', function () {
    describe('wrap', function () {
        it('should wrap primitive', function () {
            var res = tie("a", 12);
            res.value.should.eql(12, "number");
            res = tie("a", 'a');
            res.value.should.eql('a', "string");
            var date = new Date();
            res = tie("a", date);
            res.value.should.eql(date, "date");
            var nop = function () {
            };
            res = tie("a", nop);
            res.value.should.eql(nop, "function");
        });
        it('should wrap array', function () {
            var res = tie("a", ['a', 'b']);
            res.$values.should.eql(['a', 'b'], "array");
        });
    });
    describe('bind', function () {
        it('should be instance of model', function () {
            var res = tie("a", {});
            res.should.be.an.instanceof(model, "instanceof");
        });
        it('should have utils in prototype', function () {
            var res = tie("a", {});
            Object.getPrototypeOf(Object.getPrototypeOf(res)).should.eql(util, "prototype");
        });
        it('should have bind registered', function () {
            var res = tie("a", {});
            res.should.eql(ties['a'].obj, "registered");
            ties['a'].should.be.an.instanceof(bind, "instanceof bind");
        });
        it('should define app implicitly', function () {
            tie("a", {});
            should.exist(ties['app'], "app");
        });
        it('should not override sealed', function () {
            tie("a", {}, [], true);
            var a = function () {
                tie("a", {});
            }.should.throw();
        });
        it('should access deep props', function () {
            var res = tie("a", {a:121, b:{c:2}, e:[{j:"blah"}]});
            res.$prop('a').should.eql(121, 'top');
            res.$prop('b.c').should.eql(2, 'second');
            res.$prop('e.0').should.eql({j:"blah"}, 'array');
            res.$prop('e.0.j').should.eql("blah", 'deep');
            res.$prop('e.0.j.length').should.eql(4, 'even more');
        });
        it('should set deep props', function () {
            var res = tie("a", {a:121, b:{c:2}, e:[{j:"blah"}]});
            res.$prop('a', 133);
            res.$prop('a').should.eql(133, 'top');
            res.$prop('b.c', 4);
            res.$prop('b.c').should.eql(4, 'second');
            res.$prop('e.1', {y:'b'});
            res.$prop('e.1').should.eql({y:"b"}, 'array');
            res.$prop('e.length').should.eql(2, 'array');
            res.$prop('e.0.j', 'ddd');
            res.$prop('e.0.j').should.eql("ddd", 'deep');
        });
    });
    describe('dependencies', function () {
        it('should have app dependency', function () {
            var app = tie("app", {name:"a"});
            var a = tie("a", {});
            app.should.eql(a.$$app, "app");
            a.$$app.name.should.eql("a", "app");
            a.$ready().should.eql(true, "ready");
        });
        it('should resolve dependencies', function () {
            var a = tie("a", {});
            var b = tie("b", {}, ['a']);
            a.should.eql(b.$$a, "dependency");
            b.$ready().should.eql(true, "ready");
        });
        it('should resolve late dependencies', function () {
            var b = tie("b", {}, ['a']);
            var a = tie("a", {});
            a.should.eql(b.$$a, "dependency");
            b.$ready().should.eql(true, "ready");
        });
        it('should stub dependencies', function () {
            var b = tie("b", {}, ['a']);
            util.isDefined(b.$$a).should.eql(true, "dependency stub");
            b.$ready().should.eql(false, "ready");
        });
        it('should update dependency', function () {
            var a = tie("a", {});
            var b = tie("b", {}, ['a']);
            tie("a", "lol");
            b.$$a.value.should.eql("lol", "dependency updated");
            b.$ready().should.eql(true, "ready");
        });
        it('should not allow interfere dependency', function () {
            var a = tie("a", {});
            var deps = ['a'];
            var b = tie("b", {}, deps);
            a.$deps.push("c");
            a.$ready().should.eql(true, "ready");
            deps.push("c");
            b.$ready().should.eql(true, "ready");
        });
        it('should not fail cyclic dependencies', function () {
            var a = tie("a", 'a', ['c']);
            var b = tie("b", 'b', ['a']);
            var c = tie("c", 'c', ['b']);
            a.value = 'aa';
            c.$$b.$$a.value.should.eql('aa', "value");
        });
    });
});