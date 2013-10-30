var fs = require("fs");
var ugly = require('uglify-js');
var sourcePath = "lib";
var tie = sourcePath + "/tie.js";
var dest = "tie.js";
var min = "tie.min.js";

var core = fs.readFileSync(sourcePath + '/core.js', 'utf8');
var util = fs.readFileSync(sourcePath + '/util.js', 'utf8');
core = core.replace('//###UTIL###', util.replace(/\n/g, '\n    '));
fs.writeFileSync(tie, core, 'utf-8');

var dom = fs.readFileSync(sourcePath + '/dom.js', 'utf8');
var http = fs.readFileSync(sourcePath + '/http.js', 'utf8');
var all = [core, dom, http].join("\n\n");
fs.writeFileSync(dest, all, 'utf8');

var code = fs.readFileSync(dest, 'utf8');
code = ugly.minify(code, {fromString: true});
fs.writeFileSync(min, code.code, 'utf8');


