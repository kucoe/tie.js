var browser = require('./browser');
var should = require('should');


describe.only('route', function () {
    it('should process $route', function (done) {
        this.timeout(10000);
        setTimeout(function () {

        browser(function (window) {
            window.tie('app', {$route: {'/': {}}});
            var routes = window.exports.routes;
            should.exists(routes);
            done();
        }, ['view', 'route']);
        }, 3000);
    });
    it('should find $route paths', function (done) {
        browser(function (window) {
            window.tie('app', {$route: {'/': {}, '/welcome': {}, '/edit/:id': {}, '/edit/:id/comments': {}}});
            window.tie('example', '');
            var routes = window.exports.routes;
            should.not.exists(routes.find('/edit'));
            should.not.exists(routes.find('/edit/'));
            should.exists(routes.find('/edit/12'));
            should.exists(routes.find('/edit/12/comments'));
            should.exists(routes.find('/edit/12/comments/'));
            should.exists(routes.find('/edit//comments/'));
            should.not.exists(routes.find('/edit/12/comments/12'));
            done();
        }, ['view', 'route']);
    });
    it('should move to default location', function (done) {
        browser(function (window) {
            window.tie('app', {$route: {'/': {}, '/welcome': {}}});
            window.tie('example', '');
            var routes = window.exports.routes;
            window.location.hash = '#/home';
            routes.locate({});
            console.log(routes.list);
            setTimeout(function () {
                window.location.hash.should.eql('#/', 'moved');
                window.location.hash = '#/welcome';
                routes.locate({});
                setTimeout(function () {
                    window.location.hash.should.eql('#/welcome', 'not moved');
                    done();
                }, 200);
            }, 200);
        }, ['view', 'route']);
    });
});