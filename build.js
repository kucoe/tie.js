var fs = require("fs");
var sourcePath = "src/modules";
var dest = "src/tie.js";
var wrap = fs.readFileSync(sourcePath + '/wrap.js', 'utf8');
var proxy = fs.readFileSync(sourcePath + '/proxy.js', 'utf8');
var route = fs.readFileSync(sourcePath + '/route.js', 'utf8');
var $ = fs.readFileSync(sourcePath + '/$.js', 'utf8');
var _ = fs.readFileSync(sourcePath + '/_.js', 'utf8');
var bind = fs.readFileSync(sourcePath + '/bind.js', 'utf8');
var tie = fs.readFileSync(sourcePath + '/tie.js', 'utf8');
var all = [proxy, route, $, _, bind, tie].join("\n\n");
var idx = wrap.indexOf("//INSERT");
fs.writeFileSync(dest, wrap.substring(0, idx), 'utf8');
fs.appendFileSync(dest, all, 'utf8');
fs.appendFileSync(dest, wrap.substring(idx + 9), 'utf8');