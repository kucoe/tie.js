var browser = require('./browser');
var should = require('should');


describe('route', function () {
    it('should process $route', function (done) {
        browser(function (window) {
            var routes = window.exports.routes;
            window.tie('app', {$route: {'/': {}}});
            should.exists(routes);
            done();
        }, ['view', 'route']);
    });
    it('should find $route paths', function (done) {
        browser(function (window) {
            var routes = window.exports.routes;
            window.tie('app', {$route: {'/': {}, 'welcome': {}, 'edit/:id': {}, 'edit/:id/comments': {}}});
            window.tie('example', '');
            should.not.exists(routes.find('edit'));
            should.not.exists(routes.find('edit/'));
            should.exists(routes.find('edit/12'));
            should.exists(routes.find('edit/12/comments'));
            should.exists(routes.find('edit/12/comments/'));
            should.exists(routes.find('edit//comments/'));
            should.not.exists(routes.find('edit/12/comments/12'));
            done();
        }, ['view', 'route']);
    });
    it('should update routes dynamically', function (done) {
        browser(function (window) {
            var routes = window.exports.routes;
            var app = window.tie('app', {$route: {'/': {}, 'welcome': {}}});
            window.tie('example', '');
            should.not.exists(routes.find('home'));
            app.$route['home'] = {};
            should.exists(routes.find('home'));
            done();
        }, ['view', 'route']);
    });
    it('should move to default location', function (done) {
        browser(function (window) {
            window.tie('app', {$route: {'/': {}, 'welcome': {}}});
            window.tie('example', '');
            window.location.hash = '#home';
            setTimeout(function () {
                window.location.hash.should.eql('#/', 'moved');
                window.location.hash = '#welcome';
                setTimeout(function () {
                    window.location.hash.should.eql('#welcome', 'not moved');
                    done();
                }, 200);
            }, 300);
        }, ['view', 'route']);
    });
    it('should attach to on render', function (done) {
        browser(function (window) {
            var app = window.tie('app', {$route: {'/': {}, 'welcome': {}}});
            window.tie('example', '');
            window.location.hash = '';
            setTimeout(function () {
                app.$route.$location().path.should.eql('/', 'current path');
                done();
            }, 300);
        }, ['view', 'route']);
    });
    it('should call handler on app', function (done) {
        browser(function (window) {
            var app = window.tie('app', {$route: {'/': {}, 'welcome': function () {
                this.should.eql(app, 'app as this');
                done();
            }}});
            window.tie('example', '');
            window.location.hash = 'welcome';
        }, ['view', 'route']);
    });
    it('should hide on specific route', function (done) {
        browser(function (window) {
            var document = window.document;
            var div = document.createElement("div");
            div.setAttribute('data-tie', 'example');
            document.body.appendChild(div);
            var app = window.tie('app', {$route: {'/': {}, 'welcome': {}}, $view: '#'});
            var obj = window.tie('example', {value: 'lala', $view: {$routes: ['/']}});
            window.location.hash = 'welcome';
            setTimeout(function () {
                obj.$view.$shown.should.eql(false, 'not shown');
                div.textContent.should.eql('lala', 'value');
                div.style.display.should.eql('none', 'hidden');
                done();
            }, 200);
        }, ['view', 'route']);
    });
    it('should show on route change', function (done) {
        browser(function (window) {
            var document = window.document;
            var div = document.createElement("div");
            div.setAttribute('data-tie', 'example');
            document.body.appendChild(div);
            var app = window.tie('app', {$route: {'/': {}, 'welcome': {}, home: {}}, $view: '#'});
            var obj = window.tie('example', {value: 'lala', $view: {$routes: ['/', 'home']}});
            window.location.hash = '';
            window.location.hash = 'welcome';
            setTimeout(function () {
                obj.$view.$shown.should.eql(false, 'not shown');
                div.textContent.should.eql('lala', 'value');
                div.style.display.should.eql('none', 'hidden');
                window.location.hash = 'home';
                setTimeout(function () {
                    obj.$view.$shown.should.eql(true, 'shown');
                    div.textContent.should.eql('lala', 'value');
                    div.style.display.should.eql('', 'visible');
                    done();
                }, 300);
            }, 200);
        }, ['view', 'route']);
    });
    it('should show on no routes', function (done) {
        browser(function (window) {
            var document = window.document;
            var div = document.createElement("div");
            div.setAttribute('data-tie', 'example');
            document.body.appendChild(div);
            var app = window.tie('app', {$route: {'/': {}, 'welcome': {}}, $view: '#'});
            var obj = window.tie('example', 'lala');
            window.location.hash = 'welcome';
            setTimeout(function () {
                obj.$view.$shown.should.eql(true, 'shown');
                div.textContent.should.eql('lala', 'value');
                div.style.display.should.eql('', 'visible');
                done();
            }, 200);
        }, ['view', 'route']);
    });
});