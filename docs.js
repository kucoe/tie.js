var fs = require('fs');
var spawn = require('child_process').spawn;
var jsdoc = "node_modules/jsdoc/nodejs/bin/jsdoc";
var path = 'docs';
var args = [jsdoc, 'src/modules', 'README.md', '-d', path];

if(fs.exists(path)) {
    fs.unlinkSync(path);
}

var proc = spawn(process.argv[0], args, {stdio: 'inherit'});
proc.on('close', function(code) {
    process.exit(code);
});
