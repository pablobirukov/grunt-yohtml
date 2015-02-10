'use strict';

var jquery = require('jquery'),
    jsdom = require('jsdom'),
    async = require('async'),
    CONSTS = require('./lib/consts');

module.exports = function (grunt) {

    grunt.registerMultiTask('yohtml-replace', 'Yohtml preprocessor.', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
                nsPrefix: CONSTS.NS_PREFIX,
                tagName: CONSTS.TAG_NAME
            }),
            paramReplaceAttrName = options.nsPrefix + CONSTS.TAG_DELIMETER + CONSTS.REPLACE + CONSTS.TAG_DELIMETER + CONSTS.PARAM,
            files = this.filesSrc,
            log = function (msgList) {
                grunt.log.writeln.apply(grunt.log, (msgList instanceof Array) ? msgList : [msgList]);
            },
            index = grunt.file.readJSON(options.index),
            done = this.async(),
            taskSuccess = true,
            handleBlock = function($block, $body, $){
                var params = {},
                    blockName = $block.attr(CONSTS.BLOCK);
                $block.removeAttr(CONSTS.BLOCK).children().each(function () {
                    var $el = $(this),
                        paramName = $el.prop('tagName').toLowerCase();
                    params[paramName] = {
                        content: $el.html(),
                        $el: $el
                    };
                });
                var $newBlock = $(index[blockName].tpl);
                $block.after($newBlock).remove();
                for (var paramName in params) {
                    if (!params.hasOwnProperty(paramName)) continue;
                    if (params[paramName].$el.attr(CONSTS.REPLACE) !== undefined) {
                        // REPLACE PARAMETER
                        if (index[blockName].params[paramName].replace) {
                            $newBlock.find('[' + paramReplaceAttrName + ']').replaceWith(params[paramName].content);
                        } else {
                            log('Paratemer "' + paramName + '" in block "' + blockName  + '" is not replaceble');
                            return taskSuccess = false;
                        }
                    } else {
                        // INSERT PARAMETER
                        if (index[blockName].params[paramName].insert) {
                            $body.html(
                                $body
                                    .html()
                                    .replace(options.nsPrefix + CONSTS.PLACEHOLDER_DELIMITER + CONSTS.PARAM + CONSTS.PLACEHOLDER_DELIMITER + paramName.toLowerCase(), params[paramName].content)
                            );
                        } else {
                            log('Paratemer "' + paramName + '" in block "' + blockName  + '" is not insertable');
                            return taskSuccess = false;
                        }
                    }
                }
                return true;
            },
            getTheDeepestBlock = function($, $body){
                var $blocks = $(options.tagName + '[block]');
                if (!$blocks.length) {
                    return false;
                } else if ($blocks.length === 1) {
                    return $blocks.eq(0);
                } else {
                    return Array.prototype.reduce.call($blocks, function(el1, el2) {
                        var $el1 = $(el1),
                            $el2 = $(el2);
                        $el1.data('nestingLevel', $el1.data('nestingLevel') || $el1.parentsUntil($body).length);
                        $el2.data('nestingLevel', $el2.data('nestingLevel') || $el2.parentsUntil($body).length);
                        return $el2.data('nestingLevel') > $el2.data('nestingLevel') ? $el2 : $el2;
                    });
                }
            };

        async.each(this.files, function(file, filesAsyncCb){
            async.each(file.src, function (filepath, filePathAsyncCB) {
                jsdom.env(grunt.file.read(filepath, {encoding: 'utf8'}),
                    ['./lib/jquery.js'],
                    function (errors, window) {
                        if (errors) {
                            log(errors);
                        } else {
                            var $ = window.$,
                                blocks = {},
                                $body = $('body'),
                                $block = null;
                            while (($block = getTheDeepestBlock($, $body))) {
                                var result = handleBlock($block, $body, $);
                                if (!result) {
                                    filePathAsyncCB('Can\'t handle block');
                                }
                            }
                            grunt.file.write(file.dest + filepath, $body.html());
                        }
                        filePathAsyncCB();
                    });
            }, filesAsyncCb);
        }, function(err){
            if (err) {
                log('REMOVE log call: ', err);
            } else {
                done(taskSuccess);
            }
        });
    });
};
