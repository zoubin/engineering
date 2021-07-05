function solvePuzzle (clues) {
  // return measure('solvePuzzle', () => {
    if (clues.length === 1) {
      return clues[0] <= 1 ? [[1]] : null
    }

    const n = clues.length >> 2
    const possibilities = clues.slice(0, n)
      .map((_, $, arr) => arr.map((_, $, arr) => arr.map((_, x) => x + 1)))

    applyClues(possibilities, clues)
    // print(possibilities, clues)
    return dfs(possibilities, clues)
    // return possibilities.map(row => row.map(x => x[0]))
  // })
}

function applyClues(possibilities, clues) {
  // measure('applyClues', () => {
    const n = possibilities.length
    const complete = possibilities.map((row) => row.map(() => false))
    clues.forEach((clue, i) => {
      if (clue === 0) {
        return
      }
      if (clue === 1) {
        // only the first position is allowed
        setWithClueIndex(possibilities, n, i, 0, n, complete)
        return
      }
      if (clue === n) {
        // should be 1..n exactly
        for (let j = 0; j < n; j++) {
          setWithClueIndex(possibilities, n, i, j, j + 1, complete)
        }
        return
      }
      // other numbers should be placed after some position
      for (let m = n; m + clue - 1 - n > 0; m--) {
        excludeWithClueIndex(possibilities, n, i, 0, m + clue - 1 - n, m)
      }
    })
    let prevState
    let nextState = possibilities.toString()
    function checkVacancy(arr, i, isCol) {
      const sums = []
      arr.forEach(m => m.forEach(x => sums[x] = ~~sums[x] + 1))
      sums.forEach((s, m) => {
        if (s === 1) {
          let x = i
          let y = arr.findIndex(x => x.includes(m))
          if (isCol) {
            let t = x
            x = y
            y = t
          }
          setWithCartesianIndex(possibilities, n, x, y, m, complete)
        }
      })
    }
    do {
      prevState = nextState
      // if only one number is allowed in some position, use it in the final solution
      possibilities.forEach((row, i) => {
        row.forEach((cell, j) => {
          if (cell.length === 1) {
            setWithCartesianIndex(possibilities, n, i, j, cell[0], complete)
          }
        })
      })
      // if only one position is allowed for some number, use it in the final solution
      possibilities.forEach((row, i) => {
        checkVacancy(row, i, false)
        checkVacancy(possibilities.map(x => x[i]), i, true)
      })
      // check each combination for rows and columns against each clue
      checkClues(clues, possibilities)
      nextState = possibilities.toString()
    } while (nextState !== prevState)
  // })
}

function dfs(matrix, clues) {
  // return measure('dfs', () => {
    const n = matrix.length
    const solution = matrix.map(row => row.map(() => 0))
    const stateCache = matrix.map(row => row.map(() => ({
      index: 0,
      row: { max: 0, clue: 0 },
      col: { max: 0, clue: 0 },
    })))
    let i = 0
    let j = 0
    while (i >= 0) {
      if (i === n) {
        return solution
      }
      let flag = false
      let q = matrix[i][j].length
      const state = stateCache[i][j]

      for (let k = state.index; k < q; k++) {
        state.index++
        let x = matrix[i][j][k]
        if (
          !solution[i].slice(0, j).includes(x) &&
          !solution.map(row => row[j]).slice(0, i).includes(x) &&
          isClueFollowed(x, i, j, solution, clues, stateCache)
        ) {
          flag = true
          solution[i][j] = x
          j += 1
          if (j === n) {
            j = 0
            i += 1
          }
          break
        }
      }
      if (!flag) {
        state.index = 0
        state.row = { max: 0, clue: 0 }
        state.col = { max: 0, clue: 0 }
        j -= 1
        if (j < 0) {
          j = n - 1
          i -= 1
        }
      }
    }
    return null
  // })
}

function setWithClueIndex(matrix, len, clueIndex, recIndex, value, complete) {
  // measure('setWithClueIndex', () => {
    const [x, y] = clueIndex2matrixIndex(clueIndex, recIndex, len)
    setWithCartesianIndex(matrix, len, x, y, value, complete)
  // })
}

function setWithCartesianIndex(matrix, len, x, y, value, complete) {
  // measure('setWithCartesianIndex', () => {
    if (complete[x][y]) {
      return
    }
    // console.log('setWithCartesianIndex', x, y, value)
    const cell = matrix[x][y]
    if (!cell.includes(value)) {
      throw new Error(`Failed to set a value out of possibilities. index: (${x}, ${y}), value: ${value}, possibilities: ${cell}`)
    }
    for (let i = 0; i < len; i++) {
      if (i !== x) {
        exclude(matrix, len, i, y, value)
      }
      if (i !== y) {
        exclude(matrix, len, x, i, value)
      }
    }
    cell.splice(0)
    cell.push(value)
    complete[x][y] = true
  // })
}

function clueIndex2matrixIndex(i, j, n) {
  // return measure('clueIndex2matrixIndex', () => {
    if (i < n) {
      return [j, i]
    }
    if (i < 2 * n) {
      return [i - n, n - 1 - j]
    }
    if (i < 3 * n) {
      return [n - 1 - j, 3 * n - 1 - i]
    }
    return [4 * n - 1 - i, j]
  // })
}

