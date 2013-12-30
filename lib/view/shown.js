viewHandle("shown", function (view, config, els) {
    if (els) {
        _.forEach(els, function (el) {
            el.show(config);
        });
    }
    return config;
}, [], true);