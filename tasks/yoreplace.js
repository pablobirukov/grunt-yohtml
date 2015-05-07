'use strict';

var jsdom = require('jsdom'),
  async = require('async');

module.exports = function (grunt) {

  grunt.registerMultiTask('yoreplace', 'Yohtml preprocessor.', function () {
    var options = this.options({}),
      jquery = options['jquery'] ? options['jquery'] : '../node_modules/jquery/dist/jquery.js',
      CONSTS = require('./lib/consts')(options.nsPrefix),
      files = this.filesSrc,
      log = function (msgList) {
        grunt.log.writeln.apply(grunt.log, (msgList instanceof Array) ? msgList : [msgList]);
      },
      index = grunt.file.readJSON(options.index),
      done = this.async(),
      taskSuccess = true,
      mergeAttrs = function (attr1, attr2) {
        return attr1 + ' ' + attr2;
      },
      enrichBlockWithAttributesOfAnotherBlock_booya_ = function ($poorBlock, $richBlock) {
        /**
         * forward $richBlock attributes (of course except of "yo-*" attrs) to $poorBlock file
         */
        Array.prototype.forEach.call($richBlock[0].attributes, function (attr) {
          var attrName = attr.name;
          if (attrName.indexOf(CONSTS.DEFAULT_PREFIX + CONSTS.TAG_DELIMETER) !== 0) {

            if ($poorBlock.attr(attrName)) {
              var mergedAttr = mergeAttrs($poorBlock.attr(attrName), attr.value);
              $poorBlock.attr(attrName, mergedAttr);
            } else {
              $poorBlock.attr(attrName, attr.value);
            }
          }
        });
      },

      getMatches = function (pattern, blockMatch) {
        return new RegExp(pattern, 'g').exec(blockMatch);
      },
      getInjects = function (matches) {
        var injects = {};
        matches.forEach(function (val, i) {
          injects[i] = val;
        });
        return injects
      },

      doReplace = function (indexData, param, content) {

      },
      hasReplace = function (param) {
        return param.$el.attr(CONSTS.ATTR.RULE_PARAM_REPLACE) ? true : false
      },
      handleParams = function (indexData, params) {

      },

      handleBlock = function ($block, $body, $) {
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

        if (blockMatch) {
          Object.keys(index).forEach(function (name) {
            if (index[name].match) {
              var matches = getMatches(index[name].match, blockMatch);
              if (matches && matches.length) {
                indexData = index[name];
                return injects = getInjects(matches);
              }
            }
            return false;
          });
        }

        if (!indexData) {
          grunt.log.error('Block "' + blockName + '" is not defined');
          return taskSuccess = false;
        }

        var $newBlock = $('<div>' + indexData.tpl + '</div>');

        enrichBlockWithAttributesOfAnotherBlock_booya_($newBlock.children(), $block);

        for (var pName in params) {
          if (!params.hasOwnProperty(pName)) continue;

          if (!indexData.params[pName]) {
            grunt.log.error('Paratemer "' + pName + '" in block "' + blockName + '" is not defined');
            return taskSuccess = false;
          }

            if (indexData.params[pName].replace) {
              // REPLACE PARAMETER

              if (indexData.params[pName].replace && params[pName].content !== '') {
                // find [yo-param-replace] and replace whole element
                $newBlock.find('[' + CONSTS.ATTR.RULE_PARAM_REPLACE + ']').replaceWith(params[pName].content);
              } else if (params[pName].content == '') {
                $newBlock.find('[' + CONSTS.ATTR.RULE_PARAM_REPLACE + ']').remove();
              } else {
                grunt.log.error('Paratemer "' + pName + '" in block "' + blockName + '" is not replaceble');
                return taskSuccess = false;
              }
            } else {
              // COMPLEX INSERT
              if (indexData.params[pName].insert && params[pName].content !== '') {
                var $el = $newBlock.find('[' + CONSTS.ATTR.RULE_PARAM_INSERT + '="' + pName + '"]').html(params[pName].content);
                enrichBlockWithAttributesOfAnotherBlock_booya_($el, params[pName].$el);
              } else if (!indexData.params[pName].insert && params[pName].content !== '') {
                // SIMPLE INSERT
                $el = $newBlock.find('[' + CONSTS.ATTR.RULE_PARAM + '="' + pName + '"]').html(params[pName].content);
                enrichBlockWithAttributesOfAnotherBlock_booya_($el, params[pName].$el);
              } else if (params[pName].content == '') {
                $newBlock.find('[' + CONSTS.ATTR.RULE_PARAM + '="' + pName + '"]').remove();
              }
              else {
                grunt.log.error('Paratemer "' + pName + '" in block "' + blockName + '" is not insertable');
                return taskSuccess = false;
              }
            }
        }
        var content = $newBlock.html();
        // inject additionals. We use {{value}} to inject 'value' in rules
        Object.keys(injects).forEach(function (key) {
          content = content.replace(new RegExp('{{\\s*' + key + '\\s*}}', 'gmi'), injects[key]);
        });
        getTheDeepestBlock($, $body).replaceWith(cleanYoMatchAttr($(content)));
        // clear html from yo-attributes
        $('[' + CONSTS.ATTR.YO_PARAM + ']').removeAttr(CONSTS.ATTR.YO_PARAM);
        $('[' + CONSTS.ATTR.RULE_PARAM_INSERT + ']').removeAttr(CONSTS.ATTR.RULE_PARAM_INSERT);
        $('[' + CONSTS.ATTR.RULE_PARAM_REPLACE + ']').removeAttr(CONSTS.ATTR.RULE_PARAM_REPLACE);
        return true;
      },
      cleanYoMatchAttr = function ($node) {
        return $node.removeAttr(CONSTS.ATTR.RULE_BLOCK_MATCH);
      },
      getTheDeepestBlock = function ($, $body) {
        var $blocks = $(CONSTS.TAG.MAIN + '[' + CONSTS.ATTR.YO_BLOCK + ']');
        if (!$blocks.length) {
          return false;
        } else if ($blocks.length === 1) {
          return $blocks.eq(0);
        } else {
          return Array.prototype.reduce.call($blocks, function (el1, el2) {
            var $el1 = $(el1),
              $el2 = $(el2);
            $el1.data('nestingLevel', $el1.data('nestingLevel') || $el1.parentsUntil($body).length);
            $el2.data('nestingLevel', $el2.data('nestingLevel') || $el2.parentsUntil($body).length);
            return $el2.data('nestingLevel') > $el2.data('nestingLevel') ? $el2 : $el2;
          });
        }
      };

    async.each(this.files, function (file, filesAsyncCb) {
      async.each(file.src, function (filepath, filePathAsyncCB) {
        jsdom.env(grunt.file.read(filepath, {encoding: 'utf8'}),
          [jquery],
          function (errors, window) {
            if (errors) {
              log(errors);
            } else {
              var $ = window.$,
                blocks = {},
                $body = $('body'),
                $block = null;

              while (($block = getTheDeepestBlock($, $body))) {
                var blockName = $block.attr(CONSTS.ATTR.YO_BLOCK);
                var result = handleBlock($block, $body, $);

                if (!result) {
                  return filePathAsyncCB('Can\'t handle block');
                }
              }
              if (index[blockName]) {
                index[blockName].view = $body.html();
              }
              //View tpl writing
              grunt.file.write(options.index, JSON.stringify(index), {encoding: 'utf8'});
              grunt.file.write(options.indexData, 'var INDEX = ' + JSON.stringify(index), {encoding: 'utf8'});

              //Final template saving
              grunt.file.write(file.dest, $body.html(), {encoding: 'utf8'});
            }
            filePathAsyncCB();
          });
      }, filesAsyncCb);
    }, function (err) {
      if (err) {
        //log('REMOVE log call: ', err);
      } else {
        done(taskSuccess);
      }
    });

  });
};
