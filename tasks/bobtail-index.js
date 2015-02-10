'use strict';

var jquery = require('jquery'),
    jsdom = require('jsdom'),
    async = require('async'),
    CONSTS = require('./lib/consts'),
    getFirstCommentValueFromEl = function ($el) {
        var value = $el ? $el.contents().filter(function () {
            return this.nodeType === 8;
        }).get(0).nodeValue : false;
        return value ? value.trim() : '';
    },
    getUTplFromEl = function ($el, $) {
        $el.contents().filter(function () {
            return this.nodeType === 8;
        }).remove();
        return $("<div />").append($el.clone()).html().replace(/\n/g, '').trim();
    };

module.exports = function (grunt) {

    grunt.registerMultiTask('bobtail-index', 'Concatenate files.', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
                nsPrefix: 'bt'
            }),
            blockAttrName = options.nsPrefix + CONSTS.TAG_DELIMETER + CONSTS.BLOCK,
            paramAttrName = options.nsPrefix + CONSTS.TAG_DELIMETER + CONSTS.PARAM,
            paramReplaceAttrName = options.nsPrefix + CONSTS.TAG_DELIMETER + CONSTS.REPLACE + CONSTS.TAG_DELIMETER + CONSTS.PARAM,
            paramReplacePlacaholder = options.nsPrefix + CONSTS.PLACEHOLDER_DELIMITER + CONSTS.PARAM,
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
            done = this.async();

        this.files.forEach(function (file) {

            async.each(file.src, function (filepath, callback) {

                jsdom.env(grunt.file.read(filepath, {encoding: 'utf8'}),
                    ['./lib/jquery.js'],
                    function (errors, window) {
                        if (errors) {
                            errorCallback(errors);
                        } else {
                            var $ = window.$,
                                $block = $('[' + blockAttrName + ']'),
                                blockName = $block.attr(blockAttrName),
                                blockDescription = getFirstCommentValueFromEl($block),
                                blockIndex = {params: {}};
                            if (!blockDescription) {
                                return callback('Блок не задокументирован');
                            }

                            $block.removeAttr(blockAttrName);
                            blockIndex.description = blockDescription;

                            /**
                             * paramMap[parameterName][ip]  – insert parameter
                             * paramMap[parameterName][rp]   – replace parameter
                             * @type {{}}
                             */

                            var paramMap = {},
                                $paramsReplaceList = $('[' + paramReplaceAttrName + ']').each(function () {
                                    var $this = $(this),
                                        paramName = $this.attr(paramReplaceAttrName);
                                    paramMap[paramName] = paramMap[paramName] || {};
                                    paramMap[paramName].rp = $this;
                                }),
                                $paramList = $('[' + paramAttrName + ']').each(function () {
                                    var $this = $(this),
                                        paramName = $this.attr(paramAttrName);
                                    paramMap[paramName] = paramMap[paramName] || {};
                                    paramMap[paramName].ip = $this;
                                });
                            for (var paramName in paramMap) {
                                if (!paramMap.hasOwnProperty(paramName)) continue;
                                var paramObject = paramMap[paramName],
                                    paramDescription = getFirstCommentValueFromEl(paramObject.ip) || getFirstCommentValueFromEl(paramObject.rp);
                                if (!paramDescription) {
                                    return callback('Параметр' + paramName + ' не задокументирован');
                                }
                                if (paramObject.ip) {
                                    paramObject.ip.removeAttr(paramAttrName).text(paramReplacePlacaholder + CONSTS.PLACEHOLDER_DELIMITER + paramName);
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
                    grunt.file.write(file.dest + 'bobtail-index.json', JSON.stringify(index), {encoding: 'utf8'});
                    grunt.file.write(file.dest + 'bobtail-index.jsonp', 'var INDEX = ' + JSON.stringify(index), {encoding: 'utf8'});
                }
                done();
            });
        });

    });

};
