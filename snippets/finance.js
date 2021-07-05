function getFund(n, { bond, fund, inflation }) {
  return (100 + n*inflation - (n-1)*bond) / (fund - inflation)
}

function getAssets(n, yields, [funds, stocks, house]) {
  const fund = getFund(n, yields)
  stocks = (n + fund) * stocks / funds
  house = (n + fund) * house / funds
  return { money: 1, bond: n - 1, fund, stocks, house }
}

function plan(years, expense, yields, ratios) {
  const assets = getAssets(years, yields, ratios)
  const { money, bond, fund, stocks, house } = assets
  const total = Math.round(money + bond + fund + stocks + house)
  return {
    '资产总计': total * expense,
    '占比(货基:债券:指数:股票:房产)': [money, bond, fund, stocks.toFixed(2), house.toFixed(2)].join(' : '),
    '货基(年度支出)': money * expense,
    '债券': bond * expense,
    '指数基金': Math.round(fund * expense),
    '股票': Math.round(stocks * expense),
    '房产': Math.round(house * expense)
  }
}

function main(expense, yields) {
  const options = [
    [3, 5, 2], [2.5, 5, 2.5], [2, 5, 3],
    [4, 4, 2], [3.5, 4, 2.5], [3, 4, 3],
  ]
  for (let years of [3, 8]) {
    const results = {}
    for (let assets of options) {
      results[`稳健${years}年, 基金:股票:房产=${assets.join(':')}`] = plan(years, expense, yields, assets)
    }
    console.table(results)
  }
}

console.log('通过年度支出推算货基、债券、指数基金的规模，实现每年支出与收的动态平衡，即支出与收入在通胀的前提下达到平衡。')
console.log('必要支出全用货基、债券、指数基金来覆盖，每年进行指数基金=>债券=>货基的调整。')
console.log('非必要支出靠股票来覆盖，房产主要用来自住以减少必要开支。')
console.log('风险点：基金的年化实现不了。囯家经济整体下行后可能基金收益会降低，不过通胀也会紧缩。')
console.log('指数基金一般2-3年能到30%的收益，平均年化为10-15%，7-8年为一个牛熊市周期。在基金买卖操作上坚持原则没有太大问题。')
console.log('基金卖出策略：稳健年数内年化12%即可。优秀行业长期持有，主要操作宽基。')

const yields = { bond: 5, fund: 12, inflation: 7 }
console.log(`债券预期年化\t${yields.bond}%`)
console.log(`基金预期年化\t${yields.fund}%`)
console.log(`通胀预期年化\t${yields.inflation}%`)

for (let e of [20]) {
  main(e, yields)
}
console.log('注：稳健N年，表示货基+债券可支撑N年支出。')
