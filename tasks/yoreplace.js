'use strict';

var jquery = require('jquery'),
    jsdom = require('jsdom'),
    async = require('async');

module.exports = function (grunt) {

    grunt.registerMultiTask('yoreplace', 'Yohtml preprocessor.', function () {
        var options = this.options({}),
            CONSTS = require('./lib/consts')(options.nsPrefix),
            files = this.filesSrc,
            log = function (msgList) {
                grunt.log.writeln.apply(grunt.log, (msgList instanceof Array) ? msgList : [msgList]);
            },
            index = grunt.file.readJSON(options.index),
            done = this.async(),
            taskSuccess = true,
            enrichBlockWithAttributesOfAnotherBlock_booya_ = function($poorBlock, $richBlock){
                /**
                 * forward $richBlock attributes (of course except of "yo-*" attrs) to $poorBlock file
                 */
                Array.prototype.forEach.call($richBlock[0].attributes, function(attr){
                    var attrName = attr.name;
                    if (attrName.indexOf(CONSTS.DEFAULT_PREFIX + CONSTS.TAG_DELIMETER) !== 0) {
                        $poorBlock.attr(attrName, attr.value);
                    }
                });
            },
            handleBlock = function($block, $body, $){
                var params = {},
                    injects = {},
                    blockName = $block.attr(CONSTS.ATTR.YO_BLOCK),
                    blockMatch = $block.attr(CONSTS.ATTR.RULE_BLOCK_MATCH);

                $block.children().each(function () {

                    var $el = $(this),
                        paramName = $el.prop('tagName').toLowerCase();

                    params[paramName] = {
                        content: $el.html(),
                        $el: $el
                    };

                });
                var indexData = index[blockName];
                //if (!indexData) {
                    // indexData not found. Let's try to match it according to yo-block-match
                    Object.keys(index).some(function(name){
                        if (index[name].match) {
                            var matches = new RegExp(index[name].match, 'g').exec(blockMatch);
                            if (matches && matches.length) {
                                matches.forEach(function(val, i){
                                    injects[i] = val;
                                });
                                indexData = index[name];
                                return true;
                            }
                        }
                        return false;
                    });
                //}
                if (!indexData) {
                    grunt.log.error('Block "' + blockName + '" is not defined');
                    return taskSuccess = false;
                }
                var $newBlock = $('<div>' + indexData.tpl + '</div>');
                enrichBlockWithAttributesOfAnotherBlock_booya_($newBlock.children(), $block);
                for (var pName in params) {
                    if (!params.hasOwnProperty(pName)) continue;
                    if (!indexData.params[pName]) {
                        grunt.log.error('Paratemer "' + pName + '" in block "' + blockName  + '" is not defined');
                        return taskSuccess = false;
                    }
                    if (params[pName].$el.attr(CONSTS.ATTR.YO_REPLACE) !== undefined) {
                        // REPLACE PARAMETER

                        if (indexData.params[pName].replace && params[pName].content !== '') {
                            // find [yo-param-replace] and replace whole element
                            $newBlock.find('[' + CONSTS.ATTR.RULE_PARAM_REPLACE + ']').replaceWith(params[pName].content);
                        } else if (params[pName].content == '') {
                            $newBlock.find('[' + CONSTS.ATTR.RULE_PARAM_REPLACE + ']').remove();
                        } else {
                            grunt.log.error('Paratemer "' + pName + '" in block "' + blockName  + '" is not replaceble');
                            return taskSuccess = false;
                        }
                    } else {
                        // INSERT PARAMETER
                        if (indexData.params[pName].insert && params[pName].content !== '') {
                            var $el = $newBlock.find('[' + CONSTS.ATTR.RULE_PARAM_INSERT + '="' + pName + '"]').html(params[pName].content);
                            enrichBlockWithAttributesOfAnotherBlock_booya_($el, params[pName].$el);
                        } else if (params[pName].content == '') {
                            $newBlock.find('[' + CONSTS.ATTR.RULE_PARAM_INSERT + '="' + pName + '"]').remove();
                        }
                        else {
                            grunt.log.error('Paratemer "' + pName + '" in block "' + blockName  + '" is not insertable');
                            return taskSuccess = false;
                        }
                    }
                }
                // inject additionals. We use {{value}} to inject 'value' in rules
                //var content = $('<div />').append($newBlock.eq(0).clone()).html();
                var content = $newBlock.html();
                Object.keys(injects).forEach(function(key){
                    content = content.replace(new RegExp('{{\\s*' + key + '\\s*}}', 'gmi'), injects[key]);
                });
                getTheDeepestBlock($, $body).replaceWith(content);
                //$(CONSTS.TAG.MAIN + '[' + CONSTS.ATTR.YO_BLOCK + '="' + blockName + '"]').replaceWith(content);

                // clear html from yo-attributes
                $('[' + CONSTS.ATTR.RULE_PARAM_INSERT + ']').removeAttr(CONSTS.ATTR.RULE_PARAM_INSERT);
                $('[' + CONSTS.ATTR.RULE_PARAM_REPLACE + ']').removeAttr(CONSTS.ATTR.RULE_PARAM_REPLACE);
                $('[' + CONSTS.ATTR.RULE_BLOCK_MATCH + ']').removeAttr(CONSTS.ATTR.RULE_BLOCK_MATCH);
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
                            grunt.file.write(file.dest, $body.html());
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
