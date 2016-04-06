# Node.js Stream - 实战篇
本文从对[Browserify]和[Gulp]的架构分析中，总结出基于Stream的两种插件机制。

## 管道
所谓“管道”，指的是通过`a.pipe(b)`的形式连接起来的多个Stream对象的组合。

假如现在有两个`Transform`：`bold`和`red`，分别可将文本流中某些关键字加粗和飘红。
可以按下面的方式对文本同时加粗和飘红：
```js
// source: 输入流
// dest: 输出目的地
source.pipe(bold).pipe(red).pipe(dest)

```

`bold.pipe(red)`便可以看作一个管道，输入流先后经过`bold`和`red`的变换再输出。

但如果这种加粗且飘红的功能的应用场景很广，我们期望的使用方式是：
```js
// source: 输入流
// dest: 输出目的地
// pipeline: 加粗且飘红
source.pipe(pipeline).pipe(dest)

```

此时，`pipeline`封装了`bold.pipe(red)`，从逻辑上来讲，也称其为管道。
其实现可简化为：
```js
var pipeline = new Duplex()
var streams = pipeline._streams = [bold, red]

// 底层写逻辑：将数据写入管道的第一个Stream，即bold
pipeline._write = function (buf, enc, next) {
  streams[0].write(buf, enc, next)
}

// 底层读逻辑：从管道的最后一个Stream（即red）中读取数据
pipeline._read = function () {
  var buf
  var reads = 0
  var r = streams[streams.length - 1]
  // 将缓存读空
  while ((buf = r.read()) !== null) {
    pipeline.push(buf)
    reads++
  }
  if (reads === 0) {
    // 缓存本来为空，则等待新数据的到来
    r.once('readable', function () {
      pipeline._read()
    })
  }
}

// 将各个Stream组合起来（此处等同于`bold.pipe(red)`）
streams.reduce(function (r, next) {
  r.pipe(next)
  return next
})

```

往`pipeline`写数据时，数据直接写入`bold`，再流向`red`，最后从`pipeline`读数据时再从`red`中读出。

如果需要在中间新加一个`underline`的Stream，可以：
```js
pipeline._streams.splice(1, 0, underline)
bold.unpipe(red)
bold.pipe(underline).pipe(red)

```

如果要将`red`替换成`green`，可以：
```js
// 删除red
pipeline._streams.pop()
bold.unpipe(red)

// 添加green
pipeline._streams.push(green)
bold.pipe(green)

```

可见，这种管道的各个环节是可以修改的。

[stream-splicer]对上述逻辑进行了进一步封装，提供`splice`、`push`、`pop`等方法，使得`pipeline`可以像数组那样被修改：
```js
var splicer = require('stream-splicer')
var pipeline = splicer([bold, red])
// 在中间添加underline
pipeline.splice(1, 0, underline)

// 删除red
pipeline.pop()

// 添加green
pipeline.push(green)

```

[labeled-stream-splicer]在此基础上又添加了使用名字替代下标进行操作的功能：
```js
var splicer = require('labeled-stream-splicer')
var pipeline = splicer([
  'bold', bold,
  'red', red,
])

// 在`red`前添加underline
pipeline.splice('red', 0, underline)

// 删除`bold`
pipeline.splice('bold', 1)

```

由于`pipeline`本身与其各个环节一样，也是一个Stream对象，因此可以嵌套：
```js
var splicer = require('labeled-stream-splicer')
var pipeline = splicer([
  'style', [ bold, red ],
  'insert', [ comma ],
])

pipeline.get('style')     // 取得管道：[bold, red]
  .splice(1, 0, underline) // 添加underline

```

