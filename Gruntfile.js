module.exports = function(grunt) {

	require('load-grunt-tasks')(grunt);

	grunt.initConfig({

		'dart-sass': {
			dev: {
				options: {
					outputStyle: 'expanded'
				},
				files: {
					'.tmp/css/c-inline-style.css': ['sass/c-inline-style.scss'],
					'.tmp/css/c-async-style.css':  ['sass/c-async-style.scss'],
				},
			},
			deploy: {
				options: {
					outputStyle: 'compressed'
				},
				files: {
					'.tmp/deploy/css/c-inline-style.css': ['sass/c-inline-style.scss'],
					'.tmp/deploy/css/c-async-style.css':  ['sass/c-async-style.scss'],
				},
			},
		},

		postcss: {
			options: {
				map: {
					inline: false,
					annotation: 'cssmaps/'
				},
				processors: [
					require('autoprefixer')(),
					require('cssnano')({
						preset: ['default', {
							discardComments: { removeAll: false },
						}],
					}),
				],
			},
			dev: {
				expand:  true,
				flatten: true,
				files: {
					'css/c-inline-style.css': ['.tmp/css/c-inline-style.css'],
					'css/c-async-style.css':  ['.tmp/css/c-async-style.css'],
				},
			},
			deploy: {
				expand:  true,
				flatten: true,
				files: {
					'css/c-inline-style.css': ['.tmp/deploy/css/c-inline-style.css'],
					'css/c-async-style.css':  ['.tmp/deploy/css/c-async-style.css'],
				},
			},
		},

		concat: {
			dev: {
				files: {
					'.tmp/js/script.js': ['js/plugins.js', 'js/main.js'],
				},
			},
		},

		uglify: {
			dev: {
				files: [{
					expand: true,
					cwd:    '.tmp/js',
					src:    ['*.js'],
					dest:   'js',
				}],
			},
		},

		// Inlines CSS + JS resource refs in album.html → .tmp/album.html
		inline: {
			album: {
				options: { uglify: false },
				src:  'src/album.html',
				dest: '.tmp/album.html',
			},
		},

		htmlmin: {
			// Minifies the inlined album.html for the deploy blob (with inline CSS/JS compression)
			album: {
				options: {
					removeComments:     true,
					collapseWhitespace: true,
					minifyCSS:          true,
					minifyJS:           true,
				},
				files: [{
					src:  '.tmp/album.html',
					dest: '.tmp/album-min.html',
				}],
			},
			// Minifies the final index.html for inscription
			deploy: {
				options: {
					removeComments:     true,
					collapseWhitespace: true,
				},
				files: [{
					src:  '.tmp/deploy/index.html',
					dest: 'deploy/index.html',
				}],
			},
		},

		// Config consumed by the custom blobify multi-task below.
		// src      = compiled album HTML to embed
		// template = src/index.html (stable template with '__BLOB__' placeholder)
		// dest     = output file to write (template + substituted blob)
		blobify: {
			dev: {
				src:      '.tmp/album.html',
				template: 'src/index.html',
				dest:     'index.html',
			},
			deploy: {
				src:      '.tmp/album-min.html',
				template: 'src/index.html',
				dest:     '.tmp/deploy/index.html',
			},
		},

		compress: {
			main: {
				options: { mode: 'gzip' },
				files: [
					{ expand: true, src: ['css/c-inline-style.css'], dest: 'deploy/', ext: '.css.gz' },
				],
			},
		},

		clean: {
			options: { force: true },
			beforeDeploy: ['.tmp', 'deploy'],
		},

		watch: {
			options: { livereload: true },
			html: {
				files: ['src/album.html'],
				tasks: ['inline:album', 'blobify:dev'],
			},
			js: {
				files: ['js/plugins.js', 'js/main.js'],
				tasks: ['concat:dev', 'uglify:dev', 'inline:album', 'blobify:dev'],
			},
			sass: {
				options: { livereload: true },
				files: ['sass/*.scss', 'sass/**/*.scss'],
				tasks: ['dart-sass:dev', 'postcss:dev', 'inline:album', 'blobify:dev'],
			},
		},

	});

	// ---------------------------------------------------------------------------
	// Custom task: gzip + base64-encode the compiled album HTML, substitute it
	// for the '__BLOB__' placeholder in src/index.html (template), and write
	// the result to the configured dest. src/index.html is never modified.
	// ---------------------------------------------------------------------------
	grunt.registerMultiTask('blobify', 'Gzip + base64-encode album HTML into index output', function () {
		var done = this.async();
		var zlib = require('zlib');
		var fs   = require('fs');
		var path = require('path');
		var data = this.data;

		grunt.log.write('Reading ' + data.src + ' … ');

		var html = fs.readFileSync(data.src);

		zlib.gzip(html, { level: zlib.constants.Z_BEST_COMPRESSION }, function (err, compressed) {
			if (err) { grunt.fail.fatal(err); done(); return; }

			var base64   = compressed.toString('base64');
			var template = fs.readFileSync(data.template, 'utf8');
			var output   = template.replace("'__BLOB__'", "'" + base64 + "'");

			if (output === template) {
				grunt.fail.fatal('blobify: __BLOB__ placeholder not found in ' + data.template);
				done(); return;
			}

			var destDir = path.dirname(data.dest);
			if (!fs.existsSync(destDir)) { fs.mkdirSync(destDir, { recursive: true }); }

			fs.writeFileSync(data.dest, output, 'utf8');
			grunt.log.ok('wrote ' + base64.length + ' chars → ' + data.dest);
			done();
		});
	});

	// ---------------------------------------------------------------------------
	// Task aliases
	// ---------------------------------------------------------------------------

	// Full dev build (no watch) — useful for a cold start
	grunt.registerTask('build', [
		'dart-sass:dev',
		'postcss:dev',
		'concat:dev',
		'uglify:dev',
		'inline:album',
		'blobify:dev',
	]);

	grunt.registerTask('default', ['watch']);

	grunt.registerTask('deploy', [
		'clean:beforeDeploy',
		'dart-sass:deploy',
		'postcss:deploy',
		'concat:dev',
		'uglify:dev',
		'inline:album',
		'htmlmin:album',
		'blobify:deploy',
		'htmlmin:deploy',
		// 'compress' // Uncomment to also GZIP output files
	]);

};
