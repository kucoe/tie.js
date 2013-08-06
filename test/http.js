var browser = require('./browser');
var should = require('should');

describe('http', function () {
    it('should process $http', function (done) {
        this.timeout(10000);
        setTimeout(function () {
            browser(function (window) {
                window.tie.enableDebug(true);
                var obj = window.tie('a', {$http: {url: 'data.json'}});
                (typeof obj.$http.get).should.eql('function', 'http get');
                done();
            }, ['dom', 'http']);
        }, 8000);
    });
});
