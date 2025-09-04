const babel = require('rollup-plugin-babel')
const commonjs = require('rollup-plugin-commonjs')
const json = require('rollup-plugin-json')

module.exports = {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/botium-connector-agentforce-es.js',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/botium-connector-agentforce-cjs.js',
      format: 'cjs',
      sourcemap: true
    }
  ],
  plugins: [
    commonjs({
      exclude: 'node_modules/**'
    }),
    babel({
      exclude: 'node_modules/**',
      runtimeHelpers: true
    }),
    json()
  ]
}