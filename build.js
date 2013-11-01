var fs = require("fs");
var ugly = require('uglify-js');
var sourcePath = "lib";
var corePath = "lib/core";
var tie = sourcePath + "/tie.js";
var dest = "tie.js";
var min = "tie.min.js";

var core = fs.readFileSync(corePath + '/core.js', 'utf8');

var modules = ['util', 'proxy', 'pipe', 'parser', 'handle', 'model', 'watcher', 'bind', 'tie'];

modules.forEach(function(item){
    var content = fs.readFileSync(corePath + '/' + item + '.js', 'utf8');
    var s = '/**  ' + item.toUpperCase() + ' **/';
    core = core.replace(s, s + '\n\n    ' + content.replace(/\n/g, '\n    '));
});

fs.writeFileSync(tie, core, 'utf-8');

var dom = fs.readFileSync(sourcePath + '/dom.js', 'utf8');
var http = fs.readFileSync(sourcePath + '/http.js', 'utf8');
var all = [core, dom, http].join("\n\n");
fs.writeFileSync(dest, all, 'utf8');

var code = fs.readFileSync(dest, 'utf8');
code = ugly.minify(code, {fromString: true});
fs.writeFileSync(min, code.code, 'utf8');


