const { test } = require('tap')
const curry = require('../snippets/curry')
const uncurry = curry.uncurry

function sum () {
  return [].reduce.call(arguments, (r, next) => r + next, 0)
}

test('chained before called without arguments', t => {
  const curriedSum = curry(sum)
  t.is(curriedSum(), sum())
  t.is(curriedSum(1)(), sum(1))
  t.is(curriedSum(1)(2)(), sum(1, 2))
  t.is(curriedSum(1)(2)(3)(), sum(1, 2, 3))
  t.end()
})

test('I dont know how to describe it', t => {
  const curriedSum = curry(sum)
  let f1 = curriedSum(1)
  t.is(f1(2)(), sum(1, 2))
  t.is(f1(), sum(1))
  t.is(f1(3)(), sum(1, 3))
  t.end()
})

test('uncurry', t => {
  const curriedSum = curry(sum)
  let f1 = curriedSum(1)
  t.is(f1(2)(), sum(1, 2))
  let f2 = uncurry(f1)
  t.is(f2(3), sum(1, 3))
  t.end()
})
