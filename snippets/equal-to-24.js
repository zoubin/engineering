function equalTo24(a, b, c, d) {
  const ops = ['+', '-', '*', '/']
  const opsDist = opsSlicer(3)
  for (let operators of createOperator(ops, 3)) {
    for (let dist of opsDist) {
      for (let operands of createOperands([a, b, c, d])) {
        if (calc(operands.slice(), operators.slice(), dist) === 24) {
          return toExpr(operands, operators, dist)
        }
      }
    }
  }
  return 'It\'s not possible!'
}

function * createOperator(input, m, prev = []) {
  const n = input.length
  for (let i = 0; i < n; i++) {
    const next = prev.concat(input[i])
    if (next.length === m) {
      yield next
    } else {
      yield * createOperator(input, m, next)
    }
  }
}

function * createOperands(input, prev = []) {
  const n = input.length
  for (let i = 0; i < n; i++) {
    const next = prev.concat(input[i])
    if (n === 1) {
      yield next
    } else {
      const nextInput = input.slice()
      nextInput.splice(i, 1)
      yield * createOperands(nextInput, next)
    }
  }
}

function opsSlicer(n) {
  // i(k) ≤ k + 1, i(n-1) ≥ 1
  const results = []
  ;(function loop(i, prev, m) {
    if (i === n - 1) {
      prev[i] = n - m
      return results.push(prev)
    }
    for (let j = 0; j <= i + 1; j++) {
      if (m + j > n - 1) {
        return
      }
      prev[i] = j
      loop(i + 1, prev.slice(), m + j)
    }
  })(0, [], 0)
  return results
}

function calc(operands, operators, operatorDist) {
  const stack = [operands.shift()]
  const calculator = {
    '+': (r, l) => l + r,
    '-': (r, l) => l - r,
    '*': (r, l) => l * r,
    '/': (r, l) => l / r
  }
  for (let m of operatorDist) {
    stack.push(operands.shift())
    if (m > 0) {
      operators.splice(0, m).forEach(op => {
        stack.push(calculator[op](stack.pop(), stack.pop()))
      })
    }
  }
  return stack.pop()
}

function toExpr(operands, operators, dist) {
  return [operands, operators, dist]
}

// console.log(equalTo24(1,2,3,4)) //can return "(1+3)*(2+4)" or "1*2*3*4"
// console.log(equalTo24(2,3,4,5)) //can return "(5+3-2)*4" or "(3+4+5)*2"
// console.log(equalTo24(3,4,5,6)) //can return "(3-4+5)*6"
// console.log(equalTo24(1,1,1,1)) //should return "It's not possible!"
// console.log(equalTo24(13,13,13,13)) //should return "It's not possible!"
// console.log(equalTo24(54,75,3,56)) //should return "It's not possible!"
console.time('1000')
for (let i = 0; i < 1000; i++) {
  // equalTo24(54,75,3,56)
  equalTo24(1,1,1,1)
}
console.timeEnd('1000')
// for (let op of createOperator(['+', '-', '*', '/'], 3)) {
//   console.log(op)
// }
// for (let op of createGroups(4)) {
//   console.log(op)
// }
// const expr = '(4+1*(5-2))-6/3'

// console.time('eval')
// for (let i = 0; i < 1000; i++) {
//   eval(expr)
// }
// console.timeEnd('eval')

// console.time('evalExpr')
// for (let i = 0; i < 1000; i++) {
//   evalExpr(expr)
// }
// console.timeEnd('evalExpr')

// console.time('expr')
// for (let i = 0; i < 1000; i++) {
//   (1+3)*(2+4)
// }
// console.timeEnd('expr')

// console.log(calc([4,1,5,2,6,3], ['-','*','+','/','-'], [0,0,3,0,2]))
