(function (window) {
    'use strict';

    var APP = 'app';
    var VALUE = 'value';
    var VALUES = 'values';
    var TEXT = 'text';
    var SHOWN = 'shown';
    var ATTRS = 'attrs';
    var ROUTES = 'routes';
    var ITEM_NAME = '_item_name';

    var s4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };

    Array.prototype._ = function (obj) {
        _.forEach(this, function (item) {
            if (!obj.hasOwnProperty(item)) {
                obj[item] = {'_item_name': item};
            }
        });
        return obj;
    };

//INSERT
    window.tie = tie();

})(window);
