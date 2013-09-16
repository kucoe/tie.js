var spawn = require('child_process').spawn;
var mocha = 'node_modules/mocha/bin/mocha';
var args = [mocha];

var proc = spawn(process.argv[0], args, {stdio: 'inherit'});
proc.on('close', function(code) {
    process.exit(code);
});
