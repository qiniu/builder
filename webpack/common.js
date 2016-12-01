/*
 * @file webpack config
 * @author nighca <nighca@live.cn>
 */

const path = require('path')
const webpack = require('webpack')


const conf = require('../lib/conf')
const paths = require('../lib/paths')

const addTransform = require('./addons/add-transform')
const genPages = require('./addons/gen-pages')

const entries = Object.keys(conf.entries).reduce((entries, name) => {
  entries[name] = path.join(paths.root, conf.entries[name])
  return entries
}, {})

// original config
let config = {

  entry: entries,

  resolve: {
    extensions: ['.js'],
    modules: [
      paths.src,
      'node_modules'
    ]
  },

  externals: {},

  module: {
    noParse: [],
    rules: []
  },
  plugins: [],
  postcss: [],

  output: {
    path: paths.dist,
    filename: 'static/[name]-[hash].js',
    chunkFilename: 'static/[id]-[chunkhash].js',
    publicPath: conf.publicUrl
  }
}

// add transforms
Object.keys(conf.transforms).forEach(extension => {
  config = addTransform(config, extension, conf.transforms[extension])
})

// gen pages
config = genPages(config, conf.pages)

module.exports = config
