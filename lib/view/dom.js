var dom = {

    domReady: false,

    readyListeners: [],

    fetched: [],

    readyFn: function () {
        _.forEach(this.readyListeners, function (listener) {
            setTimeout(listener, 100);
        });
        this.domReady = true;
    },

    insertAfter: function (index, newElements) {
        var parent = index.parentNode;
        _.forEach(newElements, function (node) {
            parent.insertBefore(node, index.nextSibling);
            index = node;
        });
    },

    remove: function (element) {
        var parent = element.parentNode;
        if (parent) parent.removeChild(element);
    },

    removeChildren: function (element) {
        while (element && element.firstChild) {
            element.removeChild(element.firstChild);
        }
    },

    hasClass: function (elem, className) {
        return new RegExp(' ' + className + ' ').test(' ' + elem.className + ' ');
    },

    addClass: function (elem, className) {
        if (!this.hasClass(elem, className)) {
            elem.className += ' ' + className;
        }
    },

    removeClass: function (elem, className) {
        var newClass = ' ' + elem.className.replace(/[\t\r\n]/g, ' ') + ' ';
        if (this.hasClass(elem, className)) {
            while (newClass.contains(' ' + className + ' ')) {
                newClass = newClass.replace(' ' + className + ' ', ' ');
            }
            elem.className = newClass.replace(/^\s+|\s+$/g, '');
        }
    },

    ready: function (fn) {
        if (fn) {
            // check if document already is loaded
            var f = this.readyFn.bind(this);
            if (document.readyState === 'complete') {
                _.nextTick(fn);
                this.domReady = true;
            } else {
                if (this.readyListeners.length == 0) {
                    window.addEventListener('load', f);
                }
            }
            if (this.readyListeners.length == 0) {
                window.addEventListener('hashchange', f);
            }
            this.readyListeners.push(fn);
        }
        return this.domReady;
    },

    fetch: function (selector, base) {
        if (!base) {
            this.fetched = [];
            base = document;
        }
        var nodes = base.querySelectorAll(selector);
        _.forEach(nodes, function (el) {
            this.fetched.push(el);
        }, this);
    }
};