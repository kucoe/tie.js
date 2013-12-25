/**
 * Tie.js Command line interface handle
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */

module.exports = function (core) {
    var cli = require("cline")(undefined, global.test);
    init(core, cli);
    return cli;
};

var init = function (tie, cli) {
    tie.handle("cli", function (obj, config) {
        if (this.isString(config)) {
            config = {
                cmd: config
            }
        }
        if (!config.desc) {
            config.desc = obj.desc || obj.description;
        }
        if (!config.args) {
            config.args = {};
            var re = /{([^}]*)}/g;
            var arr;
            while ((arr = re.exec(config.cmd)) !== null) {
                var n = arr[1];
                config.args[n] = obj[n];
            }
        }
        if (!config.fn) {
            config.fn = obj.value;
        }
        cli.command(config.cmd, config.desc, config.args, config.fn);
        return config;
    });
};



