# Node.js Stream - 数据的流式消耗
所谓“流式数据”，是指按时间先后到达的数据序列。

## 数据消耗模式
可以在两种模式下消耗可读流中的数据：暂停模式（paused mode）和流动模式（flowing mode）。

流动模式下，数据会源源不断地生产出来，形成“流动”现象。
监听流的`data`事件便可进入该模式。

暂停模式下，需要显示地调用`read()`，触发`data`事件。

可读流对象`readable`中有一个维护状态的对象，`readable._readableState`，这里简称为`state`。
其中有一个标记，`state.flowing`， 可用来判别流的模式。
它有三种可能值：
* `true`。流动模式。
* `false`。暂停模式。
* `null`。初始状态。

调用`readable.resume()`可使流进入流动模式，`state.flowing`被设为`true`。
调用`readable.pause()`可使流进入暂停模式，`state.flowing`被设为`false`。

## 暂停模式
在初始状态下，监听`data`事件，会使流进入流动模式。
但如果在暂停模式下，监听`data`事件并不会使它进入流动模式。
为了消耗流，需要显示调用`read()`方法。

```js
const Readable = require('stream').Readable

// 底层数据
const dataSource = ['a', 'b', 'c']

const readable = Readable()
readable._read = function () {
  if (dataSource.length) {
    this.push(dataSource.shift())
  } else {
    this.push(null)
  }
}

// 进入暂停模式
readable.pause()
readable.on('data', data => process.stdout.write('\ndata: ' + data))

var data = readable.read()
while (data !== null) {
  process.stdout.write('\nread: ' + data)
  data = readable.read()
}

```

执行上面的脚本，输出如下：
```

data: a
read: a
data: b
read: b
data: c
read: c

```

可见，在暂停模式下，调用一次`read`方法便读取一次数据。
执行`read()`时，如果缓存中数据不够，会调用`_read()`去底层取。
`_read`方法中可以同步或异步地调用`push(data)`来将底层数据交给流处理。

在上面的例子中，由于是同步调用`push`方法，数据会添加到缓存中。
`read`方法在执行完`_read`方法后，便从缓存中取数据，再返回，且以`data`事件输出。

如果改成异步调用`push`方法，则由于`_read()`执行完后，数据来不及放入缓存，
将出现`read()`返回`null`的现象。
见下面的示例：
```js
const Readable = require('stream').Readable

// 底层数据
const dataSource = ['a', 'b', 'c']

const readable = Readable()
readable._read = function () {
  process.nextTick(() => {
    if (dataSource.length) {
      this.push(dataSource.shift())
    } else {
      this.push(null)
    }
  })
}

readable.pause()
readable.on('data', data => process.stdout.write('\ndata: ' + data))

while (null !== readable.read()) ;

```
执行上述脚本，可以发现没有任何数据输出。

此时，需要使用`readable`事件：
```js
const Readable = require('stream').Readable

// 底层数据
const dataSource = ['a', 'b', 'c']

const readable = Readable()
readable._read = function () {
  process.nextTick(() => {
    if (dataSource.length) {
      this.push(dataSource.shift())
    } else {
      this.push(null)
    }
  })
}

readable.pause()
readable.on('data', data => process.stdout.write('\ndata: ' + data))

readable.on('readable', function () {
  while (null !== readable.read()) ;;
})

```

输出：
```

data: a
data: b
data: c

```

当`read()`返回`null`时，意味着当前缓存数据不够，而且底层数据还没加进来（异步调用`push()`）。
此种情况下`state.needReadable`会被设置为`true`。
`push`方法被调用时，由于是暂停模式，不会立即输出数据，而是将数据放入缓存，并触发一次`readable`事件。

所以，一旦`read`被调用，上面的例子中就会形成一个循环：`readable`事件导致`read`方法调用，`read`方法又触发`readable`事件。

首次监听`readable`事件时，还会触发一次`read(0)`的调用，从而引起`_read`和`push`方法的调用，从而启动循环。

总之，在暂停模式下需要使用`readable`事件和`read`方法来消耗流。

## 流动模式
流动模式使用起来更简单一些。

一般创建流后，监听`data`事件，或者通过`pipe`方法将数据导向另一个可写流，即可进入流动模式开始消耗数据。
尤其是`pipe`方法中还提供了[背压]机制，所以使用`pipe`进入流动模式的情况非常普遍。

本节解释`data`事件如何能触发流动模式。

先看一下`Readable`是如何处理`data`事件的监听的：
```js
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn)
  if (ev === 'data' && false !== this._readableState.flowing) {
    this.resume()
  }

  // 处理readable事件的监听
  // 省略

  return res
}

```

`Stream`继承自[`EventEmitter`]，且是`Readable`的父类。
从上面的逻辑可以看出，在将`fn`加入事件队列后，如果发现处于非暂停模式，则会调用`this.resume()`，开始流动模式。

`resume()`方法先将`state.flowing`设为`true`，
然后会在下一个tick中执行`flow`，试图将缓存读空：
```js
if (state.flowing) do {
  var chunk = stream.read()
} while (null !== chunk && state.flowing)

```

`flow`中每次`read()`都可能触发`push()`的调用，
而`push()`中又可能触发`flow()`或`read()`的调用，
这样就形成了数据生生不息的流动。
其关系可简述为：

![flowing-mode]

下面再详细看一下`push()`的两个分支：
```js
if (state.flowing && state.length === 0 && !state.sync) {
  stream.emit('data', chunk)
  stream.read(0)
} else {
  state.length += state.objectMode ? 1 : chunk.length
  state.buffer.push(chunk)

  if (state.needReadable)
    emitReadable(stream)
}

```

称第一个分支为立即输出。

在立即输出的情况下，输出数据后，执行`read(0)`，进一步引起`_read()`和`push()`的调用，从而使数据源源不断地输出。

在非立即输出的情况下，数据先被添加到缓存中。
此时有两种情况：
* `state.length`为0。
  这时，在调用`_read()`前，`state.needReadable`就会被设为`true`。
  因此，一定会调用`emitReadable()`。
  这个方法会在下一个tick中触发`readable`事件，同时再调用`flow()`，从而形成流动。
* `state.length`不为0。
  由于流动模式下，每次都是从缓存中取第一个元素，所以这时`read()`返回值一定不为`null`。
  故`flow()`中的循环还在继续。

此外，从`push()`的两个分支可以看出来，如果`state.flowing`设为`false`，第一个分支便不会再进去，也就不会再调用`read(0)`。
同时第二个分支中引发`flow`的调用后，也不会再调用`read()`，这就完全暂停了底层数据的读取。

事实上，`pause`方法就是这样使流从流动模式转换到暂停模式的。

[`EventEmitter`]: https://nodejs.org/api/events.html#events_class_eventemitter
[背压]: http://baike.baidu.com/link?url=MvuUdBitMnXIa1qj5MZihQbK6c1KDMW6HLPGZMGEUP7DlBbxJsAfV80lXKPKSteQrlh1ikEN0CYQOCW0PNvnx_

[data-flow]: assets/data-flow.svg
[flowing-mode]: assets/flowing-mode.svg

