# Node.js Stream - 几个需要注意的问题

## 不要在非对象模式下往流中添加空字符串
```js
const Readable = require('stream').Readable

// 底层数据
const dataSource = ['a', '', 'c']

const readable = Readable()
readable._read = function () {
  process.nextTick(() => {
    var data
    if (dataSource.length) {
      data = dataSource.shift()
    } else {
      data = null
    }
    console.log('push', data)
    this.push(data)
  })
}

readable.on('data', data => console.log('PRINT', data))
readable.on('end', data => console.log('END'))

```

输出：
```
push a
PRINT <Buffer 61>
push

```

`push('')`时，不会有任何数据输出，也不会再引起`read(0)`或`flow()`的调用，数据生产循环被中断了。

## 避免执行_read时在不同tick中多次调用push方法
一旦调用`push()`，这次从底层读取数据的工作就算完成了，
`read()`中设置的状态也就清除了。
如果多次调用`push()`，那么从第二次开始，
这些调用便等于是未经过`read()`设置标记的，就可能出错。

```js
const Readable = require('stream').Readable

// 底层数据
const dataSource = ['a']

const readable = Readable()
readable._read = function () {
  const data = dataSource.shift()
  if (data) {
    this.push('a')
    process.nextTick(() => {
      this.push('b')
    })
  } else {
    this.push(null)
  }
}

readable.on('data', data => console.log('PRINT', data))

```

执行上面代码时可以看到报错信息
```
Error: stream.push() after EOF
```

原因是`this.push('b')`实际上是在`this.push(null)`后才执行的。

如果所有`push()`都是在同一个tick中，便不会有问题。

