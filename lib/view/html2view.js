/*
 * HTML Parser
 * Original code by John Resig
 * http://ejohn.org/files/htmlparser.js
 *
 * // Use like so:
 * HTMLParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     text: function(text) {},
 * });
 */

(function (module) {

    function makeMap(str) {
        var obj = {}, items = str.split(",");
        for (var i = 0; i < items.length; i++) {
            obj[items[i]] = true;
        }
        return obj;
    }

    // Regular Expressions for parsing tags and attributes
    var startTag = /^<([-A-Za-z0-9_]+)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
        endTag = /^<\/([-A-Za-z0-9_]+)[^>]*>/,
        attr = /([-A-Za-z0-9_]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g;

    // Empty Elements - HTML 4.01
    var empty = makeMap("area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed");

    // Block Elements - HTML 4.01
    var block = makeMap("address,applet,blockquote,button,center,dd,del,dir,div,dl,dt,fieldset,form,frameset,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,p,pre,script,table,tbody,td,tfoot,th,thead,tr,ul");

    // Inline Elements - HTML 4.01
    var inline = makeMap("a,abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");

    // Elements that you can, intentionally, leave open
    // (and which close themselves)
    var closeSelf = makeMap("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr");

    // Attributes that have their values filled in disabled="disabled"
    var fillAttrs = makeMap("checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected");

    // Special Elements (can contain anything)
    var special = makeMap("script,style");

    var HTMLParser = function (html, handler) {
        var index, content, match, stack = [], last = html;
        stack.last = function () {
            return this[ this.length - 1 ];
        };

        while (html) {
            content = true;
            // Make sure we're not in a script or style element
            if (!stack.last() || !special[ stack.last() ]) {
                // Comment
                if (html.indexOf("<!--") == 0) {
                    index = html.indexOf("-->");
                    if (index >= 0) {
                        html = html.substring(index + 3);
                        content = false;
                    }
                    // end tag
                } else if (html.indexOf("</") == 0) {
                    match = html.match(endTag);
                    if (match) {
                        html = html.substring(match[0].length);
                        match[0].replace(endTag, parseEndTag);
                        content = false;
                    }
                    // start tag
                } else if (html.indexOf("<") == 0) {
                    match = html.match(startTag);
                    if (match) {
                        html = html.substring(match[0].length);
                        match[0].replace(startTag, parseStartTag);
                        content = false;
                    }
                }
                //content
                if (content) {
                    index = html.indexOf("<");
                    var text = index < 0 ? html : html.substring(0, index);
                    html = index < 0 ? "" : html.substring(index);
                    if (handler.text) {
                        handler.text(text);
                    }
                }

            } else {
                html = html.replace(new RegExp("(.*)<\/" + stack.last() + "[^>]*>"), function (all, text) {
                    text = text.replace(/<!--(.*?)-->/g, "$1")
                        .replace(/<!\[CDATA\[(.*?)]]>/g, "$1");
                    if (handler.text) {
                        handler.text(text);
                    }
                    return "";
                });
                parseEndTag("", stack.last());
            }
            if (html == last) {
                throw "Parse Error: " + html;
            }
            last = html;
        }

        // Clean up any remaining tags
        parseEndTag();

        function parseStartTag(tag, tagName, rest, unary) {
            tagName = tagName.toLowerCase();
            if (block[tagName]) {
                while (stack.last() && inline[stack.last()]) {
                    parseEndTag("", stack.last());
                }
            }

            if (closeSelf[tagName] && stack.last() == tagName) {
                parseEndTag("", tagName);
            }

            unary = empty[tagName] || !!unary;

            if (!unary) {
                stack.push(tagName);
            }

            if (handler.start) {
                var attrs = [];
                rest.replace(attr, function (match, name) {
                    var value = arguments[2] ? arguments[2] :
                        arguments[3] ? arguments[3] :
                            arguments[4] ? arguments[4] :
                                fillAttrs[name] ? name : "";

                    attrs.push({
                        name: name,
                        value: value,
                        escaped: value.replace(/(^|[^\\])"/g, '$1\\\"') //"
                    });
                });

                if (handler.start) {
                    handler.start(tagName, attrs, unary);
                }
            }
        }

        function parseEndTag(tag, tagName) {
            // If no tag name is provided, clean shop
            if (!tagName) {
                var pos = 0;
            }

            // Find the closest opened tag of the same type
            else {
                for (pos = stack.length - 1; pos >= 0; pos--) {
                    if (stack[ pos ] == tagName) {
                        break;
                    }
                }
            }

            if (pos >= 0) {
                // Close all the open elements, up the stack
                for (var i = stack.length - 1; i >= pos; i--) {
                    if (handler.end) {
                        handler.end(stack[i]);
                    }
                }

                // Remove the open elements from the stack
                stack.length = pos;
            }
        }
    };

   var html2view = function (html) {
        var children = [];
        var stack = [];

        HTMLParser(html, {
            start: function (tag, attrs) {
                var o = {$tag: tag, $children: []};
                for (var i = 0; i < attrs.length; i++) {
                    o[attrs[i].name] = attrs[i].value;
                }
                stack.push(o);
            },
            end: function () {
                var o = stack.pop();
                if(o.$children.length == 0) {
                    delete o.$children;
                }
                if (stack.length == 0) {
                    children.push(o);
                } else {
                    stack[stack.length - 1].$children.push(o);
                }
            },
            text: function (text) {
                stack[stack.length - 1].value = text;
            }
        });
        return children;
    };

    module.tie.pipe('html', function(obj, params) {
        obj.$view = {$children: html2view(params[0])}
    });

})(typeof exports === 'object' ? module : window);

