const fs = require('fs')
const lines = fs.readFileSync('./raw', 'utf8').split('\n')

function toNumber() {
  lines.forEach((line, idx) => {
    if (idx === 0) return console.log(line)
    const o = {}
    const data = line.split('\t')
    data.forEach((x, i) => {
      if (i === 0) return
      if (i < 8 || i === 10) {
        data[i] = parseFloat(data[i]) || 0
      }
      if (i === 11) data[i] = `${data[i]}\r`
    })
    console.log(data.join('\t'))
  })
}

function toJson() {
  const json = lines.reduce((arr, line, idx) => {
    if (idx !== 0) {
      const o = {}
      const data = line.split('\t')
      o.code = data[0]  //编号
      o.sum = data[7]   //基金规模
      o.start = data[8] //成 立 日
      o.target = data[9]//跟踪标的
      o.gap = data[10]  //跟踪误差
      o.href = data[11] //易方达地址
      o.yields = data.slice(1, 7)
      arr.push(o)
    }
    return arr
  }, [])
  console.log(JSON.stringify(json, null, 2))
}
