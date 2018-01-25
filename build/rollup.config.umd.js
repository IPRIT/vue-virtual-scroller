import base from './rollup.config.base'

const config = Object.assign({}, base, {
  output: {
    exports: 'named',
    name: 'ssr-virtual-scroller',
    file: 'dist/ssr-virtual-scroller.umd.js',
    format: 'umd',
  },
})

export default config
