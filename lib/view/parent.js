viewHandle("parent", function (view, config, els) {
    var parents = [];
    if (_.isString(config)) {
        if (config.charAt(0) == '#') {
            var r = renders[config.substring(1)];
            if (r) {
                parents = r.$.map(function (el) {
                    return el.$;
                });
            }
        } else {
            parents = [document.getElementById(config)];
        }
    }
    _.forEach(parents, function (parent) {
        dom.removeChildren(parent);
        _.forEach(els, function (el) {
            var $ = el.$;
            dom.remove($);
            parent.appendChild($);
        });
    });
    return config;
}, [], true);