var browser = require('./browser');
var should = require('should');


function prepareA(document) {
    var a = document.createElement("a");
    document.body.appendChild(a);
    return a;
}


function prepareInput(window, $, tag, type) {
    var document = window.document;
    if(!tag) {
        tag = 'input';
    }
    if(!type && tag === 'input') {
        type = 'text';
    }
    var input = document.createElement(tag);
    if(type){
        input.type = type;
    }
    document.body.appendChild(input);
    var obj = window.tie('a', {value: 'lala'});
    var el = new $(input, obj);
    return {input: input, obj: obj, el: el};
}

describe('dom', function () {
    describe('bootstrap', function () {
        it('jsdom should work', function (done) {
            browser(function (window) {
                window.document.body.innerHTML.should.eql("Hello World!", "html");
                done();
            });
        });
        it('ajax should work', function (done) {
            browser(function (window) {
                should.exist(window.XMLHttpRequest);
                done();
            });
        });
        it('should have tie top level object', function (done) {
            browser(function (window) {
                should.exist(window.tie);
                (typeof window.tie).should.eql("function", "tie is function");
                done();
            });
        });
        it('should have pipe function', function (done) {
            browser(function (window) {
                should.exist(window.tie.pipe);
                (typeof window.tie.pipe).should.eql("function", "tie pipe is function");
                done();
            });
        });
        it('should have handle function', function (done) {
            browser(function (window) {
                should.exist(window.tie.handle);
                (typeof window.tie.handle).should.eql("function", "tie handle is function");
                done();
            });
        });
        it('should have enableDebug function', function (done) {
            browser(function (window) {
                should.exist(window.tie.enableDebug);
                (typeof window.tie.enableDebug).should.eql("function", "tie enableDebug is function");
                done();
            });
        });
    });
    describe('q', function () {
        it('should add next', function (done) {
            browser(function (window) {
                var q = window.exports().q;
                var document = window.document;
                var a = prepareA(document);
                q.next(a, a.cloneNode(true));
                document.getElementsByTagName('a').length.should.eql(2, 'nodes number');
                done();
            }, ['dom']);
        });
        it('should remove element', function (done) {
            browser(function (window) {
                var q = window.exports().q;
                var document = window.document;
                var a = prepareA(document);
                document.body.appendChild(a.cloneNode(true));
                document.getElementsByTagName('a').length.should.eql(2, 'nodes number before');
                q.remove(a);
                document.getElementsByTagName('a').length.should.eql(1, 'nodes number after');
                done();
            }, ['dom']);
        });
        it('should run on ready', function (done) {
            browser(function (window) {
                var q = window.exports().q;
                q.ready(function () {
                    done();
                });
            }, ['dom']);
        });
        it('should wrap element', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var document = window.document;
                var a = document.createElement("a");
                var obj = {value: 'lala'};
                var el = new $(a, obj);
                el.$.should.eql(a, 'element');
                el.obj.should.eql(obj, 'obj');
                done();
            }, ['dom']);
        });
        it('should set listener on input', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var __ret = prepareInput(window, $);
                var obj = __ret.obj;
                var el = __ret.el;
                el.isInput.should.eql(true, 'input');
                browser.sendKey(el.$, 'l');
                obj.value.should.eql('l', 'onchange');
                done();
            }, ['dom']);
        });
        it('should set listener on checkbox', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var __ret = prepareInput(window, $, 'input', 'checkbox');
                var obj = __ret.obj;
                var el = __ret.el;
                el.isInput.should.eql(true, 'input');
                el.hasCheck.should.eql(true, 'check');
                el.value(true);
                browser.fireEvent(el.$, 'change');
                obj.value.should.eql(true, 'onchange');
                done();
            }, ['dom']);
        });
        it('should set listener on textarea', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var __ret = prepareInput(window, $, 'textarea');
                var obj = __ret.obj;
                var el = __ret.el;
                el.isInput.should.eql(true, 'input');
                browser.sendKey(el.$, 'l');
                obj.value.should.eql('l', 'onchange');
                done();
            }, ['dom']);
        });
        it('should set listener on select', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var __ret = prepareInput(window, $, 'select');
                var obj = __ret.obj;
                var el = __ret.el;
                el.isInput.should.eql(true, 'input');
                el.isSelect.should.eql(true, 'select');

                var document = window.document;
                var opt = document.createElement("option");
                opt.value= 'b';
                opt.innerHTML = 'baba';
                el.$.appendChild(opt);
                opt = document.createElement("option");
                opt.value= 'l';
                opt.innerHTML = 'lala';
                el.$.appendChild(opt);
                el.value('l');
                browser.fireEvent(el.$, 'change');
                obj.value.should.eql('l', 'onchange');
                done();
            }, ['dom']);
        });
        it('should remember display type on show/hide ', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var __ret = prepareInput(window, $);
                var el = __ret.el;
                el.$.style.display = 'dummy';
                el.show(false);
                el.$.style.display.should.eql('none', 'hide');
                el.show(true);
                el.$.style.display.should.eql('dummy', 'show');
                done();
            }, ['dom']);
        });
        it('should set external text on input ', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var __ret = prepareInput(window, $);
                var el = __ret.el;
                el.text('dummy');
                el.textEl.textContent.should.eql('dummy', 'text el');
                el.text().should.eql('dummy', 'text');
                done();
            }, ['dom']);
        });
        it('should set attribute ', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var __ret = prepareInput(window, $);
                var el = __ret.el;
                el.setAttribute('name', 'dummy');
                el.$.getAttribute('name').should.eql('dummy', 'el attr');
                done();
            }, ['dom']);
        });
        it('should set value ', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var __ret = prepareInput(window, $);
                var el = __ret.el;
                el.setAttribute('value', 'dummy');
                el.value().should.eql('dummy', 'value');
                el.$.value.should.eql('dummy', 'el value');
                done();
            }, ['dom']);
        });
        it('should set text ', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var __ret = prepareInput(window, $);
                var el = __ret.el;
                el.setAttribute('text', 'dummy');
                el.text().should.eql('dummy', 'text');
                done();
            }, ['dom']);
        });
        it('should set listener ', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var __ret = prepareInput(window, $);
                var el = __ret.el;
                var i = 'aaa';
                var fn = function () {
                    i = 'bbb';
                };
                el.setAttribute('click', fn);
                browser.fireEvent(el.$, 'click');
                should.exist(el.events.click);
                i.should.eql('bbb', 'text');
                done();
            }, ['dom']);
        });
        it('should react on $shown ', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var __ret = prepareInput(window, $);
                var el = __ret.el;
                var obj = __ret.obj;
                obj.$shown = false;
                el.shown.should.eql(false, 'hidden');
                el.$.style.display.should.eql('none', 'hidden');
                done();
            }, ['dom']);
        });
    });
});

