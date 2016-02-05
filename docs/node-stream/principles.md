## Node.js Stream进阶
主要解释[stream]的两个重要特点：流式数据与[背压]机制（[back pressure]）。

### 流式数据生产原理
所谓“流式数据”，是指按时间先后到达的数据序列。

在下面这个读取文件内容的例子中，文件内容被一次性读入内存，供消耗方使用。
```js
const fs = require('fs')
fs.readFile(__dirname + '/ua.txt', function (err, body) {
  console.log(body)
  console.log(body.toString())
})

```
其特点是文件全部内容同时可用。

但如果文件内容较大时，上面的做法就有很多问题。
譬如`ua.txt`在440M时，执行上述代码的输出为：
```
<Buffer 64 74 09 75 61 09 63 6f 75 6e 74 0a 0a 64 74 09 75 61 09 63 6f 75 6e 74 0a 32 30 31 35 31 32 30 38 09 4d 6f 7a 69 6c 6c 61 2f 35 2e 30 20 28 63 6f 6d ... >
buffer.js:382
    throw new Error('toString failed');
    ^

Error: toString failed
    at Buffer.toString (buffer.js:382:11)

```

可见，这种一次获取全部内容的做法，对内存要求太高，有些内置的操作甚至无法完成。

此时，可以考虑流式读取。
```js
const fs = require('fs')
fs.createReadStream(__dirname + '/ua.txt').pipe(process.stdout)

```

`fs.createReadStream`会创建一个可读流，将`ua.txt`中的数据逐块输出，形成一个按时间到达的数据序列。
因此，每一时刻只需要储存一小块数据，从而避免了一次性读取的内存限制问题。

#### 数据流转
前面用`fs.createReadStream`读取文件内容的过程可用下图描述：

![data-flow]

图中一共有三方：底层（数据源），流，下游（数据目的地）。
其中流做为数据流转中介，负责将数据从底层传给下游。

下面分别描述流与下游和底层的交互。

下游监听流的`data`事件，以接收流输出的数据。
需要数据时，调用流的`read`方法请求数据。
如果流的缓存中有足够的数据，`read()`会取出所需要的量的数据，
作为返回值返回，同时触发`data`事件，传输数据。
否则，需要从底层获取再以`data`事件传输，同时`read()`返回`null`。

当流需要从底层获取数据时，调用`_read`方法。
该方法由流的实现方提供，用于获取底层数据，并调用流的`push`方法传输给流。
譬如`fs.createReadStream()`创建的流中，`_read()`会调用[`fs.read()`]以获取文件内容。
可见，很多情况下从底层取数据是比较耗时的，`_read()`中会异步地调用`push()`。

下面是一个异步调用`push()`的例子：
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

readable.on('data', data => process.stdout.write(data))
// abc

```

由于流产生的是一个按时间先后到达的数据序列，所以底层需要显示地告诉流数据的终点。
具体便是调用`push(null)`。

前面提到，当流需要从底层获取数据时，才会调用`_read`方法。
如果不需要，则甚至可以不用实现`_read`。
所以还可以像下面这样去使用流：
```js
const Readable = require('stream').Readable

// 底层数据
const dataSource = ['a', 'b', 'c']

const readable = Readable()

readable.push(dataSource.shift())
readable.push(dataSource.shift())
readable.push(dataSource.shift())
readable.push(null)

readable.on('data', data => process.stdout.write(data))
// abc

