'use strict';

var jquery = require('jquery'),
    jsdom = require('jsdom'),
    async = require('async'),
    PARAM = 'param',
    BLOCK = 'block',
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
            done = this.async(),
            handleBlock = function($block, $body, $){
                var params = {},
                    blockName = $block.attr(BLOCK);
                $block.removeAttr(BLOCK).children().each(function (el) {
                    var $el = $(this),
                        paramName = $el.prop('tagName');
                    params[paramName] = {
                        content: $el.html()
                    };
                });
                $block.replaceWith(index[blockName].tpl);
                for (var paramName in params) {
                    if (!params.hasOwnProperty(paramName)) continue;
                    $body.html(
                        $body
                            .html()
                            .replace(options.nsPrefix + PLACEHOLDER_DELIMITER + PARAM + PLACEHOLDER_DELIMITER + paramName.toLowerCase(), params[paramName].content)
                    );
                }
            },
            getTheDeepestBlock = function($, $body){
                var $blocks = $(options.tagName + '[block]');
                if (!$blocks.length) {
                    return false;
                } else if ($blocks.length === 1) {
                    return $blocks.eq(0);
                } else {
                    return Array.prototype.reduce.call($blocks, function(el1, el2) {
                        el1.data('nestingLevel') = el1.data('nestingLevel') || $(el1).parentsUntil($body).length;
                        el2.data('nestingLevel') = el2.data('nestingLevel') || $(el2).parentsUntil($body).length;
                        return el2.data('nestingLevel') > el1.data('nestingLevel') ? el2 : el1;
                    });
                }
            };

        async.each(this.files, function(file, filesAsyncCb){
            async.each(file.src, function (filepath, filePathAsyncCB) {
                jsdom.env(grunt.file.read(filepath, {encoding: 'utf8'}),
                    ['./lib/jquery.js'],
                    function (errors, window) {
                        if (errors) {
                            errorCallback(errors);
                        } else {
                            var $ = window.$,
                                blocks = {},
                                $body = $('body'),
                                $block = null;
                            while (($block = getTheDeepestBlock($, $body))) {
                                handleBlock($block, $body, $);
                            }
                            grunt.file.write(file.dest + filepath, $body.html());
                        }
                        filePathAsyncCB();
                    });
            }, filesAsyncCb);
        }, function(){
            done();
        });
    });
};
