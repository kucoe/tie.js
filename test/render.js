var jsdom = require('jsdom');

// html is the fully formed html document to render
module.exports = function render(html, javascript, callback){
    jsdom.env(
        {
            html: html,
            scripts: ['../src/next/core.js'],
            src: javascript,
            done: function(errors, window){
                callback(errors, window);
            }
        }
    )
};