## Browserify
[Browserify]的功能介绍可见[substack#browserify-handbook]，其核心逻辑的实现在于管道的设计：

```js
var splicer = require('labeled-stream-splicer')
var pipeline = splicer.obj([
    // 记录输入管道的数据，重建管道时直接将记录的数据写入。
    // 用于像watch时需要多次打包的情况
    'record', [ this._recorder() ],
    // 依赖解析，预处理
    'deps', [ this._mdeps ],
    // 处理JSON文件
    'json', [ this._json() ],
    // 删除文件前面的BOM
    'unbom', [ this._unbom() ],
    // 删除文件前面的`#!`行
    'unshebang', [ this._unshebang() ],
    // 语法检查
    'syntax', [ this._syntax() ],
    // 排序，以确保打包结果的稳定性
    'sort', [ depsSort(dopts) ],
    // 对拥有同样内容的模块去重
    'dedupe', [ this._dedupe() ],
    // 将id从文件路径转换成数字，避免暴露系统路径信息
    'label', [ this._label(opts) ],
    // 为每个模块触发一次dep事件
    'emit-deps', [ this._emitDeps() ],
    'debug', [ this._debug(opts) ],
    // 将模块打包
    'pack', [ this._bpack ],
    // 更多自定义的处理
    'wrap', [],
])

```

一个模块用`row`表示：
```js
{
  // 模块的唯一标识
  id: id,
  // 模块对应的文件路径
  file: '/path/to/file',
  // 模块内容
  source: '',
  // 模块的依赖
  deps: {
    // `require(expr)`
    expr: id,
  }
}

```

在`wrap`阶段前，所有的阶段都处理这样的对象流，且除`pack`外，都输出这样的流。
有的补充`row`中的一些信息，有的则对这些信息做一些变换，有的只是读取和输出。
一般`row`中的`source`、`deps`内容都是在`deps`阶段解析出来的。

下面提供一个修改[Browserify]管道的函数。

```js
var Transform = require('stream').Transform
// 创建Transform对象
function through(write, end) {
  return Transform({
    transform: write,
    flush: end,
  })
}

// `b`为Browserify实例
// 该插件可打印出打包时间
function log(b) {
  // watch时需要重新打包，整个pipeline会被重建，所以也要重新修改
  b.on('reset', reset)
  // 修改当前pipeline
  reset()

  function reset () {
    var time = null
    var bytes = 0
    b.pipeline.get('record').on('end', function () {
      // 以record阶段结束为起始时刻
      time = Date.now()
    })

    // `wrap`是最后一个阶段，在其后添加记录结束时刻的Transform
    b.pipeline.get('wrap').push(through(write, end))
    function write (buf, enc, next) {
      // 累计大小
      bytes += buf.length
      this.push(buf)
      next()
    }
    function end () {
      // 打包时间
      var delta = Date.now() - time
      b.emit('time', delta)
      b.emit('bytes', bytes)
      b.emit('log', bytes + ' bytes written ('
        + (delta / 1000).toFixed(2) + ' seconds)'
      )
      this.push(null)
    }
  }
}

var fs = require('fs')
var browserify = require('browserify')
var b = browserify(opts)
// 应用插件
b.plugin(log)
b.bundle().pipe(fs.createWriteStream('bundle.js'))

