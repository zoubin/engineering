module.exports = function curry(fn, args) {
  if (args) {
    fn = fn.bind.apply(fn, [null].concat(args))
  }
  return function curried() {
    return arguments.length ? curry(fn, [].concat.apply([], arguments)) : fn()
  }
}
module.exports.uncurry = function (curried) {
  return function uncurried() {
    return arguments.length ? curried.apply(null, arguments)() : curried()
  }
}
