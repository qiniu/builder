/*
 * @file util methods
 * @author nighca <nighca@live.cn>
 */

function extend(target, ...addons) {
  addons.forEach(addon => {
    for (let key in addon) {
      if (addon.hasOwnProperty(key)) {
        target[key] = addon[key]
      }
    }
  })
  return target
}

module.exports = {
  extend
}
