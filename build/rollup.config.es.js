import base from './rollup.config.base'

const config = Object.assign({}, base, {
  output: {
    name: 'vue-virtual-repeater',
    file: 'dist/vue-virtual-repeater.esm.js',
    format: 'es',
  },
})

export default config
