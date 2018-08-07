# 随机数生成问题

## 问题描述
假定有函数`random()`可得到0或1，其概率相同，均为1/2。如何得到一个可得到1..n整数的等概率随机数生产函数`randomN`？

### 思路
通过某种方式可得到一个数集，且其中每个数的出现概率是可计算的，这样，只需要确定这个方式，然后从数集中选择那些出现概率等于期望得到的数值即可。

现在可直接产生一个0或1，其概率是相同的，那么可以产生n次，一共有2^n种结果，而其中有n种结果的出现概率是相同的，即n次中恰好有一次产生1而其它n-1次均产生0.

### 实现
```
// 给定等概率生产0, 1的函数
function random() {
  return +(Math.random() < 0.5);
}

```

```
function randomN(n) {
  var m = 0; // n次结果中1的个数
  var k = 0; // n次结果中为1的最大序号
  var t;
  var i;
  while (m != 1) {
    m = 0;
    k = 0;
    for (i = 1; i <= n; i++) {
      t = random();
      k = t == 1 ? i : k;
      m += t;
    }
  }
  return k;
}

```

### 复杂度分析
一共有`2^n`种可能结果，其中有`n`种结果是我们所需要的，故外层循环终止的概率是`n/2^n`，期望循环次数为`2^n/n`，里面的操作次数为`n`，故一共需要执行`2^n`次`random`调用。

### 改进
前面的可能结果太多，复杂度为`O(2^n)`。可以想办法缩减可能结果。

当然，最少也得有`n`种可能。如何产生`n`各可能呢？

考虑用二进制来表示整数。对于一个恰好有`m`位的数而言，只需要确定每一位是为1还是0即可确定该数。其可能结果集为`0..2^m-1`，其中任何一个数出现的概率均为`1/2^m`，这样，从中选取`n`个数即可满足需求。

选取方式可作一个简单的映射，即`0..n-1`对应`1..n`。当随机`m`次得到整数`k`时，就选取`k+1`为最终的随机数。如果`k+1>n`，可直接丢弃，重新生产。

为使复杂度最少，可求得满足条件的最小`m`。

```
// min{m | 2^m >= n}
function maxNumOfBits(n) {
  var m = 0;
  while (m++, (n >>= 1));
  return m;
}

// 1..n
function randomN(n) {
  var m = maxNumOfBits(n);
  var ret = n;
  while (ret >= n) {
    ret = 0;
    for (var i = 0, t = 1; i < m; i++, t <<= 1) {
      if (random()) {
        ret |= t;
      }
    }
  }
  return ret + 1;
}

```

上述算法中`m=ceiling(lgn)`。每次产生出满足条件(`ret < n`)的随机数的概率是`n/2^m`，故`while`循环的期望执行次数为`2^m/n`，且`1 <= 2^m/n < 2`，故算法的平均复杂度为`O(lgn)`。

## 测试

```
// TEST
function test(r, n, index) {
  var ret = {};

  var expectedIndex = index || 2;

  // 实验次数
  var totalTimes = +(n + 'e' + expectedIndex);
  console.log('Generate random numbers ' + totalTimes + ' times in total');

  // 期望每个数出现的次数
  var expectedAppearances = +('1e' + expectedIndex);
  console.log('Expect each number to appear ' + expectedAppearances + ' times');

  var confidence_90_low = +('0.9e' + expectedIndex);
  var confidence_90_high = +('1.1e' + expectedIndex);
  var confidence_95_low = +('0.95e' + expectedIndex);
  var confidence_95_high = +('1.05e' + expectedIndex);

  var m;
  for (var i = 0; i < totalTimes; i++) {
    m = r(n);
    ret[m] = (ret[m] || 0) + 1;
  }
  console.log('All results:', ret);
  var numbers = Object.keys(ret);
  console.log('Number of numbers:', numbers.length);
  console.log('Maximum:', Math.max.apply(Math, numbers));
  console.log('Minimum:', Math.min.apply(Math, numbers));

  var casesAbove95 = 0;
  var casesAbove90 = 0;
  for (var i = 0, len = numbers.length; i < len; i++) {
    var rn = ret[numbers[i]];
    if (rn >= confidence_90_low && rn <= confidence_90_high)
      casesAbove90++;
    if (rn >= confidence_95_low && rn <= confidence_95_high)
      casesAbove95++;
  }
  console.log('About ' + +(casesAbove90 / n + ('e2')) + ' percent of numbers have 90 percent confidence:', confidence_90_low, confidence_90_high);
  console.log('About ' + +(casesAbove95 / n + ('e2')) + ' percent of numbers have 95 percent confidence:', confidence_95_low, confidence_95_high);
}

```

## 另一个问题
如果`random()`产生0或1的概率不等，且未知，如何获得一个产生等概率0或1的`random()`？

