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
        this.timeout(10000);
        setTimeout(function () {
            browser(function (window) {
                var obj = window.tie('a', {$http: {url: 'data.json'}});
                (typeof obj.$http.get).should.eql('function', 'http get');
                done();
            }, ['view', 'http']);
        }, 3000);
    });
    it('should default cache', function (done) {
        browser(function (window) {
            var obj = window.tie('a', {$http: {url: 'data.json'}});
            obj.$http.cache.should.eql(true, 'http cache');
            done();
        }, ['view', 'http']);
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
        }, ['view', 'http']);
    });
    it('should combine url with url template', function (done) {
        var xhr = new XHRMockFactory(200, "{}", "");
        browser(function (window) {
            window.XMLHttpRequest = xhr;
            window.tie('app', {$http: {url: 'data/{url}?lang=de'}});
            var obj = window.tie('a', {$http: {url: 'data.json'}});
            var req = obj.$http.get({}, {});
            req.xhr.url.should.eql('data/data.json?lang=de', 'http url');
            done();
        }, ['view', 'http']);
    });
    it('should combine url with url template and empty url', function (done) {
        var xhr = new XHRMockFactory(200, "{}", "");
        browser(function (window) {
            window.XMLHttpRequest = xhr;
            window.tie('app', {$http: {url: 'data/{url}?lang=de'}});
            var obj = window.tie('a', {});
            var req = obj.$http.get({}, {});
            req.xhr.url.should.eql('data/?lang=de', 'http url');
            done();
        }, ['view', 'http']);
    });
    it('should combine params in url', function (done) {
        var xhr = new XHRMockFactory(200, "{}", "");
        browser(function (window) {
            window.XMLHttpRequest = xhr;
            window.tie('app', {$http: {params: {a: 1}}});
            var obj = window.tie('a', {$http: {url: 'data.json', params: {b: 2}}});
            var req = obj.$http.get({c: 3}, {});
            req.xhr.url.should.eql('data.json?a=1&b=2&c=3', 'http params');
            done();
        }, ['view', 'http']);
    });
    it('should process params in url', function (done) {
        var xhr = new XHRMockFactory(200, "{}", "");
        browser(function (window) {
            window.XMLHttpRequest = xhr;
            var obj = window.tie('a', {$http: 'data.json/:action'});
            var req = obj.$http.get({action: 'invoke'}, {});
            req.xhr.url.should.eql('data.json/invoke', 'http params');
            done();
        }, ['view', 'http']);
    });
    it('should combine params', function (done) {
        var xhr = new XHRMockFactory(200, "{}", "");
        browser(function (window) {
            window.XMLHttpRequest = xhr;
            window.tie('app', {$http: {params: {a: 1}}});
            var obj = window.tie('a', {$http: {url: 'data.json', params: {b: 2}}});
            var req = obj.$http.post({c: 3}, {});
            req.xhr.params.should.eql('a=1&b=2&c=3', 'http params');
            done();
        }, ['view', 'http']);
    });
    it('should combine headers', function (done) {
        var xhr = new XHRMockFactory(200, "{}", "");
        browser(function (window) {
            window.XMLHttpRequest = xhr;
            window.tie('app', {$http: {headers: {'X-Requested-With': 'XMLHttpRequest'}}});
            var obj = window.tie('a', {$http: {url: 'data.json', headers: {'Content-Length': 348}}});
            var req = obj.$http.get({}, {});
            req.xhr.headers.should.eql({'X-Requested-With': 'XMLHttpRequest',
                'Content-Length': 348,
                'Accept': 'application/json'}, 'http headers');
            done();
        }, ['view', 'http']);
    });
    it('should memo result', function (done) {
        var xhr = new XHRMockFactory(200, '{"a":12}', "");
        browser(function (window) {
            window.XMLHttpRequest = xhr;
            var obj = window.tie('a', {$http: {url: 'data.json'}});
            obj.$http.get({}, {});
            obj.$http.memo('data.json', 'json').should.eql({a: 12}, 'http memo');
            done();
        }, ['view', 'http']);
    });
    it('should use memo', function (done) {
        var xhr = new XHRMockFactory(200, '{"a":12}', "");
        browser(function (window) {
            window.XMLHttpRequest = xhr;
            var obj = window.tie('a', {$http: {url: 'data.json'}});
            obj.$http.get({}, {});
            window.XMLHttpRequest = new XHRMockFactory(200, '{"a":13}', "");
            var a = {};
            obj.$http.get({}, a);
            a.should.eql({a: 12}, 'http use memo');
            done();
        }, ['view', 'http']);
    });
    it('should refetch when needed', function (done) {
        var xhr = new XHRMockFactory(200, '{"a":12}', "");
        browser(function (window) {
            window.XMLHttpRequest = xhr;
            var obj = window.tie('a', {$http: {url: 'data.json'}});
            obj.$http.get({}, {});
            window.XMLHttpRequest = new XHRMockFactory(200, '{"a":13}', "");
            var a = {};
            obj.$http.get({}, a, true);
            a.should.eql({a: 13}, 'http refetch');
            done();
        }, ['view', 'http']);
    });
    it('should map correct type', function (done) {
        var xhr = new XHRMockFactory(200, '{"a":12}', "");
        browser(function (window) {
            window.XMLHttpRequest = xhr;
            var obj = window.tie('a', {$http: {url: 'data.json'}});
            var req = obj.$http.get({}, {});
            req.xhr.type.should.eql('GET', 'http get');
            req = obj.$http.post({}, {});
            req.xhr.type.should.eql('POST', 'http post');
            req = obj.$http.put({}, {});
            req.xhr.type.should.eql('PUT', 'http put');
            req = obj.$http.delete({}, {});
            req.xhr.type.should.eql('DELETE', 'http delete');
            done();
        }, ['view', 'http']);
    });

    //JSONP tests
});
