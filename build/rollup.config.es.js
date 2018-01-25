import base from './rollup.config.base'

const config = Object.assign({}, base, {
  output: {
    name: 'ssr-virtual-scroller',
    file: 'dist/ssr-virtual-scroller.esm.js',
    format: 'es',
  },
})

export default config
