global.test = true;
var tie = require('../lib/tie');
require('../lib/fs')(tie);
var fs = require('fs');


describe('file', function () {
    beforeEach(function (done) {
        fs.writeFile('person.json', '{"style":"color:blue","name":"John","age":25}', 'utf-8', function() {
            done();
        });
    });

    afterEach(function () {
        fs.unlink('person.json', function(){});
    });
    it('should read file', function () {
        var test = tie("test", {$file:'person.json'});
        test.$file.read();
        test.style.should.eql('color:blue', 'style');
    });
    it('should write file', function () {
        var test = tie("test", {$file:'person.json'});
        test.$file.read();
        test.age = 12;
        test.$file.write();
        fs.readFileSync('person.json', 'utf-8').should.eql('{"style":"color:blue","name":"John","age":12}', 'change');
    });
    it('should auto read file', function () {
        var test = tie("test", {$file:{path:'person.json', sync:5000}});
        test.style.should.eql('color:blue', ' auto read style');
    });
    it('should auto write file', function () {
        var test = tie("test", {$file:{path:'person.json', sync:5000}});
        test.age = 12;
        fs.readFileSync('person.json', 'utf-8').should.eql('{"style":"color:blue","name":"John","age":12}', 'auto write change');
    });
    it('should get from file', function (done) {
        var test = tie("test", {$file:{path:'person.json', sync:100}});
        setTimeout(function() {
            //need to modify file at least 1 sec after creation
            fs.writeFileSync('person.json', '{"style":"color:blue","name":"John","age":12}', 'utf-8');
            setTimeout(function() {
                //need to wait for sync interval
                test.age.should.eql(12, 'age from file');
                done();
            }, 200);
        }, 1000);
    });

});
