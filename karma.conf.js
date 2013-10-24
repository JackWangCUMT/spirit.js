// Karma configuration

module.exports = function(config) {
	config.set({

		// base path, that will be used to resolve files and exclude
		basePath: '',


		// frameworks to use
		frameworks: ['jasmine'],


		// list of files / patterns to load in the browser
		files: [
			// libs
			'public/js/vendors/jquery/jquery.min.js',
			'public/js/vendors/greensock-js/src/minified/TweenLite.min.js',
			'public/js/vendors/greensock-js/src/minified/TimelineLite.min.js',
			'public/js/vendors/greensock-js/src/minified/plugins/CSSPlugin.min.js',
			'public/js/vendors/greensock-js/src/minified/easing/EasePack.min.js',

			// source scripts
			'public/js/src/util/Globals.js',
			'public/js/src/util/*.js',
			'public/js/src/**/*.js',
			'public/js/src/*.js',

			// specs
			'test/*Spec.js'
		],


		// list of files to exclude
		exclude: [],


		// test results reporter to use
		// possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
		reporters: ['progress'],


		// web server port
		port: 9999,


		// enable / disable colors in the output (reporters and logs)
		colors: true,


		// level of logging
		// possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
		logLevel: config.LOG_INFO,


		// enable / disable watching file and executing tests whenever any file changes
		autoWatch: false,


		// Start these browsers, currently available:
		// - Chrome
		// - ChromeCanary
		// - Firefox
		// - Opera
		// - Safari (only Mac)
		// - PhantomJS
		// - IE (only Windows)
		browsers: ['Chrome'],


		// If browser does not capture in given timeout [ms], kill it
		captureTimeout: 5000,


		// Continuous Integration mode
		// if true, it capture browsers, run tests and exit
		singleRun: false
	});
};