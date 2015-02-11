'use strict';

var jquery = require('jquery'),
    jsdom = require('jsdom'),
    async = require('async');

module.exports = function (grunt) {

    grunt.registerMultiTask('yohtml-replace', 'Yohtml preprocessor.', function () {
        var options = this.options({}),
            CONSTS = require('./lib/consts')(options.nsPrefix),
            files = this.filesSrc,
            log = function (msgList) {
                grunt.log.writeln.apply(grunt.log, (msgList instanceof Array) ? msgList : [msgList]);
            },
            index = grunt.file.readJSON(options.index),
            done = this.async(),
            taskSuccess = true,
            handleBlock = function($block, $body, $){
                var params = {},
                    inject = {},
                    blockName = $block.attr(CONSTS.ATTR.YO_BLOCK);
                $block.removeAttr(CONSTS.YO_BLOCK).children().each(function () {
                    var $el = $(this),
                        paramName = $el.prop('tagName').toLowerCase();
                    params[paramName] = {
                        content: $el.html(),
                        $el: $el
                    };
                });
                if (!index[blockName]) {
                    grunt.log.error('Block "' + blockName + '" is not defined');
                    return taskSuccess = false;
                }
                var indexData = index[blockName];
                if (!indexData) {
                    // indexData not found. Let's try to match it accotding to yo-block-match
                    Object.keys(index).some(function(name){
                        if (index[name].match) {
                            var matches = new RegExp(index[name].match, 'g').exec(blockName);
                            if (matches && matches.length) {
                                matches.forEach(function(val, i){
                                    inject[i] = val;
                                })
                                indexData = index[name];
                                return true;
                            }
                        }
                        return false;
                    })
                }
                if (!indexData) {
                    log('Block "' + blockName + '" is not defined');
                    return taskSuccess = false;
                }
                var $newBlock = $(indexData.tpl);
                
                var $newBlock = $(index[blockName].tpl);
                $block.after($newBlock).remove();
                for (var paramName in params) {
                    if (!params.hasOwnProperty(paramName)) continue;
                    if (!indexData.params[paramName]) {
                        grunt.log.error('Paratemer "' + paramName + '" in block "' + blockName  + '" is not defined');
                        return taskSuccess = false;
                    }
                    if (indexData.$el.attr(CONSTS.ATTR.YO_REPLACE) !== undefined) {
                        // REPLACE PARAMETER
                        if (indexData.params[paramName].replace) {
                            // find [yo-param-replace] and replace whole element
                            $newBlock.find('[' + CONSTS.ATTR.RULE_PARAM_REPLACE + ']').replaceWith(params[paramName].content);
                        } else {
                            grunt.log.error('Paratemer "' + paramName + '" in block "' + blockName  + '" is not replaceble');
                            return taskSuccess = false;
                        }
                    } else {
                        // INSERT PARAMETER
                        if (indexData.params[paramName].insert) {
                            // @TODO replace by attr
                            $body.html(
                                $body
                                    .html()
                                    .replace('yo::param::' + paramName.toLowerCase(), params[paramName].content)
                            );
                        } else {
                            grunt.log.error('Paratemer "' + paramName + '" in block "' + blockName  + '" is not insertable');
                            return taskSuccess = false;
                        }
                    }
                }
                // inject additionals. We use {{value}} to inject 'value' in rules
                var content = $body.html();
                Object.keys(inject).forEach(function(key){
                    content = content.replace(new RegExp('{{\\s*' + key + '\\s*}}', 'gmi'), inject[key]);
                })
                $body.html(content);
                return true;
            },
            getTheDeepestBlock = function($, $body){
                var $blocks = $(CONSTS.TAG.MAIN + '[' + CONSTS.ATTR.YO_BLOCK + ']');

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
                                    return filePathAsyncCB('Can\'t handle block');
                                }
                            }
                            grunt.file.write(file.dest + filepath, $body.html());
                        }
                        filePathAsyncCB();
                    });
            }, filesAsyncCb);
        }, function(err){
            if (err) {
                //log('REMOVE log call: ', err);
            } else {
                done(taskSuccess);
            }
        });
    });
};
