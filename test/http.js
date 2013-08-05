var browser = require('./browser');
var should = require('should');

describe('http', function () {
    it('should process $http', function () {
        browser(function (window) {
            var obj = window.tie('a', {$http: {url:'data.json'}});
            should.exist(obj.$http.get, 'http get');
        }, ['dom', 'http']);
    });
});
