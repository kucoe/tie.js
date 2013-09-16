var should = require('should');

var tie = require('../src/lib/core')();
var request = require('../src/lib/request')(tie);

describe.only('request', function () {
    it('should process $request', function () {
        var obj = tie('a', {$request: {url: 'http://api.randomuser.me/?results=1'}});
        (typeof obj.$request.get).should.eql('function', 'request get');
    });
    it('should default cache', function () {
        var obj = tie('a', {$request: {url: 'http://api.randomuser.me/?results=1'}});
        obj.$request.cache.should.eql(true, 'request cache');
    });
    it('should combine url', function () {
        tie('app', {$request: {url: 'http://api.randomuser.me/'}});
        var obj = tie('a', {$request: {url: '?results=1'}});
        var req = obj.$request.get({}, {});
        console.log(req.request);
        req.request.url.should.eql('http://api.randomuser.me/?results=1', 'request url');
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
        req.xhr.url.should.eql('data/?lang=de', 'request url');
    });
    it('should combine params in url', function () {
        tie('app', {$request: {params: {a: 1}}});
        var obj = tie('a', {$request: {url: 'data.json', params: {b: 2}}});
        var req = obj.$request.get({c: 3}, {});
        req.xhr.url.should.eql('data.json?a=1&b=2&c=3', 'request params');
    });
    it('should combine params', function () {
        tie('app', {$request: {params: {a: 1}}});
        var obj = tie('a', {$request: {url: 'data.json', params: {b: 2}}});
        var req = obj.$request.post({c: 3}, {});
        req.xhr.params.should.eql('a=1&b=2&c=3', 'request params');
    });
    it('should combine headers', function () {
        tie('app', {$request: {headers: {'X-Requested-With': 'XMLHttpRequest'}}});
        var obj = tie('a', {$request: {url: 'data.json', headers: {'Content-Length': 348}}});
        var req = obj.$request.get({}, {});
        req.xhr.headers.should.eql({'X-Requested-With': 'XMLHttpRequest',
            'Content-Length': 348,
            'Accept': 'application/json'}, 'request headers');
    });
    it('should memo result', function () {
        var obj = tie('a', {$request: {url: 'data.json'}});
        obj.$request.get({}, {});
        obj.$request.memo('data.json', 'json').should.eql({a: 12}, 'request memo');
    });
    it('should use memo', function () {
        var obj = tie('a', {$request: {url: 'data.json'}});
        obj.$request.get({}, {});
        var a = {};
        obj.$request.get({}, a);
        a.should.eql({a: 12}, 'request use memo');
    });
    it('should refetch when needed', function () {
        var obj = tie('a', {$request: {url: 'data.json'}});
        obj.$request.get({}, {});
        var a = {};
        obj.$request.get({}, a, true);
        a.should.eql({a: 13}, 'request refetch');
    });
    it('should map correct type', function () {
        var obj = tie('a', {$request: {url: 'data.json'}});
        var req = obj.$request.get({}, {});
        req.xhr.type.should.eql('GET', 'request get');
        req = obj.$request.post({}, {});
        req.xhr.type.should.eql('POST', 'request post');
        req = obj.$request.put({}, {});
        req.xhr.type.should.eql('PUT', 'request put');
        req = obj.$request.delete({}, {});
        req.xhr.type.should.eql('DELETE', 'request delete');
    });
});

