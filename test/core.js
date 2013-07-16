var tie = require('../src/next/core')(true);
var util = tie.util;
var model = tie.model;
var bind = tie.bind;
var ties = tie.ties;

var should = require('should');

describe('tie', function () {
    describe('model', function () {

        beforeEach(function () {
            for (var prop in ties) { if (ties.hasOwnProperty(prop)) { delete ties[prop]; } }
        });

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
                Object.getPrototypeOf(res).should.eql(util, "prototype");
            });
            it('should have bind registered', function () {
                var res = tie("a", {});
                res.should.eql(ties['a'].obj, "registered");
                ties['a'].should.be.an.instanceof(bind, "instanceof bind");
            });
            it('should not allow reserved', function () {
                var assert = (function () {
                    var res = tie("prop", {});
                }).should.throw;
            });
            it('should define app implicitly', function () {
                var res = tie("a", {});
                should.exist(ties['app'], "app");
            });
        });
        describe('dependencies', function () {
            it('should resolve dependencies', function () {
                var a = tie("a", {});
                var b = tie("b", {}, ['a']);
                a.should.eql(b.$a, "dependency");
                b.$ready().should.eql(true, "ready");
            });
            it('should resolve late dependencies', function () {
                var b = tie("b", {}, ['a']);
                var a = tie("a", {});
                a.should.eql(b.$a, "dependency");
                b.$ready().should.eql(true, "ready");
            });
            it('should stub dependencies', function () {
                var b = tie("b", {}, ['a']);
                util.isDefined(b.$a).should.eql(true, "dependency stub");
                b.$ready().should.eql(true, "ready");
            });
            it('should update dependency', function () {
                var a = tie("a", {});
                var b = tie("b", {}, ['a']);
                tie("a", "lol");
                b.$a.value.should.eql("lol", "dependency updated");
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
                util.isObject({a: 'a'}).should.eql(true, "object");
                util.isArray(['a', 'b']).should.eql(true, "array");
                util.isCollection(arguments).should.eql(true, "array-like");
            });
            it('should check false types', function () {
                util.isNumber('aaa').should.eql(false, "string");
                util.isString(12).should.eql(false, "number");
                util.isBoolean(new Date()).should.eql(false, "date");
                util.isDate(true).should.eql(false, "boolean");
                util.isObject(util.isFunction).should.eql(false, "function");
                util.isCollection({a: 'a'}).should.eql(false, "object");
                util.isFunction(['a', 'b']).should.eql(false, "array");
                util.isArray(arguments).should.eql(false, "array-like");
            });
        });
        describe('strings', function () {
            it('should do simple string conversions', function () {
                util.trim(' aaa ').should.eql('aaa', "trim");
                util.trim('      ').should.eql('', "trim empty");
                util.trim(12).should.eql(12, "trim wrong type");
                should.not.exist(util.trim(), "trim undefined");
                util.uppercase('aaa').should.eql('AAA', "uppercase");
                util.uppercase('AAA').should.eql('AAA', "uppercase ready");
                util.uppercase('      ').should.eql('      ', "uppercase empty");
                util.uppercase(12).should.eql(12, "uppercase wrong type");
                should.not.exist(util.uppercase(), "uppercase undefined");
                util.lowercase('AAA').should.eql('aaa', "lowercase");
                util.lowercase('aaa').should.eql('aaa', "lowercase ready");
                util.lowercase('      ').should.eql('      ', "lowercase empty");
                util.lowercase(12).should.eql(12, "lowercase wrong type");
                should.not.exist(util.lowercase(), "lowercase undefined");
            });
            it('should parse string', function () {
                util.toInt("12.3").should.eql(12, "int");
                util.toFloat("12.3").should.eql(12.3, "float");
            });
            it('should compare string ignoring case', function () {
                var a =  util.eqi("aaa", "aAa").should.be.ok;
                a =  util.eqi("aab", "aAa").should.be.not.ok;
                return a;
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
        describe('eq', function () {
            var assert;
            it('should be deep equal object', function () {
                var a = {a: 'a', b: {c: 12}, d: [1, 2, 3]};
                var b = {a: 'a', b: {c: 12}, d: [1, 2, 3]};
                assert = util.isEqual(a, b).should.be.ok;
            });
            it('should be not deep equal object', function () {
                var a = {a: 'a', b: {c: 12}, d: [1, 2, 3]};
                var b = {a: 'a', b: {d: 12}, d: [1, 2, 3]};
                assert = util.isEqual(a, b).should.be.not.ok;
            });
            it('should be equal primitive', function () {
                assert = util.isEqual("a", "a").should.be.ok;
                assert = util.isEqual(12, 12).should.be.ok;
                assert = util.isEqual(12, 12.0).should.be.ok;
                assert = util.isEqual(true, true).should.be.ok;
                assert = util.isEqual(new Date(0), new Date(0)).should.be.ok;
                assert = util.isEqual(/[1-2]+/gi, /[1-2]+/gi).should.be.ok;
            });
            it('should be not equal primitive', function () {
                assert = util.isEqual("a", "b").should.be.not.ok;
                assert = util.isEqual(12, 13).should.be.not.ok;
                assert = util.isEqual(12, 12.3).should.be.not.ok;
                assert = util.isEqual(true, false).should.be.not.ok;
                assert = util.isEqual(new Date(0), new Date()).should.be.not.ok;
                assert = util.isEqual(/[1-2]+/gi, /[1-3]+/gi).should.be.not.ok;
            });
            it('should be equal array', function () {
                assert = util.isEqual([1, 2, 3], [1, 2, 3]).should.be.ok;
                assert = util.isEqual([1, {a: 2}, 3], [1, {a: 2}, 3]).should.be.ok;
            });
            it('should be not equal array', function () {
                assert = util.isEqual([1, 2, 3], [1, 3, 2]).should.be.not.ok;
                assert = util.isEqual([1, {a: 2}, 3], [1, {a: 3}, 3]).should.be.not.ok;
            });
            it('should be equal function', function () {
                assert = util.isEqual(function(){return "a"}, function(){return "a"}).should.be.ok;
            });
            it('should be not equal function', function () {
                assert = util.isEqual(function(){return "a"}, function(){return "b"}).should.be.not.ok;
            });
            it('should be equal null', function () {
                assert = util.isEqual(null, null).should.be.ok;
            });
            it('should be not equal null', function () {
                assert = util.isEqual(null, "a").should.be.not.ok;
            });
            it('should be equal undefined', function () {
                assert = util.isEqual().should.be.ok;
            });
            it('should be not equal undefined', function () {
                assert = util.isEqual(null).should.be.not.ok;
            });
            it('should be not equal different types', function () {
                var a = ['1', '2', '3'];
                var b = {'1': '1', '2': '2', '3': '3'};
                assert = util.isEqual(a, b).should.be.not.ok;
                assert = util.isEqual(12, "12").should.be.not.ok;
            });
            return assert;
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

        //for each, for in, sequence, extend
    });
});
