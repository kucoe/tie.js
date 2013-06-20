var fs = require("fs");
var ugly = require('uglify-js')
var sourcePath = "src/modules";
var dest = "src/tie.js";
var min = "src/tie.min.js";

var removeLastLine = function (data) {
    var lines = data.split('\n');
    lines.splice(lines.length - 1, 1);
    return lines.join('\n');
};


var wrap = fs.readFileSync(sourcePath + '/wrap.js', 'utf8');
var proxy = fs.readFileSync(sourcePath + '/proxy.js', 'utf8');
var route = fs.readFileSync(sourcePath + '/route.js', 'utf8');
var pipe = fs.readFileSync(sourcePath + '/pipe.js', 'utf8');
var http = fs.readFileSync(sourcePath + '/http.js', 'utf8');
var $ = fs.readFileSync(sourcePath + '/$.js', 'utf8');
var _ = fs.readFileSync(sourcePath + '/util.js', 'utf8');
_ = removeLastLine(_);
var bind = fs.readFileSync(sourcePath + '/bind.js', 'utf8');
var tie = fs.readFileSync(sourcePath + '/tie.js', 'utf8');
var all = [proxy, route, pipe, http, $, _, bind, tie].join("\n\n").replace(/\n/g, "\n    ");
var idx = wrap.indexOf("//INSERT");
fs.writeFileSync(dest, wrap.substring(0, idx), 'utf8');
fs.appendFileSync(dest, '    ', 'utf8');
fs.appendFileSync(dest, all, 'utf8');
fs.appendFileSync(dest, '\n', 'utf8');
fs.appendFileSync(dest, wrap.substring(idx + 9), 'utf8');


var code = fs.readFileSync(dest, 'utf8');
code = ugly.minify(code, {fromString: true});
fs.writeFileSync(min, code.code);