function exclude(matrix, len, x, y, value) {
  // measure('exclude', () => {
    const cell = matrix[x][y]
    const idx = cell.indexOf(value)
    if (idx > -1) {
      cell.splice(idx, 1)
    }
  // })
}

function excludeWithClueIndex(matrix, len, clueIndex, i0, i1, value) {
  // measure('excludeWithClueIndex', () => {
    for (let i = i0; i < i1; i++) {
      const [x, y] = clueIndex2matrixIndex(clueIndex, i, len)
      exclude(matrix, len, x, y, value)
    }
  // })
}

function calcClue(arr) {
  // return measure('calcClue', () => {
    let max = arr[0]
    return arr.reduce((amt, m) => {
      if (m >= max) {
        max = m
        return amt + 1
      }
      return amt
    }, 0)
  // })
}

function checkClues(clues, possibilities) {
  const n = possibilities.length
  clues.forEach((clue, i) => {
    if (clue > 0) {
      const row = possibilities.map((_, j) => {
        const [x, y] = clueIndex2matrixIndex(i, j, n)
        return possibilities[x][y]
      })
      const newRow = row.map(r => [])
      // log(i === 22, 'clue', i)
      // log(i === 22, '   Row', row.map(x => x.toString()).join('\t'))
      for (let arr of combination(row)) {
        if (calcClue(arr) === clue) {
          arr.forEach((x, k) => {
            if (!newRow[k].includes(x)) {
              newRow[k].push(x)
            }
          })
        }
      }
      // log(i === 22, 'newRow', newRow.map(x => x.toString()).join('\t'))
      row.forEach((a, k) => {
        const b = newRow[k].sort((x1, x2) => x1 - x2)
        if (b.toString() !== a.toString()) {
          a.splice(0, a.length, ...b)
        }
      })
    }
  })
}

function * combination(input, prev = []) {
  const n = input.length
  for (let x of input[0]) {
    if (!prev.includes(x)) {
      const next = prev.concat(x)
      if (n === 1) {
        yield next
      } else {
        yield * combination(input.slice(1), next)
      }
    }
  }
}

function check(x, n, c, index, prevState, state) {
  const { max, clue } = prevState || { max: 0, clue: 0 }
  if (c === 0 || max === n) {
    state.clue = clue
    state.max = max
    return true
  }
  if (x === n) {
    if (clue + 1 === c) {
      state.clue = c
      state.max = x
      return true
    }
    return false
  }

  if (x < max) {
    // enough cadidate numbers larger, and enough vacancies for them
    if (n - max + clue >= c && n - index - 1 + clue >= c) {
      state.clue = clue
      state.max = max
      return true
    }
    return false
  }

  if (clue + 1 < c) {
    state.clue = clue + 1
    state.max = x
    return true
  }
  return false
}

function isClueFollowed(x, i, j, solution, clues, cache) {
  // return measure('isClueFollowed', () => {
    const n = solution.length
    const c1 = clues[j]
    const c2 = clues[n + i]
    const c3 = clues[3 * n - 1 - j]
    const c4 = clues[4 * n - 1 - i]
    if (
      j === n - 1 && c2 > 0 && calcClue(solution[i].slice(0, j).concat(x).reverse()) !== c2 ||
      i === n - 1 && c3 > 0 && calcClue(solution.map(row => row[j]).slice(0, i).concat(x).reverse()) !== c3
    ) {
      return false
    }

    const rowState = {}
    const colState = {}
    const rowPrevState = j >= 1 ? cache[i][j - 1].row : null
    const colPrevState = i >= 1 ? cache[i - 1][j].col : null
    if (check(x, n, c4, j, rowPrevState, rowState) && check(x, n, c1, i, colPrevState, colState)) {
      cache[i][j].row = rowState
      cache[i][j].col = colState
      return true
    }
    return false
  // })
}

let times = {}

function measure(label, fn) {
  const st = Date.now()
  const res = fn()
  times[label] = ~~times[label] + Date.now() - st
  return res
}

function log(condition, ...args) {
  if (condition) {
    console.log(...args)
  }
}

function print(matrix, clues) {
  const n = matrix.length
  matrix.forEach((row, i) => {
    let line = row.map(m => (m.join(',') + ' '.repeat(20)).slice(0, 20)).join('|  ')
    line = `(${clues[4 * n - 1 - i]})  ` + line + `(${clues[n + i]})`
    if (i === 0) {
      console.log('-'.repeat(line.length))
      console.log(' '.repeat(5) + row.map((_, j) => ' '.repeat(8) + `(${clues[j]})` + ' '.repeat(9)).join('   '))
    }
    console.log(line)
    if (i === matrix.length - 1) {
      console.log(' '.repeat(5) + row.map((_, j) => ' '.repeat(8) + `(${clues[3 * n - 1 - j]})` + ' '.repeat(9)).join('   '))
      console.log('-'.repeat(line.length))
    }
  })
}

module.exports = {
  solvePuzzle, times
}
