#!/bin/sh
# Install jsdoc npm install -g git://github.com/jsdoc3/jsdoc.git
rm -R docs
jsdoc src/modules/ README.md -d docs