```

在上面的例子中，一次性将所有数据都放到了流中，
后面再调用`read()`时，发现已经调用过`push(null)`，便不再调用`_read()`，
所以即使不去实现`_read`方法，也不会出错。
不过这种情况需要将所有数据全存到缓存中，与一次读取没有本质区别，实际用处不大。
这里列出来，是对`_read`方法说明的一个补充。

#### 数据消耗模式
可以在两种模式下消耗可读流中的数据：暂停模式（paused mode）和流动模式（flowing mode）。

流动模式下，数据会源源不断地生产出来，形成“流动”现象。
监听流的`data`事件便可进入该模式，如前面的例子所示。

暂停模式下，需要显示地调用`read()`，触发`data`事件。

可读流对象`readable`中有一个维护状态的对象，`readable._readableState`，这里简称为`state`。
其中有一个标记，`state.flowing`，是用来判别流的模式的。
它有三种可能值：
* `true`。表示目前是流动模式。
* `false`。表示目前是暂停模式。
* `null`。这是流的初始状态。

调用`readable.resume()`可使流进入流动模式，`state.flowing`被设为`true`。
调用`readable.pause()`可使流进入暂停模式，`state.flowing`被设为`false`。

#### 暂停模式
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

可以看到：
* 监听`data`事件能获取到每个数据。
* `read()`方法在这里每次都返回了数据。

下图是此处`read()`执行时的简化逻辑。

![read]

从图中可知，每次执行`read()`时，调用`_read()`，而`_read()`中同步地调用`push()`，
将数据写入`state.buffer`，故`read()`在调用完`_read()`后可立即获得该数据，
从而每次都能返回数据。

不难推测，如果异步地调用`push()`，则由于`_read()`执行完后，数据来不及放入缓存，
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

为了处理这种异步的情况，需要使用`readable`事件：
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

当`read()`返回`null`时，意味着当前缓存数据不够，而且底层数据还没加进来（异步调用`push()`），
为了能知道什么时候能接收到新数据，需要流提供一个事件，即`readable`事件。
当`push()`将数据放入缓存后，就会触发`readable`事件，于是继续执行`read()`就能拿到数据了。

所以，在上面的例子中，调用`read()`可能触发`readable`事件，从而继续`read()`，
直到`push(null)`，此后`read()`不会再调用`_read()`，也就跳出了这个循环。

但在上面的例子中，`read()`是在`readable`事件回调中执行的，那第一次`readable`事件是如何触发的呢？

原来，`Readable`中的`readable`事件与`data`事件一样，在监听时都做了特殊处理。
这里，首次监听`readable`事件时，会触发一次`read(0)`的调用。
虽然`read(0)`不消耗流的数据，但在执行时，流会发现自己的缓存是空的，
从而调用`_read()`引起`push()`调用，于是启动了循环。

总之，在暂停模式下需要使用`readable`事件和`read`方法来消耗流。

#### 流动模式
流动模式使用起来更简单一些。

一般创建流后，监听`data`事件，
或者通过`pipe`方法将数据导向另一个可写流，即可进入流动模式开始消耗数据。
尤其是`pipe`方法中还提供了[背压]机制，所以使用`pipe`进入流动模式的情况非常普遍。

本节解释`data`事件如何能触发流动模式，下节介绍[背压]原理时再详说`pipe`方法。

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
从上面的逻辑可以看出，在将`fn`加入事件队列后，如果发现处于非暂停模式，则会调用`this.resume()`，
从而开始了流动模式。

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

在第一个分支的情况下，`push()`是异步地被调用的，
所以无法在`read()`往缓存中取数据前将`chunk`放进缓存，
也就是说`read()`返回值一定不会为`chunk`。
同时，由于当前缓存为空，所以`chunk`即序列中的下一个数据。
由于以上两个原因，可直接通过`data`事件输出`chunk`。

下面是`read(n)`中调用`_read()`的逻辑：
```js
var doRead = state.needReadable

if (state.length === 0 || state.length - n < state.highWaterMark)
  doRead = true

if (state.ended || state.reading)
  doRead = false

if (doRead) {
  state.reading = true
  state.sync = true
  if (state.length === 0)
    state.needReadable = true
  this._read(state.highWaterMark)
  state.sync = false
}

```

在`push()`第一个分支中调用`read(0)`时，
由于缓存为空（`state.length`为0），故一定会调用`_read()`，
进而引起`push()`的调用，于是流动就行成了。

如果进入第二个分支，`chunk`会被添加到缓存中。
此时有两种情况：
* `state.length`为0。
  只可能是同步调用`push()`。
  从上面`read()`调用`_read()`时的逻辑可以看出，`state.needReadable`为`true`。
  因此，一定会调用`emitReadable()`。
  这个方法会在下一个tick中触发`readable`事件，同时再调用`flow()`，从而形成流动。
* `state.length`不为0。
  由于流动模式下，每次都是从缓存中取第一个元素，所以这时`read()`返回的一定不为`null`。
  故`flow()`中的循环还在继续。


综合以上两种情况，便知`resume()`会使底层数据源源不断地被读取出来。
同时，从`doRead`的赋值可知，缓存中的底层数据被限制在了`state.highWaterMark`。
每当`read()`从缓存中取走一部分数据时，都会尽量使缓存中的数据量保持在这个阈值，不够时才不会从底层取数据。

此外，从`push()`的两个分支可以看出来，如果`state.flowing`设为`false`，
第一个分支便不会再进去，也就不会再调用`read(0)`，
同时第二个分支中`flow()`也不会再调用`read()`，
这就完全暂停了底层数据的读取。
事实上，`pause()`方法中就是这样使流从流动模式转换到暂停模式的。

### 背压原理
考虑下面的例子：
```js
const fs = require('fs')
fs.createReadStream(file).on('data', doSomething)

