'use strict';

var jquery = require('jquery'),
    jsdom = require('jsdom'),
    async = require('async'),
    BLOCK = 'block',
    PARAM = 'param',
    TAG_DELIMETER = '-',
    PLACEHOLDER_DELIMITER = '::',
    getFirstCommentValueFromEl = function ($el) {
        var value = $el.contents().filter(function () {
            return this.nodeType === 8;
        }).get(0).nodeValue;
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
            blockAttrName = options.nsPrefix + TAG_DELIMETER + BLOCK,
            paramAttrName = options.nsPrefix + TAG_DELIMETER + PARAM,
            paramReplacePlacaholder = options.nsPrefix + PLACEHOLDER_DELIMITER + PARAM,
            files = this.filesSrc,
            successCallback = function (msg) {
                grunt.log.writeln(msg);
            },
            errorCallback = function (msg) {
                grunt.log.writeln(msg);
            },
            log = function(msgList) {
                grunt.log.writeln.apply(grunt.log, (msgList instanceof Array) ? msgList : [msgList]);
            },
            index = {},
            done = this.async();

        this.files.forEach(function(file){

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

                            $block.removeAttr(paramAttrName);
                            blockIndex.description = blockDescription;

                            $('[' + paramAttrName + ']').each(function (i, e) {
                                    var $e = $(e),
                                        paramName = $(e).attr(paramAttrName),
                                        paramDescription = getFirstCommentValueFromEl($e);
                                    if (!paramDescription) {
                                        return callback('Параметр не задокументирован');
                                    }
                                    $e.removeAttr(paramAttrName).text(paramReplacePlacaholder + PLACEHOLDER_DELIMITER + paramName);
                                    blockIndex.params[paramName] = {
                                        description: paramDescription
                                    };
                                }
                            );
                            blockIndex.tpl = getUTplFromEl($block, $);
                            index[blockName] = blockIndex;
                            callback();
                        }
                    });
            }, function (err) {
                if (err) {
                    log(err);
                } else {
                    grunt.file.write(file.dest + '/bobtail-index.json', JSON.stringify(index), {encoding: 'utf8'});
                    grunt.file.write(file.dest + '/bobtail-index.jsonp', 'var INDEX = ' + JSON.stringify(index), {encoding: 'utf8'});
                }
                done();
            });
        });

    });

};
