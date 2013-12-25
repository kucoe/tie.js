global.test = true;
var tie = require('../lib/tie');
var cli = require('../lib/cli')(tie);

describe('cli', function () {
    afterEach(function () {
        cli.clean();
    });
    it('should tie command through obj', function (done) {
        cli.command('*', function (input) {
            throw new Error(input);
        });
        tie('a', {
            $cli: {
                cmd: '#{number}{cmd}',
                desc: 'task command by number',
                args: {number: '\\d{1,3}', cmd: 'x|\\+|-'},
                fn: function (input, args) {
                    args.number.should.eql(12, 'number');
                    args.cmd.should.eql('x', 'command');
                    done();
                }
            }});
        cli.parse('#12x');
    });
    it('should tie command through short hand', function (done) {
        cli.command('*', function (input) {
            throw new Error(input);
        });
        tie('a', {number: '\\d{1,3}', cmd: 'x|\\+|-', value: function (input, args) {
            args.number.should.eql(12, 'number');
            args.cmd.should.eql('x', 'command');
            done();
        }, $cli: '#{number}{cmd}'});
        cli.parse('#12x');
    });
});