```

从前面对[流式数据生产原理]的介绍中可知，
监听`data`事件后文件中的内容便立即开始源源不断地传给`doSomething()`。
如果`doSomething`处理数据较慢，就需要缓存来不及处理的数据`data`。
即使同时处理这些数据，也需要全部存储。

理想的情况是下游消耗一个数据，上游才生产一个新数据，这样整体的内存使用就能保持在一个水平。
这需要下游提供反馈给上游。

用`pipe`方法连接上下游便能达到这个效果。
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
但是当`writable`将缓存清空时，会触发一个`drain`事件，再调用`readable.resume()`使上游进入流动模式，
继续触发`data`事件。

可以认为，在上面的机制下，随着下游缓存队列的增加，上游写数据时受到的阻力变大。
这种[背压]（[back pressure]）大到一定程度时上游便停止写，等到[背压]降低时再继续。
当然，这里上游对[背压]的反应只是停止或继续，并没有连续变化。

使用`pipe()`时，数据的生产和消耗便形成了一个闭环。
通过负反馈调节上游的数据生产节奏，事实上形成了一种所谓的拉式流（[pull stream]）。

用喝饮料来说明拉式流和普通流的区别的话，
普通流就像是将杯子里的饮料往嘴里倾倒，动力来源于上游，数据是被推往下游的；
拉式流则是用吸管去喝饮料，动力实际来源于下游，数据是被拉去下游的。

### 需要注意的几个问题

#### stream.push('')
在[流动模式]中，介绍了`push()`如何与`flow()`和`read()`相互调用从而形成数据流动的，
其中提到了`push()`的两个分支。
但有一点未提出的是，如果是在非`objectMode`时调用`push('')`，这两个分支都不会进入，其后果便是数据流的中断。

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

可见，`push('')`后，流被中断了，一直没有结束。

#### 同一次_read()中多次调用push()
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

## 相关
- [Node.js Stream - 基础篇](basics.md)
- [Node.js Stream - 实战篇](programming.md)

## 参考文献
- [substack#browserify-handbook]
- [zoubin#streamify-your-node-program]


[Node.js]: https://nodejs.org/
[stream]: https://nodejs.org/api/stream.html
[Writable]: https://nodejs.org/api/stream.html#stream_class_stream_writable_1
[Browserify]: https://github.com/substack/node-browserify
[Gulp]: https://github.com/gulpjs/gulp
[Git]: https://git-scm.com/
[迭代器]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
[substack#browserify-handbook]: https://github.com/substack/browserify-handbook
[zoubin#streamify-your-node-program]: https://github.com/zoubin/streamify-your-node-program
[`fs.read()`]: https://nodejs.org/api/fs.html#fs_fs_read_fd_buffer_offset_length_position_callback
[`EventEmitter`]: https://nodejs.org/api/events.html#events_class_eventemitter
[背压]: http://baike.baidu.com/link?url=MvuUdBitMnXIa1qj5MZihQbK6c1KDMW6HLPGZMGEUP7DlBbxJsAfV80lXKPKSteQrlh1ikEN0CYQOCW0PNvnx_
[back pressure]: https://en.wikipedia.org/wiki/Back_pressure
[pull stream]: http://howtonode.org/streams-explained

[read]: read.png
[data-flow]: data-flow.png
[flow-read-push]: flow-read-push.png
[flowing-mode]: flowing-mode.png

[流动模式]: #流动模式
[流式数据生产原理]: #流式数据生产原理
