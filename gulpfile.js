var gulp = require('gulp');
var concat = require('gulp-concat');
var less = require('gulp-less');
var cleanCSS = require('gulp-clean-css');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
const autoprefixer = require('gulp-autoprefixer');
const minify = require('gulp-minify');

var paths = {
  styles: {
    src: 'less/**/*.less',
    dest: 'css/'
  },
  scripts: {
    src: 'sources/**/*.js',
    dest: 'js/'
  }
};

function styles() {
  return gulp.src(paths.styles.src)
    .pipe(autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false
    }))
    .pipe(less())
    .pipe(cleanCSS())
    .pipe(rename({
      basename: 'style',
      suffix: '.min'
    }))
    .pipe(gulp.dest(paths.styles.dest));
}

function scripts() {
  return gulp.src(['sources/dom.js', 'sources/helper.js', 'sources/chart_math.js', 'sources/chart.js'])
    .pipe(concat('charts.js'))
    .pipe(minify())
    .pipe(gulp.dest(paths.scripts.dest));
}

function watch() {
  gulp.watch(paths.styles.src, styles);
}

gulp.task('watch', watch);

gulp.task('css', styles);

gulp.task('js', scripts);
