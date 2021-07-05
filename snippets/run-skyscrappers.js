const { solvePuzzle, times } = require('./skyscrappers')
;(function run() {
  const st = Date.now()
  const clues = [
    0, 0, 0, 5, 0, 0, 3,
    0, 6, 3, 4, 0, 0, 0,
    3, 0, 0, 0, 2, 4, 0,
    2, 6, 2, 2, 2, 0, 0
  ]
  const actual = solvePuzzle(clues)
  console.log('time:', Date.now() - st)
  console.log('='.repeat(30))
  printMatrix(actual, clues)
})()

;(function run() {
  const st = Date.now()
  const clues = [
    0,2,3,0,2,0,0,
    5,0,4,5,0,4,0,
    0,4,2,0,0,0,6,
    5,2,2,2,2,4,1
  ]
  const expected = [
    [7,6,2,1,5,4,3],
    [1,3,5,4,2,7,6],
    [6,5,4,7,3,2,1],
    [5,1,7,6,4,3,2],
    [4,2,1,3,7,6,5],
    [3,7,6,2,1,5,4],
    [2,4,3,5,6,1,7]
  ]
  const actual = solvePuzzle(clues)
  console.log('time:', Date.now() - st)
  console.log('='.repeat(30))
  printMatrix(actual, clues)
})()

;(function run() {
  const st = Date.now()
  const clues = [
    7,0,0,0,2,2,3,
    0,0,3,0,0,0,0,
    3,0,3,0,0,5,0,
    0,0,0,0,5,0,4
  ]
  const expected = [
    [1,5,6,7,4,3,2],
    [2,7,4,5,3,1,6],
    [3,4,5,6,7,2,1],
    [4,6,3,1,2,7,5],
    [5,3,1,2,6,4,7],
    [6,2,7,3,1,5,4],
    [7,1,2,4,5,6,3]
  ]
  const actual = solvePuzzle(clues)
  console.log('time:', Date.now() - st)
  console.log('='.repeat(30))
  printMatrix(actual, clues)
})()

;(function run() {
  const st = Date.now()
  const clues = [
    3, 2, 2, 3, 2, 1,
    1, 2, 3, 3, 2, 2,
    5, 1, 2, 2, 4, 3,
    3, 2, 1, 2, 2, 4
  ]
  const expected = [
    [ 2, 1, 4, 3, 5, 6],
    [ 1, 6, 3, 2, 4, 5],
    [ 4, 3, 6, 5, 1, 2],
    [ 6, 5, 2, 1, 3, 4],
    [ 5, 4, 1, 6, 2, 3],
    [ 3, 2, 5, 4, 6, 1]
  ]
  const actual = solvePuzzle(clues)
  console.log('time:', Date.now() - st)
  console.log('='.repeat(30))
  printMatrix(actual, clues)
})()

;(function run() {
  const st = Date.now()
  const clues = [
    0, 0, 0, 2, 2, 0,
    0, 0, 0, 6, 3, 0,
    0, 4, 0, 0, 0, 0,
    4, 4, 0, 3, 0, 0
  ]
  const expected = [
    [ 5, 6, 1, 4, 3, 2 ],
    [ 4, 1, 3, 2, 6, 5 ],
    [ 2, 3, 6, 1, 5, 4 ],
    [ 6, 5, 4, 3, 2, 1 ],
    [ 1, 2, 5, 6, 4, 3 ],
    [ 3, 4, 2, 5, 1, 6 ]
  ]
  const actual = solvePuzzle(clues)
  console.log('time:', Date.now() - st)
  console.log('='.repeat(30))
  printMatrix(actual, clues)
})()

;(function run() {
  const st = Date.now()
  const clues = [
    3, 3, 2, 1, 2, 2, 3,
    4, 3, 2, 4, 1, 4, 2,
    2, 4, 1, 4, 5, 3, 2,
    3, 1, 4, 2, 5, 2, 3
  ]
  const expected = [
    [ 2, 1, 4, 7, 6, 5, 3 ],
    [ 6, 4, 7, 3, 5, 1, 2 ],
    [ 1, 2, 3, 6, 4, 7, 5 ],
    [ 5, 7, 6, 2, 3, 4, 1 ],
    [ 4, 3, 5, 1, 2, 6, 7 ],
    [ 7, 6, 2, 5, 1, 3, 4 ],
    [ 3, 5, 1, 4, 7, 2, 6 ]
  ]
  const actual = solvePuzzle(clues)
  console.log('time:', Date.now() - st)
  console.log('='.repeat(30))
  printMatrix(actual, clues)
})()

function print(matrix, clues) {
  const n = matrix.length
  matrix.forEach((row, i) => {
    let line = row.map(m => (m.join(',') + ' '.repeat(12)).slice(0, 12)).join('|  ')
    line = `(${clues[4 * n - 1 - i]})  ` + line + `(${clues[n + i]})`
    if (i === 0) {
      console.log('-'.repeat(line.length))
      console.log(' '.repeat(5) + row.map((_, j) => ' '.repeat(4) + `(${clues[j]})` + ' '.repeat(5)).join('   '))
    }
    console.log(line)
    if (i === matrix.length - 1) {
      console.log(' '.repeat(5) + row.map((_, j) => ' '.repeat(4) + `(${clues[3 * n - 1 - j]})` + ' '.repeat(5)).join('   '))
      console.log('-'.repeat(line.length))
    }
  })
}

function printMatrix(matrix, clues) {
  const n = matrix.length
  let line = clues.slice(0, n).join('  ')
  const width = line.length
  const padding = ' '.repeat(4)
  console.log(padding + line + padding)
  console.log('   ' + '-'.repeat(width + 2))
  matrix.forEach((row, i) => console.log(
    clues[4 * n - 1 - i] + ' | ' + row.join('  ') + ' | ' + clues[n + i]
  ))
  console.log('   ' + '-'.repeat(width + 2))
  console.log(padding + clues.slice(2 * n, 3 * n).reverse().join('  ') + padding)
}

