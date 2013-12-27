viewHandle("shown", function (view, config, els) {
    _.forEach(els, function (el) {
        if (el) {
            el.show(config);
        }
    });
    return config;
}, [], true);