# Node.js Stream - 流的背压反馈机制
考虑下面的例子：
```js
const fs = require('fs')
fs.createReadStream(file).on('data', doSomething)

```

监听`data`事件后文件中的内容便立即开始源源不断地传给`doSomething()`。
如果`doSomething`处理数据较慢，就需要缓存来不及处理的数据`data`，占用大量内存。

理想的情况是下游消耗一个数据，上游才生产一个新数据，这样整体的内存使用就能保持在一个水平。
[`Readable`]提供`pipe`方法，用来实现这个功能。

## pipe
用`pipe`方法连接上下游：
```js
const fs = require('fs')
fs.createReadStream(file).pipe(writable)

```

`writable`是一个可写流[`Writable`]对象，上游调用其`write`方法将数据写入其中。
`writable`内部维护了一个写队列，当这个队列长度达到某个阈值（`state.highWaterMark`）时，
执行`write()`时返回`false`，否则返回`true`。

于是上游可以根据`write()`的返回值在流动模式和暂停模式间切换：
```js
readable.on('data', function (data) {
  if (false === writable.write(data)) {
    readable.pause()
  }
})

writable.on('drain', function () {
  readable.resume()
})

```

上面便是`pipe`方法的核心逻辑。

当`write()`返回`false`时，调用`readable.pause()`使上游进入暂停模式，不再触发`data`事件。
但是当`writable`将缓存清空时，会触发一个`drain`事件，再调用`readable.resume()`使上游进入流动模式，继续触发`data`事件。

看一个例子：
```js
const stream = require('stream')

var c = 0
const readable = stream.Readable({
  highWaterMark: 2,
  read: function () {
    process.nextTick(() => {
      var data = c < 6 ? String.fromCharCode(c + 65) : null
      console.log('push', ++c, data)
      this.push(data)
    })
  }
})

const writable = stream.Writable({
  highWaterMark: 2,
  write: function (chunk, enc, next) {
    console.log('write', chunk)
  }
})

readable.pipe(writable)

```

输出：
```
push 1 A
write <Buffer 41>
push 2 B
push 3 C
push 4 D

```

虽然上游一共有6个数据（`ABCDEF`）可以生产，但实际只生产了4个（`ABCD`）。
这是因为第一个数据（`A`）迟迟未能写完（未调用`next()`），所以后面通过`write`方法添加进来的数据便被缓存起来。
下游的缓存队列到达2时，`write`返回`false`，上游切换至暂停模式。
此时下游保存了`AB`。
由于[`Readable`]总是缓存`state.highWaterMark`这么多的数据，所以上游保存了`CD`。
从而一共生产出来`ABCD`四个数据。

下面使用[tick-node]将[`Readable`]的debug信息按tick分组：
```
⌘ NODE_DEBUG=stream tick-node pipe.js
STREAM 18930: pipe count=1 opts=undefined
STREAM 18930: resume
---------- TICK 1 ----------
STREAM 18930: resume read 0
STREAM 18930: read 0
STREAM 18930: need readable false
STREAM 18930: length less than watermark true
STREAM 18930: do read
STREAM 18930: flow true
STREAM 18930: read undefined
STREAM 18930: need readable true
STREAM 18930: length less than watermark true
STREAM 18930: reading or ended false
---------- TICK 2 ----------
push 1 A
STREAM 18930: ondata
write <Buffer 41>
STREAM 18930: read 0
STREAM 18930: need readable true
STREAM 18930: length less than watermark true
STREAM 18930: do read
---------- TICK 3 ----------
push 2 B
STREAM 18930: ondata
STREAM 18930: call pause flowing=true
STREAM 18930: pause
STREAM 18930: read 0
STREAM 18930: need readable true
STREAM 18930: length less than watermark true
STREAM 18930: do read
---------- TICK 4 ----------
push 3 C
STREAM 18930: emitReadable false
STREAM 18930: emit readable
STREAM 18930: flow false
---------- TICK 5 ----------
STREAM 18930: maybeReadMore read 0
STREAM 18930: read 0
STREAM 18930: need readable false
STREAM 18930: length less than watermark true
STREAM 18930: do read
---------- TICK 6 ----------
push 4 D
---------- TICK 7 ----------

```

