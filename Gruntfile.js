'use strict';

module.exports = function(grunt) {

    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);

    // Automatically load required Grunt tasks
    require('jit-grunt')(grunt, {
        ngtemplates: 'grunt-angular-templates'
    });

    var appConfig = {
        app: require('./bower.json').appPath || 'src',
        dist: 'dist'
    };

    grunt.initConfig({
        // App config
        project: appConfig,

        // Clean tasks
        clean: {
            // Clean dist folder
            dist: {
                files: [{
                    dot: true,
                    src: [
                        '.tmp',
                        '<%= project.dist %>/{,*/}*',
                        '!<%= project.dist %>/.git{,*/}*'
                    ]
                }]
            }
        },

        // Copy tasks
        copy: {
            // Copy to dist folder
            dist: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= project.app %>/',
                    dest: '.tmp',
                    src: [
                        'd3GraphDirective.js',
                        'd3.css'
                    ]
                }]
            }
        },

        // Lint the javascript code
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            all: {
                src: [
                    'Gruntfile.js',
                    '<%= project.app %>/{,*/}*.js'
                ]
            }
        },

        // Annotate for uglify tasks
        ngAnnotate: {
            // Annotate dist
            dist: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '.tmp/',
                    src: '*.js',
                    dest: '.tmp/'
                }]
            }
        },

        // Uglify code tasks
        uglify: {
            // Uglify dist
            dist: {
                files: {
                    '<%= project.dist %>/d3GraphDirective.min.js': ['.tmp/d3GraphDirective.js']
                },
                options: {
                    mangle: true
                }
            }
        },

        // Minify css tasks
        cssmin: {
            // Minify dist css
            dist: {
                files: {
                    '<%= project.dist %>/d3.min.css': ['.tmp/d3.css']
                }
            }
        }
    });

    // Build task
    grunt.registerTask('build', 'Build the library d3Graph and minify it for production use.' , [
        'jshint:all',
        'clean:dist',
        'copy:dist',
        'ngAnnotate:dist',
        'uglify:dist',
        'cssmin:dist'
    ]);
};