var render = require('./render');
var should = require('should');



var html = "<!doctype html><body>Hello World!</body></html>";

describe('dom', function () {
    describe('definition', function () {
        it('jsdom should work', function (done) {
            render(html , "" , function(errors,window) {
                window.document.body.innerHTML.should.eql("Hello World!", "html");
                done();
            });
        });
        it('ajax should work', function (done) {
            render(html , "" , function(errors,window) {
                should.exist(window.XMLHttpRequest);
                done();
            });
        });
        it('should have tie top level object', function (done) {
            render(html , "" , function(errors,window) {
                should.exist(window.tie);
                (typeof window.tie).should.eql("function", "tie is function");
                done();
            });
        });
        it('should have pipe function', function (done) {
            render(html , "" , function(errors,window) {
                should.exist(window.tie.pipe);
                (typeof window.tie.pipe).should.eql("function", "tie pipe is function");
                done();
            });
        });
        it('should have handle function', function (done) {
            render(html , "" , function(errors,window) {
                should.exist(window.tie.handle);
                (typeof window.tie.handle).should.eql("function", "tie handle is function");
                done();
            });
        });
        it('should have enableDebug function', function (done) {
            render(html , "" , function(errors,window) {
                should.exist(window.tie.enableDebug);
                (typeof window.tie.enableDebug).should.eql("function", "tie enableDebug is function");
                done();
            });
        });
    });
});

