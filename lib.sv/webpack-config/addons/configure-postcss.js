/**
 * @file config for configure postcss
 * @author nighca <nighca@live.cn>
 */

const update = require('immutability-helper')

module.exports = (webpackConfig, options) => {

  // TODO: FIX: postcss config breaks
  // work around: https://github.com/akveo/ng2-admin/issues/604#issuecomment-271974780

  // webpackConfig.module.rules.forEach(
  //   (rule, ruleIndex) => {
  //     const postCSSLoaderIndex = rule.use.findIndex(
  //       ({ loader }) => loader === 'postcss-loader'
  //     )
  //     if (postCSSLoaderIndex >= 0) {
  //       const newPostCSSLoader = update(rule.use[postCSSLoaderIndex], {
  //         options: {
  //           $set: { plugins: [require('autoprefixer')] }
  //         }
  //       })
  //       webpackConfig = update(webpackConfig, {
  //         module: { rules: { ruleIndex: {
  //           $set: newPostCSSLoader
  //         } } }
  //       })
  //     }
  //   }
  // )

  // webpackConfig = update(webpackConfig, {
  //   plugins: {
  //     $push: [new webpack.LoaderOptionsPlugin({
  //       options: {
  //         postcss: {},
  //         resolve: {
  //           // https://github.com/TypeStrong/ts-loader#webpack
  //           // If you are using webpack 2 with the LoaderOptionsPlugin.
  //           // If you are faced with the Cannot read property 'unsafeCache' of undefined error
  //           // then you probably need to supply a resolve object
  //           extensions: webpackConfig.resolve.extensions
  //         }
  //       }
  //     })]
  //   }
  // })

  return webpackConfig
}
