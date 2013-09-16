module.exports = function(modules) {
    var tie = require('./lib/core')();
    modules.forEach(function(prop){
       tie[prop] = require('./lib/' +prop)(tie);
    });
    return tie;
};