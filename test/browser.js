var jsdom = require('jsdom');
var tie = require('../lib/tie')(true);
var _ = tie.util;

jsdom.env(
    {
        html: "<!doctype html><html><body>Hello World!</body></html>",
        scripts: ['https://raw.github.com/jquery/sizzle/master/dist/sizzle.min.js'],
        src: "",
        done: function (err, window) {
            if (err) throw  err;
            global.window = window;
            window.exports = {};
            window.document.querySelectorAll = function (selector) {
                return window.Sizzle(selector);
            };
            window.tie = require('../lib/tie')(true);
            //window.tie.enableDebug(true);
            console.log('Window ready');
        }
    }
);

function sendKey(element, key) {
    var x = key.charCodeAt(0);
    element.focus();
    var prev = element.value || '';
    element.value = prev + key;
    fireEvent(element, 'keydown', {keyCode: x, which: x, charCode: x});
}

function fireEvent(element, event, opts) {
    var evt;
    var document = global.window.document;
    if (document.createEventObject) {
        // dispatch for IE
        evt = document.createEventObject();
        if (opts) {
            evt = _.extend(evt, opts);
        }
        return element.fireEvent('on' + event, evt)
    } else {
        // dispatch for firefox + others
        evt = document.createEvent("HTMLEvents");
        evt.initEvent(event, true, true); // event type,bubbling,cancelable
        if (opts) {
            evt = _.extend(evt, opts);
        }
        return !element.dispatchEvent(evt);
    }
}

module.exports = function (callback, handles) {
    var h = handles || [];
    _.forEach(h, function (elem) {
        require('../lib/' + elem + '.js');
        if('dom' === elem) {
            global.window.exports().clean();
        }
    });
    call(global.window, callback);
};

module.exports.fireEvent = fireEvent;
module.exports.sendKey = sendKey;

var call = function (window, callback) {
    window.document.body.innerHTML = 'Hello World!';
    callback(window);
};
