# Node.js Stream

## 前言
在构建大型系统时，通常将其拆解为功能独立的若干部分，
这些部分的接口都遵循一定的规范，通过某种方式连接起来，以共同完成较复杂的任务。

在unix中，shell通过管道`|`连接各部分，其输入输出的规范是文本流。
在[Node.js]中，内置的[stream]模块也实现了类似功能，组件间通过`.pipe()`连接。

本系列试着从三个方面介绍[stream]相关的内容，这三部分各自独立，无须从头至尾全部读完。
* 第一部分：[stream]入门。介绍[stream]接口的基本使用。
* 第二部分：[stream]底层实现管窥。重点剖析[stream]底层是如何支持流式数据处理的，以及[stream]提供的背压机制是如何实现的。
* 第三部分：介绍如何使用[stream]进行程序设计。这部分会着重解析[Browserify]和[Gulp]的[stream]设计模式，并基于[stream]构建一个为[Git]仓库自动生成changelog的应用。

## Stream原理
主要解释[stream]的两个重要特点：流式数据与背压机制（backpressure mechanism）。

### 流式数据生产原理
假定需要处理一个文件。
一般地读取方法就是将整个文件全部读到内存里，
而流式读取是分多次读取，避免一次将所有内容全放到内存里。

```js
const fs = require('fs')

// 正常读取
// fileContents是所有内容
const fileContents = fs.readFileSync(file)

// 流式读取
const fileStream = fs.createReadStream(file)
// data先后多次生产，是连续的内容片段
fileStream.on('data', data => handle(data))

```

使用流式读取的好处是，其数据源可以是无穷无尽的，不受内存限制。

普通数据生产，需要一下子将所有数据全生产出来并存起来慢慢消耗，就好比用水需要将整个水库搬回家。
流式数据生产，则像是用一根管道将水库的水引回家使用。
上面的`fs.createReadStream`就像是往文件接了根管道，使内容逐渐“流”出来。
如果是按行处理，则处理完一行后便可以不再存储它，从而起到节省内存的效果。
当然，在流式数据生产时，消耗方是按时间顺序连续地获取到数据片段的，它要有处理这种“流式”数据的能力。

本小节主要介绍可读流是如何触发这些`data`事件的，即如何流式地产生数据的。

下面用`Readable`表示可读流类，`readable`为一个可读流实例。

#### 数据是如何添加到可读流中的
创建`Readable`对象`readable`时，需要为它提供`_read()`方法，这个方法的功能便是从底层读取数据。
譬如前面的`fileStream._read()`就会从文件中读取一部分内容。

在一次`_read()`调用中，通过调用`push(data)`方法，将从底层读取到的数据`data`放到流中。
当底层数据耗尽时，必须调用`push(null)`来通知流，此后就不能再往流中添加数据了。

可以同步地调用`push()`，如：
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

readable.on('data', data => process.stdout.write(data))
// abc

```

也可异步地调用`push()`，如：
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

因此，`_read()`是从底层将数据取出来的逻辑，而`push()`方法是将数据放入流中的逻辑。

在底层还有底层数据时，`_read()`会被调用去获取数据。
如果不以某种方式告诉流底层已无数据，它会一直去调用`_read()`。
这种方式即调用`push(null)`。
一旦调用过`push(null)`，便不能再调用`push(data)`，流也不会再调用`_read()`。

所以，还可以这样去使用流：
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

上面的例子中并没有为`readable`实现`_read`方法，因为在读取第一段数据时，已经调用过`push(null)`，也就再也不会调用`_read()`了。
实际中很少会这样使用，这里主要用来说明`_read`和`push`的功能。


#### 可读流的暂停模式
可以在两种模式下消耗可读流中的数据：暂停模式（paused mode）和流动模式（flowing mode）。

流动模式下，数据会源源不断地生产出来，形成“流动”现象。监听流的`data`事件便可进入该模式，如前面的例子所示。

暂停模式下，需要显示地调用`data = readable.read(n)`从流中获取数据。

不难想像，流动模式下，流会自动地调用`read(n)`并将数据输出。
所以，这里先介绍暂停模式下流是如何工作的。

##### 模式转换
`readable`中有一个维护状态的对象，`readable._readableState`，这里将简称为`state`。

其中中有一个标记，`state.flowing`，是用来判别流的模式的。
它有三种值：
* `true`。表示现在流处于流动模式下。
* `false`。表示现在流处于暂停模式下。
* `null`。这是流的初始状态。

调用`readable.resume()`可使流进入流动模式，`state.flowing`被设为`true`。
调用`readable.pause()`可使流进入暂停模式，`state.flowing`被设为`false`。

从前面的例子可以知道，在初始状态下，监听`data`事件，会使流进入流动模式。
但如果在暂停模式下，监听`data`事件并不会使它进入流动模式。

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
readable.on('data', data => process.stdout.write(data))
// 无数据输出

```

注意，上面例子中`pause()`方法的调用可以放到`data`事件的监听之后。
因为触发流动的逻辑是在下一个tick中，在实际流动前会判断`state.flowing`。

