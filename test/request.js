global.test = true;
var should = require('should');

var tie = require('../lib/tie');
var request = require('../lib/request')(tie);

describe('request', function () {
    it('should process $request', function () {
        var obj = tie('a', {$request: {url: 'http://jsonplaceholder.typicode.com/posts/1'}});
        (typeof obj.$request.get).should.eql('function', 'request get');
    });
    it('should process $request as url', function () {
        var obj = tie('a', {$request: 'http://jsonplaceholder.typicode.com/posts/1'});
        var req = obj.$request.get({}, {});
        req.request.url.should.eql('http://jsonplaceholder.typicode.com/posts/1', 'request url');
    });
    it('should default not cache', function () {
        var obj = tie('a', {$request: {url: 'http://jsonplaceholder.typicode.com/posts/1'}});
        obj.$request.cache.should.eql(false, 'request not cache');
    });
    it('should combine url', function () {
        tie('app', {$request: {url: 'http://jsonplaceholder.typicode.com/'}});
        var obj = tie('a', {$request: {url: 'posts/1'}});
        var req = obj.$request.get({}, {});
        req.request.url.should.eql('http://jsonplaceholder.typicode.com/posts/1', 'request url');
    });
    it('should combine url with url template', function () {
        tie('app', {$request: {url: 'http://jsonplaceholder.typicode.com/{url}/1'}});
        var obj = tie('a', {$request: {url: 'posts'}});
        var req = obj.$request.get({}, {});
        req.request.url.should.eql('http://jsonplaceholder.typicode.com/posts/1', 'request url');
    });
    it('should combine url with url template and empty url', function () {
        tie('app', {$request: {url: 'http://jsonplaceholder.typicode.com/posts/{url}'}});
        var obj = tie('a', {});
        var req = obj.$request.get({}, {});
        req.request.url.should.eql('http://jsonplaceholder.typicode.com/posts/', 'request url');
    });
    it('should combine params in url', function () {
        tie('app', {$request: {params: {a: 1}}});
        var obj = tie('a', {$request: {url: 'http://jsonplaceholder.typicode.com/posts/', params: {b: 2}}});
        var req = obj.$request.get({c: 3}, {});
        req.request.url.should.eql('http://jsonplaceholder.typicode.com/posts/?a=1&b=2&c=3', 'request params');
    });
    it('should combine params with url', function () {
        tie('app', {$request: {params: {a: 1}}});
        var obj = tie('a', {$request: {url: 'http://jsonplaceholder.typicode.com/posts/?yyy=100', params: {b: 2}}});
        var req = obj.$request.get({c: 3}, {});
        req.request.url.should.eql('http://jsonplaceholder.typicode.com/posts/?yyy=100&a=1&b=2&c=3', 'request params');
    });
    it('should combine params', function () {
        tie('app', {$request: {params: {userId: 1}}});
        var obj = tie('a', {$request: {url: 'http://jsonplaceholder.typicode.com/posts/', params: {title: 'a'}}});
        var req = obj.$request.post({body: 'b'}, {});
        req.request.params.should.eql('userId=1&title=a&body=b', 'request params');
    });
    it('should process params in url', function () {
        var obj = tie('a', {$request: 'http://jsonplaceholder.typicode.com/posts/:id'});
        var req = obj.$request.get({id: 1}, {});
        req.request.url.should.eql('http://jsonplaceholder.typicode.com/posts/1', 'url with params');
    });
    it('should combine headers', function () {
        tie('app', {$request: {headers: {'X-Requested-With': 'XMLHttpRequest'}}});
        var obj = tie('a', {$request: {url: 'http://jsonplaceholder.typicode.com/posts/1', headers: {'Content-Length': 0}}});
        var req = obj.$request.get({}, {});
        req.request.headers.should.eql({'X-Requested-With': 'XMLHttpRequest',
            'Content-Length': 0,
            'Accept': 'application/json'}, 'request headers');
    });
    it('should memo result', function (done) {
        var obj = tie('a', {$request: {url: 'http://jsonplaceholder.typicode.com/posts/1', cache: true}});
        obj.$request.get({}, {});
        setTimeout(function () {
            obj.$request.memo('http://jsonplaceholder.typicode.com/posts/1', 'json').userId.
                should.eql(1, 'request memo');
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
        var obj = tie('a', {$request: {url: 'http://jsonplaceholder.typicode.com/posts/:id'}});
        var req = obj.$request.get({id:1}, {});
        req.request.method.should.eql('GET', 'request get');
        req = obj.$request.post({}, {});
        req.request.method.should.eql('POST', 'request post');
        req = obj.$request.put({id:2}, {});
        req.request.method.should.eql('PUT', 'request put');
        req = obj.$request.delete({id:3}, {});
        req.request.method.should.eql('DELETE', 'request delete');
    });
});

