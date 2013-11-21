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
    var obj = window.tie('a', {value: 'lala', style: 'color:blue', $attrs: ['style']});
    var el = new $(input, obj);
    return {input: input, obj: obj, el: el};
}

describe('dom', function () {
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
                el.setAttribute('click', fn);
                browser.fireEvent(el.$, 'click');
                should.exist(el.events.click);
                i.should.eql('bbb', 'text');
                done();
            }, ['dom']);
        });
    });
    describe.skip('render', function () {
        it('should process $attrs', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var __ret = prepareInput(window, $);
                var obj = __ret.obj;
                should.exist(obj.$attrs.style, 'attrs');
                done();
            }, ['dom']);
        });
        it('should process property attribute', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a');
                document.body.appendChild(input);
                var obj = window.tie('a', {value: 'lala', $attrs: ['style#value']});
                obj.style.should.eql('lala', 'property attr');
                done();
            }, ['dom']);
        });
        it('should process value attribute', function (done) {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a');
                document.body.appendChild(input);
                var obj = window.tie('a', {value: 'lala', $attrs: [window.tie.attr('style', function () {
                    return 'color:' + this.value;
                })]});
                obj.style.should.eql('color:lala', 'value attr');
                done();
            }, ['dom']);
        });
        it('should not allow $attr', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var __ret = prepareInput(window, $);
                var obj = __ret.obj;
                obj.$attr = 'a';
                (typeof  obj.$attr).should.eql('function', 'attr');
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
                should.exist(obj.$attrs.style, 'attrs');
                setTimeout(function () {
                    var r = renders[obj.$name];
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
                should.exist(obj.$attrs.style, 'attrs');
                setTimeout(function () {
                    var r = renders[obj.$name];
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
                window.tie('a', {value: 'lala', $attrs: ['style#value']});
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
                var obj = window.tie('a', {value: 'lala', $attrs: ['style#value']});
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
                window.tie('a', {value: 'lala', $attrs: [window.tie.attr('style', function () {
                    return 'color:' + this.value;
                })]});
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
                var obj = window.tie('a', {value: 'lala', $attrs: [window.tie.attr('style', function () {
                    return 'color:' + this.value;
                }, ['value'])]});
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
                var obj = window.tie('a', {value: 'lala', style: 'aaa', $attrs: [window.tie.attr('style', function () {
                    return 'color:' + this.value;
                }, ['value'])]});
                setTimeout(function () {
                    input.getAttribute('style').should.eql('color:lala', 'value attribute');
                    obj.style = 'green';
                    input.getAttribute('style').should.eql('color:lala', 'not  re-render value');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should not combine property and value', function () {
            browser(function (window) {
                var document = window.document;
                var input = document.createElement("input");
                input.setAttribute('data-tie', 'a');
                document.body.appendChild(input);
                var a = function () {
                    window.tie('a', {value: 'lala', $attrs: [window.tie.attr('style#value', function () {
                        return 'color:' + this.value;
                    })]});
                }.should.throw('Property and calculated value combination is not supported');
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
                window.tie('a', {value: 'lala', $attrs: ['value']});
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
                window.tie('a', {value: 'lala', name: 'baba', $attrs: ['value']});
                setTimeout(function () {
                    input.getAttribute('value').should.eql('baba', 'property pipe');
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
                var obj = window.tie('a', {value: 'lala', name: 'baba', $attrs: ['value']});
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
                window.tie('app', {$attrs: ['value']});
                var obj = window.tie('a', 'lala');
                setTimeout(function () {
                    should.exist(obj.$attrs);
                    input.getAttribute('value').should.eql('lala', 'pipes');
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
                window.tie('app', {$attrs: ['value']});
                var obj = window.tie('a', function () {
                    return 'color:blue';
                });
                setTimeout(function () {
                    should.exist(obj.$attrs);
                    input.getAttribute('value').should.eql('color:blue', 'fn value');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should react on $shown', function (done) {
            browser(function (window) {
                var $ = window.exports().el;
                var renders = window.exports().renders;
                var __ret = prepareInput(window, $);
                var obj = __ret.obj;
                setTimeout(function () {
                    obj.$shown = false;
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
                window.tie('a', {value: 'lala', $attrs: ['value'], $shown: false});
                setTimeout(function () {
                    div.style.display.should.eql('none', 'hidden');
                    done();
                }, 200);
            }, ['dom']);
        });
    });
    describe.skip('view', function () {
        it('should not allow html as value', function (done) {
            browser(function (window) {
                var document = window.document;
                var div = document.createElement("div");
                div.setAttribute('data-tie', 'a');
                document.body.appendChild(div);
                window.tie('app', {$attrs: ['value']});
                window.tie('a', '<span>lala</span>');
                setTimeout(function () {
                    div.textContent.should.eql('<span>lala</span>', 'inner text');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should use view html', function (done) {
            browser(function (window) {
                var document = window.document;
                var div = document.createElement("div");
                div.setAttribute('data-tie', 'a');
                document.body.appendChild(div);
                var div2 = document.createElement("div");
                div2.setAttribute('data-tie', 'b');
                var input = document.createElement('input');
                input.type = 'text';
                div2.appendChild(input);
                document.body.appendChild(div2);
                window.tie('app', {$attrs: ['value']});
                window.tie('a', {value: 'a', $view: 'b'});
                window.tie('b', {});
                setTimeout(function () {
                    div.innerHTML.should.eql('<input type="text" />', 'view');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should combine view html', function (done) {
            browser(function (window) {
                var document = window.document;
                var div = document.createElement("div");
                div.setAttribute('data-tie', 'a');
                document.body.appendChild(div);
                var div2 = document.createElement("div");
                div2.setAttribute('data-tie', 'b');
                var input = document.createElement('input');
                input.type = 'text';
                div2.appendChild(input);
                document.body.appendChild(div2);
                var div3 = document.createElement("div");
                div3.setAttribute('data-tie', 'b');
                var a = document.createElement('a');
                a.href = 'd.html';
                div3.appendChild(a);
                document.body.appendChild(div3);
                window.tie('app', {$attrs: ['value']});
                window.tie('a', {value: 'a', $view: 'b'});
                window.tie('b', {});
                setTimeout(function () {
                    div.innerHTML.should.eql('<input type="text" /><a href="d.html"></a>', 'view');
                    done();
                }, 200);
            }, ['dom']);
        });
        it('should react on view change', function (done) {
            browser(function (window) {
                window.exports().clean();
                var document = window.document;
                var div = document.createElement("div");
                div.setAttribute('data-tie', 'a');
                document.body.appendChild(div);
                var div2 = document.createElement("div");
                div2.setAttribute('data-tie', 'b');
                var input = document.createElement('input');
                input.type = 'text';
                div2.appendChild(input);
                document.body.appendChild(div2);
                var div3 = document.createElement("div");
                div3.setAttribute('data-tie', 'c');
                var a = document.createElement('a');
                a.href = 'd.html';
                div3.appendChild(a);
                document.body.appendChild(div3);
                window.tie('app', {$attrs: ['value']});
                var obj = window.tie('a', {value: 'a', $view: 'b'});
                window.tie('b', {});
                window.tie('c', {});
                setTimeout(function () {
                    div.innerHTML.should.eql('<input type="text" />', 'view');
                    obj.$view = 'c';
                    setTimeout(function () {
                        div.innerHTML.should.eql('<a href="d.html"></a>', 'view change');
                        done();
                    }, 200);
                }, 200);
            }, ['dom']);
        });
        it('should process tie in html', function (done) {
            browser(function (window) {
                window.exports().clean();
                var document = window.document;
                var div = document.createElement("div");
                div.setAttribute('data-tie', 'a');
                document.body.appendChild(div);
                var div2 = document.createElement("div");
                div2.setAttribute('data-tie', 'b');
                var input = document.createElement('input');
                input.type = 'text';
                input.setAttribute('data-tie', 'c');
                div2.appendChild(input);
                document.body.appendChild(div2);
                window.tie('app', {$attrs: ['value']});
                window.tie('a', {value: 'a', $view: 'b'});
                window.tie('b', {});
                window.tie('c', 'c');
                setTimeout(function () {
                    div.innerHTML.should.eql('<input type="text" data-tie="c" style="" value="c" data-tied="" class="c" name="c" />', 'view');
                    done();
                }, 400);
            }, ['dom']);
        });
    });
});