```

事实上，这里的`b.plugin(log)`就是直接执行了`log(b)`。

在插件中，可以修改`b.pipeline`中的任何一个环节。
因此，[Browserify]本身只保留了必要的功能，其它都由插件去实现，如[watchify]、[factor-bundle]等。

除了了上述的插件机制外，[Browserify]还有一套Transform机制，即通过`b.transform(transform)`可以新增一些文件内容预处理的Transform。
预处理是发生在`deps`阶段的，当模块文件内容被读出来时，会经过这些Transform处理，然后才做依赖解析，如[babelify]、[envify]。

## Gulp
[Gulp]的核心逻辑分成两块：任务调度与文件处理。
任务调度是基于[orchestrator]，而文件处理则是基于[vinyl-fs]。

类似于[Browserify]提供的模块定义（用`row`表示），[vinyl-fs]也提供了文件定义（[vinyl]对象）。

[Browserify]的管道处理的是`row`流，[Gulp]管道处理[vinyl]流：

```js
gulp.task('scripts', ['clean'], function() {
  // Minify and copy all JavaScript (except vendor scripts) 
  // with sourcemaps all the way down 
  return gulp.src(paths.scripts)
    .pipe(sourcemaps.init())
    .pipe(coffee())
    .pipe(uglify())
    .pipe(concat('all.min.js'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('build/js'));
});

```

任务中创建的管道起始于`gulp.src`，终止于`gulp.dest`，中间有若干其它的Transform（插件）。

如果与[Browserify]的管道对比，可以发现[Browserify]是确定了一条具有完整功能的管道，而[Gulp]本身只提供了创建[vinyl]流和将[vinyl]流写入磁盘的工具，管道中间经历什么全由用户决定。
这是因为任务中做什么，是没有任何限制的，文件处理也只是常见的情况，并非一定要用`gulp.src`与`gulp.dest`。

## 两种模式
[Browserify]与[Gulp]都借助管道的概念来实现插件机制。

[Browserify]定义了模块的数据结构，提供了默认的管道以处理这样的数据流，而插件可用来修改管道结构，以定制处理行为。

[Gulp]虽也定义了文件的数据结构，但只提供产生、消耗这种数据流的接口，完全由用户通过插件去构造处理管道。

当明确具体的处理需求时，可以像[Browserify]那样，构造一个基本的处理管道，以提供插件机制。
如果需要的是实现任意功能的管道，可以如[Gulp]那样，只提供数据流的抽象。

## 实例
本节中实现一个针对[Git]仓库自动生成changelog的工具[ezchangelog]。

[ezchangelog]的输入为`git log`生成的文本流，输出默认为markdown格式的文本流，但可以修改为任意的自定义格式。

输入示意：
```
commit 9c5829ce45567bedccda9beb7f5de17574ea9437
Author: zoubin <zoubin04@gmail.com>
Date:   Sat Nov 7 18:42:35 2015 +0800

    CHANGELOG

commit 3bf9055b732cc23a9c14f295ff91f48aed5ef31a
Author: zoubin <zoubin04@gmail.com>
Date:   Sat Nov 7 18:41:37 2015 +0800

    4.0.3

commit 87abe8e12374079f73fc85c432604642059806ae
Author: zoubin <zoubin04@gmail.com>
Date:   Sat Nov 7 18:41:32 2015 +0800

    fix readme
    add more tests

```

输出示意：
```markdown
* [[`9c5829c`](https://github.com/zoubin/ezchangelog/commit/9c5829c)] CHANGELOG

## [v4.0.3](https://github.com/zoubin/ezchangelog/commit/3bf9055) (2015-11-07)

* [[`87abe8e`](https://github.com/zoubin/ezchangelog/commit/87abe8e)] fix readme

    add more tests

```

其实需要的是这样一个`pipeline`：
```js
source.pipe(pipeline).pipe(dest)

```

可以分为两个阶段：
* parse：从输入文本流中解析出commit信息
* format: 将commit流变换为文本流

默认的情况下，要想得到示例中的markdown，需要解析出每个commit的sha1、日期、消息、是否为tag。
定义commit的格式如下：
```js
{
  commit: {
    // commit sha1
    long: '3bf9055b732cc23a9c14f295ff91f48aed5ef31a',
    short: '3bf9055',
  },
  committer: {
    // commit date
    date: new Date('Sat Nov 7 18:41:37 2015 +0800'),
  },
  // raw message lines
  messages: ['', '    4.0.3', ''],
  // raw headers before the messages
  headers: [
    ['Author', 'zoubin <zoubin04@gmail.com>'],
    ['Date', 'Sat Nov 7 18:41:37 2015 +0800'],
  ],
  // the first non-empty message line
  subject: '4.0.3',
  // other message lines
  body: '',
  // git tag
  tag: 'v4.0.3',
  // link to the commit. opts.baseUrl should be specified.
  url: 'https://github.com/zoubin/ezchangelog/commit/3bf9055',
}

```

于是有：
```js
var splicer = require('labeled-stream-splicer')
pipeline = splicer.obj([
  'parse', [
    // 按行分隔
    'split', split(),
    // 生成commit对象，解析出sha1和日期
    'commit', commit(),
    // 解析出tag
    'tag', tag(),
    // 解析出url
    'url', url({ baseUrl: opts.baseUrl }),
  ],
  'format', [
    // 将commit组合成markdown文本
    'markdownify', markdownify(),
  ],
])

```

至此，基本功能已经实现。
现在将其封装并提供插件机制。

```js
function Changelog(opts) {
  opts = opts || {}
  this._options = opts
  // 创建pipeline
  this.pipeline = splicer.obj([
    'parse', [
      'split', split(),
      'commit', commit(),
      'tag', tag(),
      'url', url({ baseUrl: opts.baseUrl }),
    ],
    'format', [
      'markdownify', markdownify(),
    ],
  ])

  // 应用插件
  ;[].concat(opts.plugin).filter(Boolean).forEach(function (p) {
    this.plugin(p)
  }, this)
}

Changelog.prototype.plugin = function (p, opts) {
  if (Array.isArray(p)) {
    opts = p[1]
    p = p[0]
  }
  // 执行插件函数，修改pipeline
  p(this, opts)
  return this
}

```

上面的实现提供了两种方式来应用插件。
一种是通过配置传入，另一种是创建实例后再调用`plugin`方法，本质一样。

为了使用方便，还可以简单封装一下。
```js
function changelog(opts) {
  return new Changelog(opts).pipeline
}

```

这样，就可以如下方式使用：
```js
source.pipe(changelog()).pipe(dest)

```

这个已经非常接近我们的预期了。

现在来开发一个插件，修改默认的渲染方式。

```js
var through = require('through2')

function customFormatter(c) {
  // c是`Changelog`实例

  // 添加解析author的transform
  c.pipeline.get('parse').push(through.obj(function (ci, enc, next) {
    // parse the author name from: 'zoubin <zoubin04@gmail.com>'
    ci.committer.author = ci.headers[0][1].split(/\s+/)[0]
    next(null, ci)
  }))

  // 替换原有的渲染
  c.pipeline.get('format').splice('markdownify', 1, through.obj(function (ci, enc, next) {
    var sha1 = ci.commit.short
    sha1 = '[`' + sha1 + '`](' + c._options.baseUrl + sha1 + ')'
    var date = ci.committer.date.toISOString().slice(0, 10)
    next(null, '* ' + sha1 + ' ' + date + ' @' + ci.committer.author + '\n')
  }))
}

source
  .pipe(changelog({
    baseUrl: 'https://github.com/zoubin/ezchangelog/commit/',
    plugin: [customFormatter],
  }))
  .pipe(dest)

```

同样的输入，输出将会是：
```markdown
* [`9c5829c`](https://github.com/zoubin/ezchangelog/commit/9c5829c) 2015-11-07 @zoubin
* [`3bf9055`](https://github.com/zoubin/ezchangelog/commit/3bf9055) 2015-11-07 @zoubin
* [`87abe8e`](https://github.com/zoubin/ezchangelog/commit/87abe8e) 2015-11-07 @zoubin

```

可以看出，通过创建可修改的管道，[ezchangelog]保持了本身逻辑的单一性，同时又提供了强大的自定义空间。

## 相关
- [Node.js Stream - 基础篇](../basics/index.md)
- [Node.js Stream - 进阶篇](../internals/index.md)

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
[labeled-stream-splicer]: https://github.com/substack/labeled-stream-splicer
[stream-splicer]: https://github.com/substack/stream-splicer
[watchify]: https://github.com/substack/watchify
[factor-bundle]: https://github.com/substack/factor-bundle
[envify]: https://github.com/hughsk/envify
[babelify]: https://github.com/babel/babelify
[orchestrator]: https://github.com/robrich/orchestrator
[vinyl-fs]: https://github.com/gulpjs/vinyl-fs
[vinyl]: https://github.com/gulpjs/vinyl
[ezchangelog]: https://github.com/zoubin/ezchangelog

