var jsdom = require('jsdom');

jsdom.env(
    {
        html: "<!doctype html><body>Hello World!</body></html>",
        scripts: ['../src/lib/core.js'],
        src: "",
        done: function (err, window) {
            if (err) throw  err;
            window.exports = {};
            global.window = window;
        }
    }
);

module.exports = function (callback, handles) {
    var h = handles || [];
    h.forEach(function (elem) {
        require('../src/lib/' + elem + '.js');
    });
    var timeout = !global.window ? 500 : 0;
    setTimeout(function () {
        call(global.window, callback);
    }, timeout);
};

var call = function (window, callback) {
    window.document.body.innerHTML = 'Hello World!';
    callback(window);
};
