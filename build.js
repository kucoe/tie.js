var fs = require("fs");
var ugly = require('uglify-js');
var sourcePath = "src/lib";
var dest = "src/tie.js";
var min = "src/tie.min.js";

var core = fs.readFileSync(sourcePath + '/core.js', 'utf8');
var dom = fs.readFileSync(sourcePath + '/dom.js', 'utf8');
var http = fs.readFileSync(sourcePath + '/http.js', 'utf8');
var all = [core, dom, http].join("\n\n");
fs.writeFileSync(dest, all, 'utf8');

var code = fs.readFileSync(dest, 'utf8');
code = ugly.minify(code, {fromString: true});
fs.writeFileSync(min, code.code, 'utf8');


