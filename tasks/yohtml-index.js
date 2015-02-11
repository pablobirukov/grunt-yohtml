'use strict';
module.exports = function (grunt) {

    var jquery = require('jquery'),
        jsdom = require('jsdom'),
        async = require('async'),
        CONSTS = require('./lib/consts'),
        getFirstCommentValueFromEl = function ($el) {
            var firstComment = $el ? $el.contents().filter(function () {
                return this.nodeType === 8;
            }).get(0) : false;
            if (!firstComment) {
                return false;
            } else {
                return firstComment.nodeValue ? firstComment.nodeValue.trim() : '';
            }
        },
        getUTplFromEl = function ($el, $) {
            $el.contents().filter(function () {
                return this.nodeType === 8;
            }).remove();
            return $("<div />").append($el.clone()).html().replace(/\n/g, '').trim();
        };

    grunt.registerMultiTask('yohtml-index', 'Yohtml index file builder.', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({}),
            CONSTS = CONSTS(options.nsPrefix),
            files = this.filesSrc,
            successCallback = function (msg) {
                grunt.log.writeln(msg);
            },
            errorCallback = function (msg) {
                grunt.log.writeln(msg);
            },
            log = function (msgList) {
                grunt.log.writeln.apply(grunt.log, (msgList instanceof Array) ? msgList : [msgList]);
            },
            index = {},
            done = this.async(),
            taskSuccess = true;

        this.files.forEach(function (file) {

            async.each(file.src, function (filepath, callback) {

                jsdom.env(grunt.file.read(filepath, {encoding: 'utf8'}),
                    ['./lib/jquery.js'],
                    function (errors, window) {
                        if (errors) {
                            errorCallback(errors);
                        } else {
                            var $ = window.$,
                                $block = $('[' + CONSTS.ATTR.RULE_BLOCK + ']'),
                                blockName = $block.attr(CONSTS.ATTR.RULE_BLOCK),
                                blockDescription = getFirstCommentValueFromEl($block),
                                blockIndex = {params: {}};
                            if (!blockDescription) {
                                grunt.log.error('Block "' + blockName + '" is not documented. ' +
                                'The first direct child or block must be a comment');
                                taskSuccess = false;
                                return callback('Block undocumented');
                            }

                            $block.removeAttr(CONSTS.ATTR.RULE_BLOCK);
                            blockIndex.description = blockDescription;

                            /**
                             * paramMap[parameterName][ip]  – insert parameter
                             * paramMap[parameterName][rp]   – replace parameter
                             * @type {{}}
                             */

                            var paramMap = {},
                                $paramsReplaceList = $('[' + CONSTS.ATTR.RULE_PARAM_REPLACE + ']').each(function () {
                                    var $this = $(this),
                                        paramName = $this.attr(CONSTS.ATTR.RULE_PARAM_REPLACE);
                                    paramMap[paramName] = paramMap[paramName] || {};
                                    paramMap[paramName].rp = $this;
                                }),
                                $paramList = $('[' + CONSTS.ATTR.RULE_PARAM + ']').each(function () {
                                    var $this = $(this),
                                        paramName = $this.attr(CONSTS.ATTR.RULE_PARAM);
                                    paramMap[paramName] = paramMap[paramName] || {};
                                    paramMap[paramName].ip = $this;
                                });
                            for (var paramName in paramMap) {
                                if (!paramMap.hasOwnProperty(paramName)) continue;
                                var paramObject = paramMap[paramName],
                                    paramDescription = getFirstCommentValueFromEl(paramObject.ip) || getFirstCommentValueFromEl(paramObject.rp);
                                if (!paramDescription) {
                                    grunt.log.error('Parameter "' + paramName + '" in block "' + blockName + '" is not docummented. ' +
                                    'The first direct child or parameter must be a comment');
                                    taskSuccess = false;
                                    return callback('Parameter undocumented');
                                }
                                if (paramObject.ip) {
                                    paramObject.ip.removeAttr(CONSTS.ATTR.RULE_PARAM).text('yo::param::' + paramName);
                                }
                                blockIndex.params[paramName] = {
                                    description: paramDescription,
                                    insert: !!paramObject.ip,
                                    replace: !!paramObject.rp
                                };
                            }
                            blockIndex.tpl = getUTplFromEl($block, $);
                            index[blockName] = blockIndex;
                            callback();
                        }
                    });
            }, function (err) {
                if (err) {
                    log(err);
                } else {
                    ['index.html', 'assets/app.css', 'assets/index.js', 'assets/jquery.js', 'assets/microtemplating.js']
                        .forEach(function (filepath) {
                            grunt.file.copy('./tasks/output_doc/' + filepath, file.dest + filepath)
                        });
                    grunt.file.write(file.dest + 'index.json', JSON.stringify(index), {encoding: 'utf8'});
                    grunt.file.write(file.dest + 'index.jsonp', 'var INDEX = ' + JSON.stringify(index), {encoding: 'utf8'});
                }
                done(taskSuccess);
            });
        });

    });

};
