'use strict';

var grunt = require('grunt');
//var comment = require('../tasks/lib/comment').init(grunt);

function getIndexObject(filepath) {
  var fileContent = grunt.file.read(filepath);
  try {
    var indexObject = JSON.parse(fileContent);
    return indexObject;
  } catch (e) {
    return false;
  }
}

exports.btIndex = {
  default_options: function(test) {
    test.expect(1);

    var actual = getIndexObject('test/tmp/index.json');
    var expected = getIndexObject('test/expected/index.json');
    test.equal(actual['form-group']['params']['label']['description'], expected['form-group']['params']['label']['description'], 'should check generateg label');

    test.done();
  }
};
