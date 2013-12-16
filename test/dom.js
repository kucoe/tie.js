var browser = require('./browser');
var should = require('should');

function prepareA(document) {
    var a = document.createElement("a");
    document.body.appendChild(a);
    return a;
}

function prepareInput(window, $, tag, type) {
    var document = window.document;
    if (!tag) {
        tag = 'input';
    }
    if (!type && tag === 'input') {
        type = 'text';
    }
    var input = document.createElement(tag);
    if (type) {
        input.type = type;
    }
    input.setAttribute('data-tie', 'a');
    document.body.appendChild(input);
    var obj = window.tie('a', {value: 'lala', style: 'color:blue', $view: {style: '#'}});
    var el = new $(input, obj);
    return {input: input, obj: obj, el: el};
}

describe.only('dom', function () {
    describe('bootstrap', function () {
        it('jsdom should work', function (done) {
            this.timeout(10000);
            setTimeout(function () {
                browser(function (window) {
                    window.document.body.innerHTML.should.eql("Hello World!", "html");
                    done();
                });
            }, 5000);
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
                q.insertAfter(a, a.cloneNode(true));
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
                opt.value = 'b';
                opt.innerHTML = 'baba';
                el.$.appendChild(opt);
                opt = document.createElement("option");
                opt.value = 'l';
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
                el.setAttribute('click', fn, __ret.obj);
                browser.fireEvent(el.$, 'click');
                should.exist(el.events.click);
                i.should.eql('bbb', 'text');
                done();
            }, ['dom']);
        });
    });
    describe('view', function () {
        it('should process $view', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var __ret = prepareInput(window, $);
                var obj = __ret.obj;
                should.exist(obj.$view.style, 'view');
                done();
            }, ['dom']);
        });
        it('should process asterisk $view', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a');
                document.body.appendChild(input);
                var obj = window.tie('a', {value: 'lala', $view: '*'});
                obj.$view.value.value.should.eql('lala', 'asterisk view');
                should.not.exist(obj.$view._uid, 'no private');
                should.not.exist(obj.$view.$name, 'no handles');
                done();
            }, ['dom']);
        });
        it('should process attributes mapper $view', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a');
                input.setAttribute('href', '');
                input.setAttribute('title', '');
                document.body.appendChild(input);
                var obj = window.tie('a', {title: 'lala', href: 'google.com', $view: '@'});
                obj.$view.href.value.should.eql('google.com', 'mapper view');
                obj.$view.title.value.should.eql('lala', 'mapper view');
                should.not.exist(obj.$view.value, 'no attr');
                done();
            }, ['dom']);
        });
        it('should process empty property path in $view', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a');
                document.body.appendChild(input);
                var obj = window.tie('a', {value: 'lala', style: 'blue', $view: '#'});
                obj.$view.value.value.should.eql('lala', 'path in view');
                should.not.exist(obj.$view.style, 'no other');
                done();
            }, ['dom']);
        });
        it('should process property path in $view', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a');
                document.body.appendChild(input);
                var obj = window.tie('a', {value: 'lala', style: 'blue', $view: '#style'});
                obj.$view.value.value.should.eql('blue', 'path in view');
                should.not.exist(obj.$view.style, 'no other');
                done();
            }, ['dom']);
        });
        it('should process property attribute', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a');
                document.body.appendChild(input);
                var obj = window.tie('a', {value: 'lala', $view: {style: '#value'}});
                obj.$view.style.value.should.eql('lala', 'property attr');
                done();
            }, ['dom']);
        });
        it('should process value attribute', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a');
                document.body.appendChild(input);
                var obj = window.tie('a', {value: 'lala', $view: { style: function value() {
                    return 'color:' + this.value;
                }}});
                obj.$view.style.value.should.eql('color:lala', 'value attr');
                done();
            }, ['dom']);
        });
        it('should select element', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var renders = window.exports().renders;
                var __ret = prepareInput(window, $);
                var obj = __ret.obj;
                var r = renders[obj.$name];
                should.exist(r, 'renderer');
                setTimeout(function () {
                    var element = r.$[0];
                    should.exist(element, 'element');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should render attributes', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var renders = window.exports().renders;
                var __ret = prepareInput(window, $);
                var obj = __ret.obj;
                var r = renders[obj.$name];
                should.exist(obj.$view.style, 'view');
                setTimeout(function () {
                    r.$[0].$.getAttribute('style').should.eql('color:blue', 'attribute');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should re-render attribute on change', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var renders = window.exports().renders;
                var __ret = prepareInput(window, $);
                var obj = __ret.obj;
                var r = renders[obj.$name];
                should.exist(obj.$view.style, 'view');
                setTimeout(function () {
                    r.$[0].$.getAttribute('style').should.eql('color:blue', 'attribute');
                    obj.style = 'color:red';
                    r.$[0].$.getAttribute('style').should.eql('color:red', 're-render');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should render property attribute', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a');
                document.body.appendChild(input);
                window.tie('a', {value: 'lala', $view: 'style#'});
                setTimeout(function () {
                    input.getAttribute('style').should.eql('lala', 'property attribute');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should re-render property attribute', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a');
                document.body.appendChild(input);
                var obj = window.tie('a', {value: 'lala', $view: 'style#'});
                setTimeout(function () {
                    input.getAttribute('style').should.eql('lala', 'property attribute');
                    obj.value = 'balaba';
                    input.getAttribute('style').should.eql('balaba', 're-render property');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should render value attribute', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a');
                document.body.appendChild(input);
                window.tie('a', {value: 'lala', $view: {style: function value() {
                    return 'color:' + this.value;
                }}});
                setTimeout(function () {
                    input.getAttribute('style').should.eql('color:lala', 'value attribute');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should re-render value attribute', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a');
                document.body.appendChild(input);
                var obj = window.tie('a', {value: 'lala', $view: {style: function () {
                    return 'color:' + this.value;
                }.val()}});
                setTimeout(function () {
                    input.getAttribute('style').should.eql('color:lala', 'value attribute');
                    obj.value = 'green';
                    input.getAttribute('style').should.eql('color:green', 're-render value');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should not re-render when unrelated', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a');
                document.body.appendChild(input);
                var obj = window.tie('a', {value: 'lala', style: 'aaa', $view: {style: function () {
                    return 'color:' + this.value;
                }.val()}});
                setTimeout(function () {
                    input.getAttribute('style').should.eql('color:lala', 'value attribute');
                    obj.style = 'green';
                    input.getAttribute('style').should.eql('color:lala', 'not  re-render value');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should process pipe', function (done) {
            browser(function (window) {
                var document = window.document;
                window.tie.pipe("upper", function (obj) {
                    obj.value = this.uppercase(obj.value);
                    return obj;
                });
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a | upper');
                document.body.appendChild(input);
                window.tie('a', {value: 'lala', $view: '#'});
                setTimeout(function () {
                    input.getAttribute('value').should.eql('LALA', 'pipe');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should process property pipe', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a.name');
                document.body.appendChild(input);
                window.tie('a', {value: 'lala', name: 'baba', $view: '#'});
                setTimeout(function () {
                    input.getAttribute('value').should.eql('baba', 'property pipe');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should process property change for pipe', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a.name');
                document.body.appendChild(input);
                var obj = window.tie('a', {value: 'lala', name: 'baba', $view: '#'});
                setTimeout(function () {
                    input.getAttribute('value').should.eql('baba', 'property pipe');
                    obj.name = 'lala';
                    input.getAttribute('value').should.eql('lala', 'property pipe');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should update property', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a.name');
                document.body.appendChild(input);
                var obj = window.tie('a', {value: 'lala', name: 'baba', $view: '#'});
                setTimeout(function () {
                    input.getAttribute('value').should.eql('baba', 'pipes');
                    browser.sendKey(input, 'l');
                    input.getAttribute('value').should.eql('babal', 'input');
                    obj.name.should.eql('babal', 'updated');
                    obj.value.should.eql('lala', 'not updated');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should work with app defaults', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a.name');
                document.body.appendChild(input);
                window.tie('app', {$view: '#'});
                var obj = window.tie('a', 'lala');
                setTimeout(function () {
                    should.exist(obj.$view);
                    input.getAttribute('value').should.eql('lala', 'app default');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should merge with app defaults', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a.name');
                document.body.appendChild(input);
                window.tie('app', {$view: '#'});
                var obj = window.tie('a', {value:'lala', $view : {style:'color:blue'}});
                setTimeout(function () {
                    should.exist(obj.$view);
                    should.exist(obj.$view.value);
                    should.exist(obj.$view.style);
                    input.getAttribute('value').should.eql('lala', 'app default');
                    input.getAttribute('style').should.eql('color:blue', 'app default');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should not merge string with app defaults', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a.name');
                document.body.appendChild(input);
                window.tie('app', {$view: '#'});
                var obj = window.tie('a', {value:'color:blue', $view : 'style#'});
                setTimeout(function () {
                    should.exist(obj.$view);
                    should.not.exist(obj.$view.value);
                    should.exist(obj.$view.style);
                    input.getAttribute('style').should.eql('color:blue', 'app default');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should work with function', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a');
                document.body.appendChild(input);
                window.tie('app', {$view: '#'});
                var obj = window.tie('a', function () {
                    return 'color:blue';
                });
                setTimeout(function () {
                    should.exist(obj.$view);
                    input.getAttribute('value').should.eql('color:blue', 'fn value');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should not allow html as value', function (done) {
            browser(function (window) {
                var document = window.document;
                var div = document.createElement("div");
                div.setAttribute('data-tie', 'a');
                document.body.appendChild(div);
                window.tie('app', {$view: '#'});
                window.tie('a', '<span>lala</span>');
                setTimeout(function () {
                    div.textContent.should.eql('<span>lala</span>', 'inner text');
                    done();
                }, 200);
            }, ['dom']);
        });
    });
    describe('viewHandles', function () {
        it('should react on $shown', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var renders = window.exports().renders;
                var __ret = prepareInput(window, $);
                var obj = __ret.obj;
                setTimeout(function () {
                    obj.$view.$shown = false;
                    var r = renders[obj.$name];
                    var el = r.$[0];
                    el.shown.should.eql(false, 'hidden');
                    el.$.style.display.should.eql('none', 'hidden');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should default $shown', function (done) {
            browser(function (window) {
                var document = window.document;
                var div = document.createElement("div");
                div.setAttribute('data-tie', 'a');
                document.body.appendChild(div);
                window.tie('a', {value: 'lala', $view: {value: '#', $shown: false}});
                setTimeout(function () {
                    div.style.display.should.eql('none', 'hidden');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should react on $parent by id', function (done) {
            browser(function (window) {
                var document = window.document;
                var parent = document.createElement("div");
                parent.setAttribute('id', 'parent');
                document.body.appendChild(parent);
                var input = document.createElement('input');
                input.setAttribute('data-tie', 'a');
                input.type = 'text';
                document.body.appendChild(input);
                window.tie('app', {$view: '#'});
                window.tie('a', {value: 'a', $view:{ $parent: 'parent'} });
                setTimeout(function () {
                    parent.firstChild.tagName.toLowerCase().should.eql('input', '$parent');
                    parent.firstChild.value.should.eql('a', 'combine $view');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should react on $parent change', function (done) {
            browser(function (window) {
                var document = window.document;
                var parent = document.createElement("div");
                parent.setAttribute('id', 'parent');
                document.body.appendChild(parent);
                var parent2 = document.createElement("div");
                parent2.setAttribute('id', 'parent2');
                document.body.appendChild(parent2);
                var input = document.createElement('input');
                input.setAttribute('data-tie', 'a');
                input.type = 'text';
                document.body.appendChild(input);
                window.tie('app', {$view: '#'});
                var a = window.tie('a', {value: 'a', $view:{ $parent: 'parent'} });
                setTimeout(function () {
                    parent.firstChild.tagName.toLowerCase().should.eql('input', '$parent');
                    a.$view.$parent = 'parent2';
                    should.not.exists(parent.firstChild);
                    parent2.firstChild.tagName.toLowerCase().should.eql('input', 'new $parent');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should react on $parent by tie', function (done) {
            browser(function (window) {
                var document = window.document;
                var parent = document.createElement("div");
                parent.setAttribute('data-tie', 'b');
                document.body.appendChild(parent);
                var input = document.createElement('input');
                input.setAttribute('data-tie', 'a');
                input.type = 'text';
                document.body.appendChild(input);
                window.tie('app', {$view: '#'});
                window.tie('a', {value: 'a', $view:{ $parent: '#b'} }, ['b']);
                window.tie('b', {value: 'color:blue', $view:'style#' });
                setTimeout(function () {
                    parent.getAttribute('style').should.eql('color:blue', 'process parent');
                    parent.firstChild.tagName.toLowerCase().should.eql('input', '$parent');
                    parent.firstChild.value.should.eql('a', 'combine $view');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should react on $children', function (done) {
            browser(function (window) {
                var document = window.document;
                var div = document.createElement("div");
                div.setAttribute('data-tie', 'a');
                document.body.appendChild(div);
                var child1 = {
                    $tag: 'input',
                    type: 'text'
                };
                var child2 = {
                    $tag: 'a',
                    href: 'https://kucoe.net'
                };
                window.tie('a', {value: 'a', $view: {value:'#', $children:[child1, child2]}});
                setTimeout(function () {
                    div.children.length.should.eql(2, 'children');
                    div.children[0].tagName.toLowerCase().should.eql('input', 'child tag');
                    div.children[0].type.should.eql('text', 'child type');
                    div.children[1].tagName.toLowerCase().should.eql('a', 'child tag');
                    div.children[1].href.should.eql('https://kucoe.net/', 'child href');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should react on $children generator', function (done) {
            browser(function (window) {
                var document = window.document;
                var div = document.createElement("div");
                div.setAttribute('data-tie', 'a');
                document.body.appendChild(div);
                var child1 = {
                    $tag: 'input',
                    type: 'text'
                };
                var child2 = {
                    $tag: 'a',
                    href: 'https://kucoe.net'
                };
                var arr = [child1, child2];
                var generator = function() {
                    return arr.shift();
                };
                window.tie('a', {value: 'a', $view: {value:'#', $children:generator}});
                setTimeout(function () {
                    div.children.length.should.eql(2, 'children');
                    div.children[0].tagName.toLowerCase().should.eql('input', 'child tag');
                    div.children[0].type.should.eql('text', 'child type');
                    div.children[1].tagName.toLowerCase().should.eql('a', 'child tag');
                    div.children[1].href.should.eql('https://kucoe.net/', 'child href');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should react on $children change', function (done) {
            browser(function (window) {
                var document = window.document;
                var div = document.createElement("div");
                div.setAttribute('data-tie', 'a');
                document.body.appendChild(div);
                var child1 = {
                    $tag: 'input',
                    type: 'text'
                };
                var child2 = {
                    $tag: 'a',
                    href: 'https://kucoe.net'
                };
                var a = window.tie('a', {value: 'a', $view: {value:'#', $children:[child1, child2]}});
                setTimeout(function () {
                    div.children.length.should.eql(2, 'children');
                    div.children[0].tagName.toLowerCase().should.eql('input', 'child tag');
                    div.children[0].type.should.eql('text', 'child type');
                    div.children[1].tagName.toLowerCase().should.eql('a', 'child tag');
                    div.children[1].href.should.eql('https://kucoe.net/', 'child href');
                    a.$view.$children = [child2, child1];
                    div.children.length.should.eql(2, 'children');
                    div.children[0].tagName.toLowerCase().should.eql('a', 'child change tag');
                    div.children[0].href.should.eql('https://kucoe.net/', 'child change href');
                    div.children[1].tagName.toLowerCase().should.eql('input', 'child change tag');
                    div.children[1].type.should.eql('text', 'child change type');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should use object for $children attr values', function (done) {
            browser(function (window) {
                var document = window.document;
                var div = document.createElement("div");
                div.setAttribute('data-tie', 'a');
                document.body.appendChild(div);
                var child = {
                    $tag: 'a',
                    href: '#value'
                };
                window.tie('a', {value: 'https://kucoe.net', $view: {$children:child}});
                setTimeout(function () {
                    div.children.length.should.eql(1, 'children');
                    div.children[0].tagName.toLowerCase().should.eql('a', 'child tag');
                    div.children[0].href.should.eql('https://kucoe.net/', 'child href');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should react on object change in $children', function (done) {
            browser(function (window) {
                var document = window.document;
                var div = document.createElement("div");
                div.setAttribute('data-tie', 'a');
                document.body.appendChild(div);
                var child = {
                    $tag: 'a',
                    href: '#value'
                };
                var a = window.tie('a', {value: 'https://kucoe.net', $view: {$children:child}});
                setTimeout(function () {
                    div.children.length.should.eql(1, 'children');
                    div.children[0].tagName.toLowerCase().should.eql('a', 'child tag');
                    div.children[0].href.should.eql('https://kucoe.net/', 'child href');
                    a.value = 'http://becevka.com';
                    div.children.length.should.eql(1, 'children');
                    div.children[0].tagName.toLowerCase().should.eql('a', 'child tag');
                    div.children[0].href.should.eql('http://becevka.com/', 'value change');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should react on array changes in $children', function (done) {
            browser(function (window) {
                var document = window.document;
                var div = document.createElement("div");
                div.setAttribute('data-tie', 'a');
                document.body.appendChild(div);
                var child1 = {
                    $tag: 'input',
                    type: 'text'
                };
                var child2 = {
                    $tag: 'a',
                    href: 'https://kucoe.net'
                };
                var a = window.tie('a', {value: 'https://kucoe.net', $view: {$children:child1}});
                setTimeout(function () {
                    div.children.length.should.eql(1, 'children');
                    div.children[0].tagName.toLowerCase().should.eql('input', 'child tag');
                    a.$view.$children.push(child2);
                    div.children.length.should.eql(2, 'children');
                    div.children[0].tagName.toLowerCase().should.eql('input', 'child tag');
                    div.children[1].tagName.toLowerCase().should.eql('a', 'child tag');
                    a.$view.$children.reverse();
                    div.children.length.should.eql(2, 'children');
                    div.children[0].tagName.toLowerCase().should.eql('a', 'child tag');
                    div.children[1].tagName.toLowerCase().should.eql('input', 'child tag');
                    a.$view.$children.shift();
                    div.children.length.should.eql(1, 'children');
                    div.children[0].tagName.toLowerCase().should.eql('input', 'child tag');
                    done();
                }, 200);
            }, ['dom']);
        });
    });
});

