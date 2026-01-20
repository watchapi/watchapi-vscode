/**
 * Bundle @watchapi/parsers for embedding in JetBrains plugin
 * This creates a single JS file that can be executed by GraalJS
 */

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const outfile = path.join(__dirname, '../src/main/resources/js/parsers-bundle.js');

// Ensure output directory exists
fs.mkdirSync(path.dirname(outfile), { recursive: true });

esbuild.build({
  entryPoints: [path.join(__dirname, 'parsers-entry.js')],
  bundle: true,
  platform: 'neutral', // Works in any JS environment
  target: 'es2020',
  format: 'iife',
  globalName: 'WatchApiParsers',
  outfile,
  minify: false, // Keep readable for debugging
  sourcemap: false,
  // Don't bundle Node.js built-ins - we'll polyfill them
  external: [],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  plugins: [
    // Polyfill Node.js modules for GraalJS
    {
      name: 'node-polyfills',
      setup(build) {
        // Redirect fs to our polyfill
        build.onResolve({ filter: /^fs$/ }, () => ({
          path: path.join(__dirname, 'polyfills/fs.js'),
        }));

        // Redirect path to our polyfill
        build.onResolve({ filter: /^path$/ }, () => ({
          path: path.join(__dirname, 'polyfills/path.js'),
        }));
      },
    },
  ],
}).then(() => {
  console.log(`✅ Bundled to ${outfile}`);
  const stats = fs.statSync(outfile);
  console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);
}).catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
