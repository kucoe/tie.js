var should = require('should');

var tie = require('../src/lib/core')();
var request = require('../src/lib/request')(tie, true);

describe('request', function () {
    it('should process $request', function () {
        var obj = tie('a', {$request: {url: 'http://api.randomuser.me/?results=1'}});
        (typeof obj.$request.get).should.eql('function', 'request get');
    });
    it('should default not cache', function () {
        var obj = tie('a', {$request: {url: 'http://api.randomuser.me/?results=1'}});
        obj.$request.cache.should.eql(false, 'request not cache');
    });
    it('should combine url', function () {
        tie('app', {$request: {url: 'data/'}});
        var obj = tie('a', {$request: {url: 'data.json'}});
        var req = obj.$request.get({}, {});
        req.request.url.should.eql('data/data.json', 'request url');
    });
    it('should combine url with url template', function () {
        tie('app', {$request: {url: 'data/{url}?lang=de'}});
        var obj = tie('a', {$request: {url: 'data.json'}});
        var req = obj.$request.get({}, {});
        req.request.url.should.eql('data/data.json?lang=de', 'request url');
    });
    it('should combine url with url template and empty url', function () {
        tie('app', {$request: {url: 'data/{url}?lang=de'}});
        var obj = tie('a', {});
        var req = obj.$request.get({}, {});
        req.request.url.should.eql('data/?lang=de', 'request url');
    });
    it('should combine params in url', function () {
        tie('app', {$request: {params: {a: 1}}});
        var obj = tie('a', {$request: {url: 'data.json', params: {b: 2}}});
        var req = obj.$request.get({c: 3}, {});
        req.request.url.should.eql('data.json?a=1&b=2&c=3', 'request params');
    });
    it('should combine params', function () {
        tie('app', {$request: {params: {a: 1}}});
        var obj = tie('a', {$request: {url: 'data.json', params: {b: 2}}});
        var req = obj.$request.post({c: 3}, {});
        req.request.params.should.eql('a=1&b=2&c=3', 'request params');
    });
    it('should combine headers', function () {
        tie('app', {$request: {headers: {'X-Requested-With': 'XMLHttpRequest'}}});
        var obj = tie('a', {$request: {url: 'data.json', headers: {'Content-Length': 348}}});
        var req = obj.$request.get({}, {});
        req.request.headers.should.eql({'X-Requested-With': 'XMLHttpRequest',
            'Content-Length': 348,
            'Accept': 'application/json'}, 'request headers');
    });
    it('should memo result', function (done) {
        var obj = tie('a', {$request: {url: 'http://www.geoplugin.net/json.gp', cache: true}});
        obj.$request.get({}, {});
        setTimeout(function () {
            obj.$request.memo('http://www.geoplugin.net/json.gp', 'json').geoplugin_currencyConverter.
                should.eql(0, 'request memo');
            done();
        }, 1000);
    });
    it('should use memo', function (done) {
        var obj = tie('a', {$request: {url: 'http://api.randomuser.me/', cache: true}});
        var test = {};
        obj.$request.get({}, test);
        setTimeout(function () {
            var a = {};
            obj.$request.get({}, a);
            setTimeout(function () {
                a.results[0].user.password.should.eql(test.results[0].user.password, 'request use memo');
                done();
            }, 500);
        }, 1000);
    });
    it('should refetch when needed', function (done) {
        var obj = tie('a', {$request: {url: 'http://api.randomuser.me/', cache: true}});
        var test = {};
        obj.$request.get({}, test);
        setTimeout(function () {
            var a = {};
            obj.$request.get({}, a, true);
            setTimeout(function () {
                a.results[0].user.password.should.not.eql(test.results[0].user.password, 'request refetch');
                done();
            }, 500);
        }, 1000);
    });
    it('should map correct method', function () {
        var obj = tie('a', {$request: {url: 'data.json'}});
        var req = obj.$request.get({}, {});
        req.request.method.should.eql('GET', 'request get');
        req = obj.$request.post({}, {});
        req.request.method.should.eql('POST', 'request post');
        req = obj.$request.put({}, {});
        req.request.method.should.eql('PUT', 'request put');
        req = obj.$request.delete({}, {});
        req.request.method.should.eql('DELETE', 'request delete');
    });
});

