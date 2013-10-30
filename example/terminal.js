var tie = require('../index')(['cli']);
var _ = tie._;
var cli = tie.cli;

tie('start', {value: function () {
    cli.password('Password:', function (str) {
        console.log(str);
    })
}, desc: 'starts program', $cli: 'start'});
tie('stop', {value: function () {
    cli.confirm('Sure?', function (ok) {
        if (ok) {
            console.log('done');
        }
    })
}, $cli: 'stop'});

cli.history(['start', 'stop']);
cli.interact('>');

cli.on('history', function(item) {
    console.log('New history item ' + item);
});

cli.on('close', function () {
    console.log(cli.history());
    process.exit();
});