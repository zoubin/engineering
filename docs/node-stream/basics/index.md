# Node.js Stream - 基础篇
[stream]是[Node.js]内置的一个模块，可通过以下方式加载其接口：
```js
var stream = require('stream')

var Readable = stream.Readable
var Writable = stream.Writable
var Duplex = stream.Duplex
var Transform = stream.Transform

```

[stream]暴露的这四个接口均是抽象类，需要实现特定的方法才能构造出可用的实例。

## 目录
- [Readable](#readable)
- [Writable](#writable)
- [Duplex](#duplex)
- [Transform](#transform)
- [objectMode](#objectmode)
- [相关](#相关)
- [参考文献](#参考文献)

## Readable
创建可读流。

实例：流式消耗[迭代器]中的数据。

```js
'use strict'
const Readable = require('stream').Readable

class ToReadable extends Readable {
  constructor(iterable) {
    super()
    this.iterator = new function *() {
      yield * iterable
    }
  }
  _read() {
    const res = this.iterator.next()
    if (res.done) {
      this.push(null)
    } else {
      this.push(res.value + '\n')
    }
  }
}

module.exports = ToReadable

```

实际使用时，`new ToReadable(iterable)`会返回一个可读流，下游可以流式的消耗迭代器中的数据。

```js
const iterable = function *(limit) {
  while (limit--) {
    yield Math.random()
  }
}(1e10)

const readable = new ToReadable(iterable)
readable.on('data', data => process.stdout.write(data))
readable.on('end', () => process.stdout.write('DONE'))

```

执行上述代码，将会有100亿个随机数源源不断的写进标准输出流。

创建可读流时，需要继承`Readable`，并实现`_read`方法。
* `_read`方法是从底层系统读取具体数据的逻辑，即生产数据的逻辑。
* 在`_read`方法中，通过调用`push(data)`将数据放入可读流中供下游消耗。
* 在`_read`方法中，可以同步地调用`push(data)`，也可以异步地调用。
* 当全部数据都生产出来后，**必须**调用`push(null)`来结束可读流。
* 流一旦结束，便不能再调用`push(data)`添加数据。

可以通过监听`data`事件的方式消耗可读流。
* 在首次监听其`data`事件后，`readable`便会持续不断的调用`_read()`，通过触发`data`事件将数据输出。
* 第一次`data`事件会在下一个tick中触发，所以，可以安全地将数据输出前的逻辑放在事件监听后（同一个tick中）。
* 当数据全部被消耗时，会触发`end`事件。

上面的例子中，`process.stdout`代表标准输出流，实际是一个可写流。下小节中介绍可写流的用法。

## Writable
创建可写流。

前面通过继承的方式去创建一类可读流，这种方法也适用于创建一类可写流，只是需要实现的是`_write(data, enc, next)`方法，而不是`_read()`方法。

有些简单的情况下不需要创建一类流，而只是一个流对象，可以用如下方式去做：

```js
'use strict'
const Writable = require('stream').Writable

const writable = Writable()
writable._write = function (data, enc, next) {
  process.stdout.write(data.toString().toUpperCase())
  process.nextTick(next)
}

writable.on('finish', () => process.stdout.write('DONE'))

writable.write('a' + '\n')
writable.write('b' + '\n')
writable.end('c' + '\n')

```

在`_write`中，**必须**调用`next(err)`来通知流此次底层的写操作已经完成，可以开始处理下一个数据。

上游通过调用`writable.write(data)`将数据写入可写流中，`write()`方法会调用`_write()`将`data`写入底层。当`_write`调用`next`方法时，表示底层的写操作完成，`writable`可以继续调用`_write`将新数据写入底层。

与可读流的`push`方法类似，`next`的调用既可以是同步的，也可以是异步地。譬如这里就是在下一个tick中。

上游**必须**调用`writable.end(data)`来结束可写流，`data`是可选的。此后，不能再调用`write`新增数据。

在`end`方法调用后，当所有底层的写操作均完成时，会触发`finish`事件。

## Duplex
创建可读可写流。

`Duplex`实际上就是继承了`Readable`和`Writable`。
所以，一个`Duplex`对象既可当成可读流来使用（需要实现`_read`方法），也可当成可写流来使用（需要实现`_write`方法）。

实现一个将字符流中小写字母转成大写的`Duplex`:
```js
'use strict'
const Duplex = require('stream').Duplex

class ToUpperCase extends Duplex{
  constructor() {
    super()
    this.chars = []

    this.once('finish', function () {
      this.push(null)
    })
  }

  _read() {
    if (this.chars.length) {
      this.push(this._transform(this.chars.shift()))
    }
  }

  _write(data, enc, next) {
    this.chars.push(data.toString())
    this._read()
    next()
  }

  _transform(str) {
    return str.toUpperCase()
  }
}

const duplex = new ToUpperCase()
duplex.on('data', data => process.stdout.write(data))

duplex.write('hello, ')
duplex.write('world!')
duplex.end()

```

上面的代码中实现了`_read`方法，所以可以监听`data`事件来消耗`Duplex`产生的数据。
同时，又实现了`_write`方法，可作为下游去消耗数据。

因为它既可读又可写，所以称它有两端：可写端和可读端。
可写端的接口与`Writable`一致，作为下游来使用；可读端的接口与`Readable`一致，作为上游来使用。

但这里加了点有趣的逻辑。
上面这个特殊的`duplex`本身不产生数据（`this.chars`是空的），但当它的可写端拿到数据时（`_write`被调用），会将数据作一个变换（`_transform`方法将小写转成大写），再放到可读端去（调用`push`方法）。从而达到了将上游小写字母变换成大写字母输出给下游的目的。

## Transform
从上面将小写转成大写的例子中，可以看出`Duplex`的可读端和可写端本身是隔离的，没有数据间的传递。`Transform`继承了`Duplex`，并实现了`_read`和`_write`方法，且其逻辑类似于例子中所示，目的就是将可读端和可写端打通，达到“变换数据”的目的。

所以说`Transform`是一类特殊的可读可写流。

用`Transform`重写上面的例子：
```js
'use strict'
const Transform = require('stream').Transform

class ToUpperCase extends Transform {
  constructor() {
    super()
  }
  _transform(data, enc, next) {
    this.push(data.toString().toUpperCase())
    next()
  }
}

const transform = new ToUpperCase()
transform.on('data', data => process.stdout.write(data))

transform.write('hello, ')
transform.write('world!')
transform.end()

```

**注意**：使用`Duplex`时，可以实现`_read`或`_write`，或两者都实现，但不要求实现`_transform`方法。使用`Transform`时，不要去实现`_read`和`_write`，而是要实现`_transform`。这个方法就是变换数据的逻辑。

`_transform`方法有点像集成了`_read`和`_write`的逻辑。
调用`push(data)`来为可读端提供数据，同步或异步地调用`next`方法来表示此次转换已经完成，可以开始处理下一个数据。

## objectMode
前面几节的例子中，经常看到调用`data.toString()`。这个`toString()`的调用是必须的吗？
本节介绍完如何控制流中的数据类型后，自然就有了答案。

在shell中，用管道（`|`）连接上下游。上游输出的是文本流（标准输出流），下游输入的也是文本流（标准输入流）。在本文介绍的流中，默认也是如此。

对于可读流来说，`push(data)`时，`data`只能是`String`或`Buffer`类型，而消耗时`data`事件输出的数据都是`Buffer`类型。对于可写流来说，`write(data)`时，`data`只能是`String`或`Buffer`类型，`_write(data)`调用时传进来的`data`都是`Buffer`类型。

也就是说，流中的数据默认情况下都是`Buffer`类型。产生的数据一放入流中，便转成`Buffer`被消耗；写入的数据在传给底层写逻辑时，也被转成`Buffer`类型。

但每个构造函数都接收一个配置对象，有一个`objectMode`的选项，一旦设置为`true`，就能出现“种瓜得瓜，种豆得豆”的效果。

`Readable`未设置`objectMode`时：
```js
const Readable = require('stream').Readable

const readable = Readable()

readable.push('a')
readable.push('b')
readable.push(null)

readable.on('data', data => console.log(data))

```
输出：
```
<Buffer 61>
<Buffer 62>

```

`Readable`设置`objectMode`后：
```js
const Readable = require('stream').Readable

const readable = Readable({ objectMode: true })

readable.push('a')
readable.push('b')
readable.push({})
readable.push(null)

readable.on('data', data => console.log(data))

```
输出：
```
a
b
{}

```

可见，设置`objectMode`后，`push(data)`的数据被原样的输出了。此时，可以生产任意类型的数据。

## 相关
- [Node.js Stream - 进阶篇](../internals/index.md)
- [Node.js Stream - 实战篇](../programming/index.md)

## 参考文献
- [substack#browserify-handbook]
- [zoubin#streamify-your-node-program]


[Node.js]: https://nodejs.org/
[stream]: https://nodejs.org/api/stream.html
[迭代器]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
[substack#browserify-handbook]: https://github.com/substack/browserify-handbook
[zoubin#streamify-your-node-program]: https://github.com/zoubin/streamify-your-node-program

