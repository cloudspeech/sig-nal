// rollup.config.js
import terser from '@rollup/plugin-terser';

export default {
  input: {
    index: 'src/index.js',
    'plugins/classMap': 'src/plugins/classMap.js',
    'plugins/part-ial': 'src/plugins/part-ial.js',
    'plugins/sty-le': 'src/plugins/sty-le.js'
  },
  output: [
    {
      dir: 'dist',
      entryFileNames: '[name].js',
      format: 'es',
      plugins: [terser({ ecma: 2022, module: true, compress: { passes: 2 } })]
    }
  ]
};
