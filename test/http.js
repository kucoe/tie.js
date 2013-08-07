var browser = require('./browser');
var should = require('should');

var XHRMockFactory = function (status, text, xml) {
    return function () {
        this.aborted = false;
        this.status = status;
        this.readyState = 4;
        this.responseText = text;
        this.responseXML = xml;
        this.headers = {};
        this.open = function (type, url) {
            this.type = type;
            this.url = url;
        };
        this.abort = function () {
            this.aborted = true;
        };
        this.setRequestHeader = function (name, header) {
            this.headers[name] = header;
        };
        this.send = function (params) {
            this.params = params;
            this.onreadystatechange();
        };
    }
};

describe('http', function () {
    it('should process $http', function (done) {
        browser(function (window) {
            var obj = window.tie('a', {$http: {url: 'data.json'}});
            (typeof obj.$http.get).should.eql('function', 'http get');
            done();
        }, ['dom', 'http']);
    });
    it('should default cache', function (done) {
        browser(function (window) {
            var obj = window.tie('a', {$http: {url: 'data.json'}});
            obj.$http.cache.should.eql(true, 'http cache');
            done();
        }, ['dom', 'http']);
    });
    it('should combine url', function (done) {
        var xhr = new XHRMockFactory(200, "{}", "");
        browser(function (window) {
            window.XMLHttpRequest = xhr;
            window.tie('app', {$http: {url: 'data/'}});
            var obj = window.tie('a', {$http: {url: 'data.json'}});
            var req = obj.$http.get({}, {});
            req.xhr.url.should.eql('data/data.json', 'http url');
            done();
        }, ['dom', 'http']);
    });
});
