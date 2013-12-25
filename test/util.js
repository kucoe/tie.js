global.test = true;
var tie = require('../lib/tie');
var util = tie._;

var should = require('should');
var assert;

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
            var a = util.eqi("aaa", "aAa").should.be.ok;
            a = util.eqi("aab", "aAa").should.be.not.ok;
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
            assert = util.isEqual(function () {
                return "a"
            },function () {
                return "a"
            }).should.be.ok;
        });
        it('should be not equal function', function () {
            assert = util.isEqual(function () {
                return "a"
            },function () {
                return "b"
            }).should.be.not.ok;
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
            util.convert("['a', '#{b}', 'c']", context).should.eql(['a', context.b, 'c'], "object");
        });
        it('should parse empty string', function () {
            util.convert('').should.eql('', "empty");
        });
    });
    describe('forEach', function () {
        it('should work safely', function () {
            var arr = ['a', 'b', 'c'];
            util.forEach(arr, function (item, i, coll) {
                arr.splice(arr.indexOf(item), 1);
                coll.length.should.eql(3, "iterate");
            }, this, true);
            arr.should.eql([], "array");
        });
    });
    describe('extend', function () {
        it('should combine arrays', function () {
            var arr = ['a', 'b', 'c'];
            var arr2 = ['d', 'e', 'f'];
            util.extend(arr, arr2);
            arr.should.eql(['a', 'b', 'c', 'd', 'e', 'f' ], "combined");
        });
    });
    //for each, for in, sequence, extend
});