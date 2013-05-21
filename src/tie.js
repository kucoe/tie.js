(function(window){
    var tie = function(){
        var ties = {};
        return function(name, tiedObject, dependencies){
            return tie.prototype.init(name, tiedObject, dependencies, ties);
        }
    };
    tie.prototype = {
        select : function(tieName) {
            var nodes = window.document.querySelectorAll('[data-tie="'+tieName+'"]');
            if(nodes.length > 0) {
                return nodes[0];
            }
            return null;
        },
        deep : function(obj) {
            return obj;
        },
        resolve : function (tied, dependencies, ties) {
            if(!dependencies) {
                return;
            }
            for(var i = 0; i < dependencies.length; i ++) {
                var dep = dependencies[i];
                if(ties[dep]){
                    tied._[dep] = ties[dep]._;
                }
            }
        },
        init: function(name, tiedObject, dependencies, ties){
            var r = {
                _ : this.deep(tiedObject),
                $ : this.select(name),
                render : function() {
                    var attrs = tiedObject.attributes;
                    if(!this.$) {
                        throw new Error("Element missing");
                    }
                    if(attrs) {
                        for(var i = 0; i < attrs.length; i ++) {
                            var attr = attrs[i];
                            var val = attr.value;
                            if(typeof val === "function") {
                                val = val.call(r, tiedObject);
                            }
                            var name = attr.name;
                            if('text' === name) {
                                r.$.innerHTML = val;
                            } else {
                                r.$.setAttribute(name, val);
                            }
                        }
                    }
                }

            };
            this.resolve(r, dependencies, ties);
            ties[name] = r;
            r.render();
            return r;
        }
    };
    window.tie = tie();
})(window);