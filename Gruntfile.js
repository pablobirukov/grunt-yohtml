'use strict';

module.exports = function (grunt) {

    var path = require('path');

    // Project configuration.
    grunt.initConfig({
        jshint: {
            all: [
                'Gruntfile.js',
                'tasks/**/*.js',
                '<%= nodeunit.tests %>'
            ],
            options: {
                jshintrc: '.jshintrc'
            }
        },

        // Before generating any new files, remove any previously-created files.
        clean: {
            tests: ['test/tmp']
        },

        'bobtail-index': {
            files: {
                src: 'test/fixtures/rule_*.html',
                dest: 'test/tmp/'
            }
        },
        'bobtail-replace': {
            files: {
                src: 'fixtures/tpl_*.html',
                dest: 'tmp1/'
                ,cwd: 'test/',
                expand: true,
                flatten: true
            },
            options: {
                index: 'output/index.json'
            }
        },

        // Unit tests.
        nodeunit: {
            tests: ['test/*_test.js']
        }

    });

    // Actually load this plugin's task(s).
    grunt.loadTasks('tasks');

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');

    // Whenever the "test" task is run, first clean the "tmp" dir, then run this
    // plugin's task(s), then test the result.
    grunt.registerTask('test', ['clean', 'bobtail-index', 'nodeunit']);

    // By default, lint and run all tests.
    grunt.registerTask('default', ['jshint', 'test']);

};
