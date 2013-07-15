var core = require('../src/next/core');
var util = core.util;
var model = core.model;
var bind = core.bind;
var ties = core.ties;

describe('tie', function () {
    describe('model', function () {

        beforeEach(function(){
           ties.splice(0, ties.length);
        });

        describe('wrap', function () {
            it('should wrap primitive', function () {
                var res = core.tie("a", 12);
                res.value.should.eql(12, "number");
                res = core.tie("a", 'a');
                res.value.should.eql('a', "string");
                var date = new Date();
                res = core.tie("a", date);
                res.value.should.eql(date, "date");
                var nop = function(){};
                res = core.tie("a", nop);
                res.value.should.eql(nop, "function");
            });
            it('should wrap array', function () {
                var res = core.tie("a", ['a', 'b']);
                res.$values.should.eql(['a', 'b'], "array");
            });
            it('should be instance of model', function () {
                var res = core.tie("a", {});
                res.should.be.instanceof(model, "instanceof");
            });
            it('should have utils in prototype', function () {
                var res = core.tie("a", {});
                Object.getPrototypeOf(res).should.eql(util, "prototype");
            });
            it('should have bind registered', function () {
                var res = core.tie("a", {});
                res.should.eql(ties['a'].obj, "registered");
                ties['a'].should.be.instanceof(bind, "instanceof bind");
            });
        });
        describe('dependencies', function () {
            it('should resolve dependencies', function () {
                var a = core.tie("a", {});
                var b = core.tie("b", {}, ['a']);
                a.should.eql(b.$a, "dependency");
                b.$ready().should.eql(true, "ready");
            });
            it('should resolve late dependencies', function () {
                var b = core.tie("b", {}, ['a']);
                var a = core.tie("a", {});
                a.should.eql(b.$a, "dependency");
                b.$ready().should.eql(true, "ready");
            });
            it('should stub dependencies', function () {
                var b = core.tie("b", {}, ['a']);
                util.isDefined(b.$a).should.eql(true, "dependency stub");
                b.$ready().should.eql(true, "ready");
            });
        });
    });
    describe('util', function () {
        describe('uid', function () {
            it('should generate uid', function () {
                var a = util.uid();
                var b = util.uid();
                b.should.not.eql(a);
            });
        });
        describe('defined', function () {
            it('should check defined', function () {
                util.isDefined(util).should.eql(true, "defined");
                var i;
                util.isUndefined(i).should.eql(true, "undefined");
            });
        });
        describe('types', function () {
            it('should check types', function () {
                util.isString('aaa').should.eql(true, "string");
                util.isNumber(12).should.eql(true, "number");
                util.isDate(new Date()).should.eql(true, "date");
                util.isBoolean(true).should.eql(true, "boolean");
                util.isFunction(util.isFunction).should.eql(true, "function");
                util.isObject({a:'a'}).should.eql(true, "object");
                util.isArray(['a','b']).should.eql(true, "array");
                util.isCollection(arguments).should.eql(true, "array-like");
            });
        });
        describe('strings', function () {
            it('should do simple string conversions', function () {
                util.trim(' aaa ').should.eql('aaa', "trim");
                util.trim('      ').should.eql('', "trim empty");
                util.trim(12).should.eql(12, "trim wrong type");
                util.isUndefined(util.trim()).should.eql(true, "trim undefined");
                util.uppercase('aaa').should.eql('AAA', "uppercase");
                util.uppercase('AAA').should.eql('AAA', "uppercase ready");
                util.uppercase('      ').should.eql('      ', "uppercase empty");
                util.uppercase(12).should.eql(12, "uppercase wrong type");
                util.isUndefined(util.uppercase()).should.eql(true, "uppercase undefined");
                util.lowercase('AAA').should.eql('aaa', "lowercase");
                util.lowercase('aaa').should.eql('aaa', "lowercase ready");
                util.lowercase('      ').should.eql('      ', "lowercase empty");
                util.lowercase(12).should.eql(12, "lowercase wrong type");
                util.isUndefined(util.lowercase()).should.eql(true, "lowercase undefined");
            });
        });
        describe('clone', function () {
            it('should copy prototype', function () {
                var a = {a: 'a'};
                var b = Object.create(a, {b: {value: 'b'}});
                var c = util.clone(b);
                Object.getPrototypeOf(c).should.eql(a, "prototype");
            });
        });
        describe('convert', function () {
            it('should parse array', function () {
                util.convert("['a', 'b', 'c']").should.eql(['a', 'b', 'c'], "array");
            });

            it('should parse object', function () {
                util.convert('{"a":"a", "b":"b", "c":"c"}').should.eql({a: "a", b: "b", c: "c"}, "object");
            });

            it('should parse references', function () {
                var context = {b: 'b'};
                util.convert("['a', '#b', 'c']", context).should.eql(['a', context.b, 'c'], "object");
            });
        });
    });
});
