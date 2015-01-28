'use strict';

var jquery = require('jquery'),
    jsdom = require('jsdom'),
    async = require('async'),
    PARAM = 'param',
    PLACEHOLDER_DELIMITER = '::';

module.exports = function (grunt) {

    grunt.registerMultiTask('bobtail-replace', 'Bobtail preprocessor.', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
                nsPrefix: 'bt',
                tagName: 'bobtail'
            }),
            files = this.filesSrc,
            log = function (msgList) {
                grunt.log.writeln.apply(grunt.log, (msgList instanceof Array) ? msgList : [msgList]);
            },
            successCallback = function (msg) {
                log(msg);
            },
            errorCallback = function (msg) {
                log(msg);
            },
            index = grunt.file.readJSON(options.index),
            done = this.async();
        this.files.forEach(function (file) {
            async.each(file.src, function (filepath, callback) {
                jsdom.env(grunt.file.read(filepath, {encoding: 'utf8'}),
                    ['./lib/jquery.js'],
                    function (errors, window) {
                        if (errors) {
                            errorCallback(errors);
                        } else {
                            for (var blockName in index) {
                                var $ = window.$;
                                if (index.hasOwnProperty(blockName)) {
                                    var $block = $(options.tagName + '[block=' + blockName + ']');
                                    if (!$block.length) continue;
                                    var params = {};
                                    $block.children().each(function (el) {
                                        var $el = $(this),
                                            paramName = $el.prop('tagName');
                                        params[paramName] = {
                                            content: $el.html()
                                        };
                                    });
                                    $block.replaceWith(index[blockName].tpl);
                                    var $body = $('body');
                                    for (var paramName in params) {
                                        if (!params.hasOwnProperty(paramName)) continue;
                                        $body.html(
                                            $body
                                                .html()
                                                .replace(options.nsPrefix + PLACEHOLDER_DELIMITER + PARAM + PLACEHOLDER_DELIMITER + paramName.toLowerCase(), params[paramName].content)
                                        );
                                    }
                                    grunt.file.write(file.dest + filepath, $body.html());
                                }
                            }
                        }
                        callback();
                    });
            }, function (err) {
                if (err) return log(err);
                done();
            });
        });
    });
};
