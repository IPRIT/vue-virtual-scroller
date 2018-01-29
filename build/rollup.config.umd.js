import base from './rollup.config.base'

const config = Object.assign({}, base, {
  output: {
    exports: 'named',
    name: 'vue-virtual-repeater',
    file: 'dist/vue-virtual-repeater.umd.js',
    format: 'umd',
  },
})

export default config
