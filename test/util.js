var util = require('../src/modules/util');

describe('tie', function () {
    describe('util', function () {
        describe('clone', function () {
            it('should copy prototype', function () {
                var a = {a:'a'};
                var b = Object.create(a, {b: {value : 'b'}});
                var c = util.clone(b);
                Object.getPrototypeOf(c).should.eql(a, "prototype");
            });
        });
        describe('convert', function () {
            it('should parse array', function () {
                util.convert("['a', 'b', 'c']").should.eql(['a', 'b', 'c'], "array");
            });

            it('should parse object', function () {
                util.convert('{"a":"a", "b":"b", "c":"c"}').should.eql({a:"a", b:"b", c:"c"}, "object");
            });

            it('should parse references', function () {
                var context = {b : 'b'};
                util.convert("['a', '#b', 'c']", context).should.eql(['a', context.b, 'c'], "object");
            });
        });
    })
});

