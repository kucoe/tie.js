var fs = require("fs");
var ugly = require('uglify-js');

var sourcePath = "lib";
var tie = sourcePath + "/tie.js";

var dest = "tie.js";
var min = "tie.min.js";

var corePath = sourcePath + "/core";

var core = fs.readFileSync(corePath + '/tie.js', 'utf8');

var modules = ['util', 'pipe', 'parser', 'handle', 'model', 'observer', 'bind'];

modules.forEach(function(item){
    var content = fs.readFileSync(corePath + '/' + item + '.js', 'utf8');
    var s = '/**  ' + item.toUpperCase() + ' **/';
    core = core.replace(s, s + '\n\n    ' + content.replace(/\n/g, '\n    '));
});
console.log('Build tie core');

fs.writeFileSync(tie, core, 'utf-8');

var viewPath = "lib/view";

var view = fs.readFileSync(viewPath + '/view.js', 'utf8');

modules = ['dom', 'el', 'renderer', 'viewHandle', 'shown', 'parent', 'children', 'repeat'];

modules.forEach(function(item){
    var content = fs.readFileSync(viewPath + '/' + item + '.js', 'utf8');
    var s = '/**  ' + item.toUpperCase() + ' **/';
    view = view.replace(s, s + '\n\n    ' + content.replace(/\n/g, '\n    '));
});
console.log('Build tie view extension');

fs.writeFileSync(sourcePath + '/view.js', view, 'utf-8');

view = fs.readFileSync(sourcePath + '/view.js', 'utf8');
var http = fs.readFileSync(sourcePath + '/http.js', 'utf8');
var route = fs.readFileSync(sourcePath + '/route.js', 'utf8');
var all = [core, view, http, route].join("\n\n");
fs.writeFileSync(dest, all, 'utf8');

var html = fs.readFileSync(sourcePath + '/html.js', 'utf8');
fs.writeFileSync('tie.html.js', html, 'utf8');

console.log('Build browser version');

code = ugly.minify(all, {fromString: true});
fs.writeFileSync(min, code.code, 'utf8');

code = ugly.minify(html, {fromString: true});
fs.writeFileSync('tie.html.min.js', code.code, 'utf8');

console.log('Build minified version');



