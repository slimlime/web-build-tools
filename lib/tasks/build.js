'use strict';
var BuildTasks = (function () {
    function BuildTasks() {
    }
    BuildTasks.registerTasks = function (build, options) {
        var dependencies = [];
        var path = require('path');
        var ts = require('gulp-typescript');
        var fs = require('fs');
        var gulp = build.gulp;
        var paths = options.paths;
        var tsConfig;
        var tsConfigPath = path.resolve(build.rootDir, 'tsconfig.json');
        var plumber = require('gulp-plumber');
        var useLint = options.isLintingEnabled;
        var chalk = require('chalk');
        var destChanged = require('gulp-changed');
        if (fs.existsSync(tsConfigPath)) {
            tsConfig = require(tsConfigPath);
        }
        else {
            tsConfig = require('../../tsconfig.json');
        }
        var tsProject = ts.createProject(tsConfig.compilerOptions);
        if (paths.sourceMatch) {
            dependencies.push('build-ts');
            build.task('build-ts', function () {
                var merge = require('merge2');
                var lint = require('gulp-tslint');
                var errorCount = 0;
                var sourceStream = gulp.src(paths.sourceMatch);
                if (useLint) {
                    sourceStream = sourceStream
                        .pipe(lint({
                        configuration: options.lintConfig
                    }))
                        .pipe(lint.report('prose', {
                        emitError: false
                    }));
                }
                sourceStream = sourceStream
                    .pipe(destChanged(options.paths.libFolder, { extension: '.js' }));
                var tsResult = sourceStream.pipe(ts(tsProject, undefined, ts.reporter.nullReporter()));
                var mergedStream = merge([
                    tsResult.js.pipe(gulp.dest(paths.libFolder)),
                    tsResult.dts.pipe(gulp.dest(paths.libFolder))
                ]);
                mergedStream.on('queueDrain', function () {
                    if (errorCount) {
                        build.logError("*** Total TypeScript error(s): " + chalk.red(errorCount));
                    }
                });
                return mergedStream;
            });
        }
        if (paths.lessMatch) {
            dependencies.push('build-less');
            build.task('build-less', function () {
                var minifyCss = require('gulp-minify-css');
                var less = require('gulp-less');
                var textToJs = require('gulp-texttojs');
                return gulp.src(paths.lessMatch)
                    .pipe(plumber({
                    errorHandler: function (error) { return build.logError(error); }
                }))
                    .pipe(less())
                    .pipe(minifyCss())
                    .pipe(textToJs({
                    template: 'require(\'load-styles\')(<%= content %>);'
                }))
                    .pipe(gulp.dest(paths.libFolder));
            });
        }
        if (paths.sassMatch) {
            dependencies.push('build-sass');
            build.task('build-sass', function () {
                var sass = require('gulp-sass');
                var textToJs = require('gulp-texttojs');
                return gulp.src(paths.sassMatch)
                    .pipe(plumber({
                    errorHandler: function (error) { return build.logError(error); }
                }))
                    .pipe(sass({})) // .on('error', sass.logError))
                    .pipe(textToJs({
                    template: 'require(\'load-styles\')(<%= content %>);'
                }))
                    .pipe(gulp.dest(paths.libFolder));
            });
        }
        if (paths.htmlMatch) {
            dependencies.push('build-html');
            build.task('build-html', function () {
                var minifyHtml = require('gulp-minify-html');
                return gulp.src(paths.htmlMatch)
                    .pipe(plumber({
                    errorHandler: function (error) { return build.logError(error); }
                }))
                    .pipe(minifyHtml())
                    .pipe(gulp.dest(paths.libFolder));
            });
        }
        if (paths.staticsMatch) {
            dependencies.push('build-statics');
            build.task('build-statics', function () {
                var merge = require('merge2');
                var tasks = [];
                var flatten = require('gulp-flatten');
                tasks.push(gulp.src(paths.staticsMatch)
                    .pipe(gulp.dest(paths.libFolder)));
                for (var copyDest in options.copyTo) {
                    if (options.copyTo.hasOwnProperty(copyDest)) {
                        var sources = options.copyTo[copyDest];
                        sources.forEach(function (sourceMatch) { return tasks.push(gulp.src(sourceMatch)
                            .pipe(flatten())
                            .pipe(gulp.dest(copyDest))); });
                    }
                }
                return merge(tasks);
            });
        }
        build.task('build', dependencies);
        build.task('build-watch', ['build'], function () {
            if (paths.sourceMatch) {
                gulp.watch(paths.sourceMatch, ['build-ts']);
            }
            if (paths.lessMatch) {
                gulp.watch(paths.lessMatch, ['build-less']);
            }
            if (paths.sassMatch) {
                gulp.watch(paths.sassMatch, ['build-less']);
            }
            if (paths.htmlMatch) {
                gulp.watch(paths.htmlMatch, ['build-html']);
            }
            if (paths.staticsMatch) {
                gulp.watch(paths.staticsMatch, ['build-statics']);
            }
        });
    };
    return BuildTasks;
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BuildTasks;