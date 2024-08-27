import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'wwwroot/js/app.js',
  output: {
    file: 'wwwroot/bundle.min.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    nodeResolve({
      preferBuiltins: false,
      browser: true
    }),
    terser()
  ]
};