##### 从流中取出数据
上一节中的暂停流没有输出任何数据，那如何消耗一个暂停流中的数据呢？

可读流还提供了`read()`方法，用来实现这个功能。
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

var data
while (data = readable.read()) {
  process.stdout.write('\nread: ' + data)
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

可以看到，`read()`的返回值即从流中取出的数据。
所以，与`_read()`方法是从底层取数据的逻辑不一样，`read()`方法是从流中取数据的逻辑。

注意，这里还特意保留了监听`data`事件的逻辑。
可以看出，每次`read()`取出数据时，也是触发了`data`事件的。
因此，虽然在暂停模式下监听`data`事件不会引起状态的变化，但只要有数据被取出，都会触发它。

下图是`read()`执行时的简化逻辑。

![read]

从中可以看出，`read()`实际是从`state.buffer`中取数据，而`push()`实际上是将数据存入`state.buffer`。

`state.length`即缓存的数据量。

`state.reading`表示是否正在从底层取数据。
调用`_read()`时被设为`true`，接下来的`push()`调用均会重设为`false`。

##### readable事件
如果将前面的例子修改为异步地调用`push(data)`，结果如何？
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

while (readable.read()) ;;

```
执行上述脚本，可以发现没有任何数据输出。
这是因为当`_read()`异步调用`push()`时，会出现`read()`在`state.buffer`为空时拿数据的现象，自然就取不到。

可以试着将`state.buffer`打印出来:
```js
process.nextTick(function () {
  process.stdout.write('buffer: ' + readable._readableState.buffer)
})

```

这时的输出为：
```
buffer: a

```

可见第一次调用`readable.read()`时，并未拿到数据，但触发了（下一个tick中）一次`push`调用，所以有数据存入了`state.buffer`中。

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
  while (readable.read()) ;;
})

```

输出：
```

data: a
data: b
data: c

```

对于暂停流来说，`push(data)`时如果`state.needReadable`为`true`，则会触发`readable`事件。
这个事件会在下一个tick中触发，并且做了去重处理。
所以如果之前多次`push(data)`时要求`readable`事件，这里也只会触发一次。

`state.needReadable`初始值为`false`，在执行`read()`时遇到下面几种情况则会修改为`true`：
* 调用`_read()`前缓存为空。
* 未能从缓存中取到数据。
* 从缓存中取出数据后导致缓存为空，且还可以从底层获取数据（没有调用过`push(null)`）。

上面的逻辑就保证了，一旦`read()`没拿到数据，`push(data)`时就会触发`readable`事件。
所以能够持续不断地将数据读完。

可见，上面的`while`循环其实就是试图将缓存清空，一旦清空就会导致`push(data)`添加数据时引起另一轮的清理。

上面的例子中`read()`的调用引发了`readable`事件的触发（如果`read()`引起`push(data)`的调用而不是`push(null)`），
`readable`事件的触发进而引起`read()`的调用。
究竟最开始是调用了`read()`还是触发了`readable`事件？

首次监听`readable`事件时，会将`state.needReadable`设为`true`。
如果没有正在从底层读数据（`state.reading`为`false`）的话，会在下一个tick中调用`read(0)`。

虽然`read(0)`并不会从`state.buffer`中取数据（因为需要的数据量为0），
但是如果数据量足够（不需要调用`_read()`从底层取），则会触发`readable`事件。
如果数据量不够，则会调用`_read()`，进而导致`push(data)`的调用，从而触发`readable`事件。

所以，上面问题的答案就是，最初是从`read(0)`开始的，进而到`readable`事件，再到`read()`，然后再`readable`事件，如此循环。

**注意**：这里关于`readable`事件的触发时机分析是针对暂停流的。
在流动模式下，如果异步地执行`push(data)`，可能就不会将数据放入缓存，而是直接触发`data`事件输出了。

概括起来说，在暂停模式下，读取数据时如果出现了缓存数据不足的情况，
则在新进数据时就会通过`readable`事件通知消耗方再次尝试`read()`。
还可以调用`read(0)`来诱发`readable`事件。

#### 可读流的流动模式

`readable.read(n)`是`Readable`提供的读取数据的方法。
它里面会调用`_read()`去底层获取数据到流中，如果已经调用过`push(null)`，则`read()`不会再调用`_read()`。

所以，可以这样去构造一个简单



### 背压原理

## 相关
- [Node.js Stream入门](basics.md)
- [Node.js Stream程序设计](programming.md)

## 参考文献
- [substack#browserify-handbook]
- [zoubin#streamify-your-node-program]


[Node.js]: https://nodejs.org/
[stream]: https://nodejs.org/api/stream.html
[Browserify]: https://github.com/substack/node-browserify
[Gulp]: https://github.com/gulpjs/gulp
[Git]: https://git-scm.com/
[迭代器]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
[substack#browserify-handbook]: https://github.com/substack/browserify-handbook
[zoubin#streamify-your-node-program]: https://github.com/zoubin/streamify-your-node-program
[read]: read.png

