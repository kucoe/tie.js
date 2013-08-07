var browser = require('./browser');
var should = require('should');

describe('http', function () {
    it('should process $http', function (done) {
        browser(function (window) {
            var obj = window.tie('a', {$http: {url: 'data.json'}});
            (typeof obj.$http.get).should.eql('function', 'http get');
            done();
        }, ['dom', 'http']);
    });
});