* TICK 0: `readable.resume()`
* TICK 1: `readable`在流动模式下开始从底层读取数据
* TICK 2: `A`被输出，同时执行`readable.read(0)`。
* TICK 3: `B`被输出，同时执行`readable.read(0)`。
  `writable.write('B')`返回`false`。
  执行`readable.pause()`切换至暂停模式。
* TICK 4: TICK 3中`read(0)`引起`push('C')`的调用，`C`被加到`readable`缓存中。
  此时，`writable`中有`A`和`B`，`readable`中有`C`。
  这时已在暂停模式，但在`readable.push('C')`结束前，发现缓存中只有1个数据，小于设定的`highWaterMark`（2），故准备在下一个tick再读一次数据。
* TICK 5: 调用`read(0)`从底层取数据。
* TICK 6: `push('D')`，`D`被加到`readable`缓存中。
  此时，`writable`中有`A`和`B`，`readable`中有`C`和`D`。
  `readable`缓存中有2个数据，等于设定的`highWaterMark`（2），不再从底层读取数据。

可以认为，随着下游缓存队列的增加，上游写数据时受到的阻力变大。
这种[背压]（[back pressure]）大到一定程度时上游便停止写，等到[背压]降低时再继续。

## 消耗驱动的数据生产
使用`pipe()`时，数据的生产和消耗形成了一个闭环。
通过负反馈调节上游的数据生产节奏，事实上形成了一种所谓的拉式流（[pull stream]）。

用喝饮料来说明拉式流和普通流的区别的话，普通流就像是将杯子里的饮料往嘴里倾倒，动力来源于上游，数据是被推往下游的；拉式流则是用吸管去喝饮料，动力实际来源于下游，数据是被拉去下游的。

所以，使用拉式流时，是“按需生产”。
如果下游停止消耗，上游便会停止生产。
所有缓存的数据量便是两者的阈值和。

当使用[`Transform`]作为下游时，尤其需要注意消耗。
```js
const stream = require('stream')

var c = 0
const readable = stream.Readable({
  highWaterMark: 2,
  read: function () {
    process.nextTick(() => {
      var data = c < 26 ? String.fromCharCode(c++ + 97) : null
      console.log('push', data)
      this.push(data)
    })
  }
})

const transform = stream.Transform({
  highWaterMark: 2,
  transform: function (buf, enc, next) {
    console.log('transform', buf)
    next(null, buf)
  }
})

readable.pipe(transform)

```
以上代码执行结果为：
```
push a
transform <Buffer 61>
push b
transform <Buffer 62>
push c
push d
push e
push f

```

可见，并没有将26个字母全生产出来。

[`Transform`]中有两个缓存：可写端的缓存和可读端的缓存。

调用`transform.write()`时，如果可读端缓存未满，数据会经过变换后加入到可读端的缓存中。
当可读端缓存到达阈值后，再调用`transform.write()`则会将写操作缓存到可写端的缓存队列。
当可写端的缓存队列也到达阈值时，`transform.write()`返回`false`，上游进入暂停模式，不再继续`transform.write()`。
所以，上面的`transform`中实际存储了4个数据，`ab`在可读端（经过了`_transform`的处理），`cd`在可写端（还未经过`_transform`处理）。

此时，由前面一节的分析可知，`readable`将缓存`ef`，之后便不再生产数据。

这三个缓存加起来的长度恰好为6，所以一共就生产了6个数据。

要想将26个数据全生产出来，有两种做法。
第一种是消耗`transform`中可读端的缓存，以拉动上游的生产：
```js
readable.pipe(transform).pipe(process.stdout)

```

第二种是，不要将数据存入可读端中，这样可读端的缓存便会一直处于数据不足状态，上游便会源源不断地生产数据：
```js
const transform = stream.Transform({
  highWaterMark: 2,
  transform: function (buf, enc, next) {
    next()
  }
})

```

[`Readable`]: https://nodejs.org/api/stream.html#stream_class_stream_readable_1
[`Writable`]: https://nodejs.org/api/stream.html#stream_class_stream_writable_1
[`Transform`]: https://nodejs.org/api/stream.html#stream_class_stream_transform_1
[tick-node]: https://github.com/zoubin/tick-node
[背压]: http://baike.baidu.com/view/1036778.htm
[back pressure]: https://en.wikipedia.org/wiki/Back_pressure
[pull stream]: http://howtonode.org/streams-explained

