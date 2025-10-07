// rollup.config.js
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/index.min.js',
      format: 'es',
      plugins: [terser({ ecma: 2022, module: true, compress: { passes: 2 } })]
    }
  ]
};
