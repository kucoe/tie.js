var fs = require('fs');
var tie = require('../../src/lib/core')();


tie.handle("file", function(obj, config, watcher){
    if(this.isString(config)) {
        config = {
            path: config,
            sync:false
        }
    }
    var self = this;
    config.read = function() {
        var data = fs.readFileSync(this.path, 'utf-8');
        self.extend(obj, JSON.parse(data));
        watcher.inspect();
    };
    config.write = function() {
        var data = fs.readFileSync(this.path, 'utf-8');
        var o = JSON.parse(data);
        self.forIn(o, function(item, prop){
            o[prop] = obj[prop];
        });
        fs.writeFileSync(this.path, JSON.stringify(o), 'utf-8');
    };
    if(config.sync) {
        config.read();
        watcher.watch('*', function() {
            config.write();
        });
    }
    return config;
});


var test = tie("test", {$file:'../person.json'});
test.$file.read();
console.log(test);
var test2 = tie("test2", {$file:{path:'../person.json', sync:true}});
console.log(test2);
test2.age = 12;
console.log(fs.readFileSync('../person.json', 'utf-8'));
test2.name = 'Wolf';
console.log(fs.readFileSync('../person.json', 'utf-8'));

