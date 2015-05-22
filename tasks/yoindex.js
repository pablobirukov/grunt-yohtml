'use strict';
module.exports = function (grunt) {

  var cheerio = require('cheerio'),
    async = require('async'),
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

  grunt.registerMultiTask('yoindex', 'Yohtml index file builder.', function () {
    var options = this.options({}),
      jquery = options['jquery'] ? options['jquery'] : '../node_modules/jquery/dist/jquery.js',
      CONSTS = require('./lib/consts')(options.nsPrefix),
      files = this.filesSrc,
      externalCss = options['externalCss'] ? options['externalCss'] : null,

      successCallback = function (msg) {
        grunt.log.writeln(msg);
      },
      errorCallback = function (msg) {
        grunt.log.writeln(msg);
      },
      log = function (msgList) {
        grunt.log.writeln.apply(grunt.log, (msgList instanceof Array) ? msgList : [msgList]);
      },
      usages = {},
      handleUsageHtml = function (usage) {
        if (usage) {
            var $ = cheerio.load(usage),
            $block = $('[' + CONSTS.ATTR.RULE_BLOCK + ']'),
            blockName = $block.attr(CONSTS.ATTR.RULE_BLOCK);
          usages[blockName] = usage;
        } else {
          errorCallback('Any troubles with usage.');
        }
        return usages;
      },
      index = {},
      done = this.async(),
      taskSuccess = true;

    if(options.usages){
      grunt.file.recurse(options.usages, function (abspath, rootdir, subdir, filename) {
        return handleUsageHtml(grunt.file.read(abspath));
      });
    }

    this.files.forEach(function (file) {
      async.each(file.src, function (filepath, callback) {
        var fileContents = grunt.file.read(filepath, {encoding: 'utf8'}),
        $ = cheerio.load(fileContents);
        var $block = $('[' + CONSTS.ATTR.RULE_BLOCK + ']'),
          blockName = $block.attr(CONSTS.ATTR.RULE_BLOCK),
          blockMatchExpression = $block.attr(CONSTS.ATTR.RULE_BLOCK_MATCH),
          blockDescription = getFirstCommentValueFromEl($block),
          blockIndex = {params: {}, match: blockMatchExpression};

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

        var paramMap = {};

        $('[' + CONSTS.ATTR.RULE_PARAM + ']').each(function () {
          var $this = $(this),
            paramName = $this.attr(CONSTS.ATTR.RULE_PARAM);
          paramMap[paramName] = paramMap[paramName] || {};
          paramMap[paramName].param = $this;
          //CHECK COMPLEX INSERT
          paramMap[paramName].ip = $this.find('[' + CONSTS.ATTR.RULE_PARAM_INSERT + ']').html() !== null;
        });

        $('[' + CONSTS.ATTR.RULE_PARAM_REPLACE + ']').each(function () {
          var $this = $(this),
            paramName = $this.attr(CONSTS.ATTR.RULE_PARAM_REPLACE);
          paramMap[paramName] = paramMap[paramName] || {};
          paramMap[paramName].rp = $this;
        });


        Object.keys(paramMap).forEach(function (paramName) {
          var paramObject = paramMap[paramName],
            paramDescription = getFirstCommentValueFromEl(paramObject.param) || getFirstCommentValueFromEl(paramObject.rp);
          if (!paramDescription) {
            grunt.log.error('Parameter "' + paramName + '" in block "' + blockName + '" is not docummented. ' +
            'The first direct child or parameter must be a comment');
            taskSuccess = false;
            return callback('Undocumented');
          }

          blockIndex.params[paramName] = {
            description: paramDescription,
            insert: paramObject.ip,
            replace: !!paramObject.rp
          };
        });


        blockIndex.tpl = getUTplFromEl($block, $);
        index[blockName] = blockIndex;

        Object.keys(usages).forEach(function (usageKey) {
          if (blockName === usageKey) {
            index[blockName].usage = usages[usageKey];
          }
          /*else {
           grunt.log.error('Usage file for block '+ blockName +' was not found, you must add usage file in /usages folder, for the documentation needs.');
           taskSuccess = false;
           }*/
        });
        callback();

      }, function (err) {
        if (err) {
          log(err);
        } else {
          [
            'index.html',
            'assets/app.css',
            'assets/index.js',
            'assets/jquery.js',
            'assets/microtemplating.js',
            'assets/highlight.pack.js',
            'assets/escape.js'
          ]
            .forEach(function (filepath) {
              grunt.file.copy('./tasks/output_doc/' + filepath, file.dest + filepath);
            });

          if (!!externalCss){
            var externalCssFile = 'external.css';
            grunt.file.copy(externalCss, file.dest + 'assets/' + externalCssFile);
          }

          grunt.file.write(
            file.dest + 'index.json',
            JSON.stringify(index),
            {encoding: 'utf8'}
          );
          grunt.file.write(
            file.dest + 'index.jsonp',
            'var INDEX = ' + JSON.stringify(index),
            {encoding: 'utf8'}
          );
        }
        done(taskSuccess);
      });
    });

  });

};
