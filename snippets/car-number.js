module.exports = function (original, k) {
  if (original.length < k) return null

  const frequencies = original.toString().split('').reduce((res, next) => {
    res[next] = ~~res[next] + 1
    return res
  }, Object.create(null))

  const digits = Object.keys(frequencies)

  function replace(str, placeholder, replacement, limit) {
    if (!limit) return str
    return str.split('')[replacement > placeholder ? 'reduceRight' : 'reduce']((l, next, i, arr) => {
      if (l > 0 && next === placeholder) {
        arr[i] = replacement
        l--
        return arr
      }
      return l
    }, limit).join('')
  }

  return digits.reduce(([cost, solution], x) => {
    let costs = digits.reduce((o, y) => {
      let c = Math.abs(x - y)
      o[c] = o[c] || []
      if (x > y) {
        o[c].push(y)
      } else {
        o[c].unshift(y)
      }
      return o
    }, Object.create(null))
    let [f, c, s] = Object.keys(costs).map(c => +c).sort((a, b) => a - b).reduce(([f, c, s], cc) => {
      // 等于 x 的数字不需要再处理
      if (f >= k || cc === 0) return [f, c, s]
      let ds = costs[cc]

      // 不会再有更优解
      if ((k - f) * cc + c > cost) return [Infinity, cost, solution]

      // ds 如果有两个数字，则第 1 个比 x 小，第 2 个比 x 大
      let dn = frequencies[ds[0]] + (~~frequencies[ds[1]])
      if (f + dn >= k) {
        // 本次替换可拿到解
        if (f + frequencies[ds[0]] >= k) {
          // 第 1 个数字替换即可完成
          s = replace(s, ds[0], x, k - f)
        } else {
          // 需要替换第 2 个数字
          s = s.replace(new RegExp(`${ds[0]}`, 'g'), x)
          // 注意，此处一定有 ds.length > 1
          s = replace(s, ds[1], x, k - f - frequencies[ds[0]])
        }
        return [k, c + (k - f) * cc, s]
      }

      // 将所有数字全部替换，仍无法完成
      return [
        f + dn,
        c + dn * cc,
        s.replace(new RegExp(`[${ds[0]}${ds[ds.length - 1]}]`, 'g'), x)
      ]

    }, [frequencies[x], 0, original])
    return f >= k ? [c, c === cost && s > solution ? solution : s] : [cost, solution]
  }, [Infinity, ''])
}
