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

不难想像，流动模式下，流中会自动地调用`read(n)`并将数据输出。
所以，这里先介绍暂停模式下流是如何工作的。



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

