# Node.js Stream - 流对数据的编码与解码
经过流中转的数据，可能会经历编码转换。
本文介绍可读流和可写流中一些常见的编码转化情况。

假定`options`为创建流时传给[`Readable`]或[`Writable`]的配置。
正常情况下，流只处理`String`和`Buffer`类型的数据，但可以设置`options.objectMode`，使流能处理任意类型的数据。
此时，称流处于对象模式（[object mode]）。

下面是一个编码转化的例子：
```js
var buf = new Buffer('YWJj', 'base64')

console.log('Binary:', buf)
// Binary: <Buffer 61 62 63>

console.log('Base-64:', buf.toString('base64'))
// Base-64: YWJj

console.log('UTF-8:', buf.toString('utf8'))
// UTF-8: abc

```

数据从`String`类型转化成`Buffer`类型称为编码，实际是得到字符串在指定编码方式下的二进制表示。

从`Buffer`类型转化成`String`类型则称为解码，实际是将二进制根据指定编码翻译成字符串。

如果编码和解码指定的编码方式不一样，就实现了一次编码转换。
譬如上面的`YWJj`到`abc`便是一次从[Base-64]到[UTF-8]的编码转换。
这样的现象，也会出现在流操作数据的过程中。

## 可读流
外界与可读流的数据沟通是通过`push(data, encoding)`和`on('data', chunk => {})`来实现的。
本小节研究`data`, `chunk`, `encoding`，`options.encoding`，以及`options.objectMode`之间的关系。

### 对输入进行编码
当`push`方法未指定`encoding`时，默认使用`options.defaultEncoding`。后者的默认值是`'utf8'`。
所以，可以认为`encoding`一定有值。

在非对象模式下，添加到流中的文本会进行一次编码。
```js
const stream = require('stream')

const source = ['YWJj', 'ZGVm']
const readable = stream.Readable({
  read: function () {
    const data = source.length ? source.shift() : null
    this.push(data, 'base64')
  }
})

readable.on('data', data => console.log(data))

```
输出：
```
<Buffer 61 62 63>
<Buffer 64 65 66>

```

在上面的例子中，`encoding`值为`'base64'`。
所以`'YMJj'`与`'ZGVm'`以[Base-64]的编码方式表示，被输出。

### 对输出进行解码
在前小节的例子中，可以通过设置`options.encoding`来对输出进行解码：
```js
const stream = require('stream')

const source = ['YWJj', 'ZGVm']
const readable = stream.Readable({
  encoding: 'utf8',
  read: function () {
    const data = source.length ? source.shift() : null
    this.push(data, 'base64')
  }
})

readable.on('data', data => console.log(data))

```
输出：
```
abc
def

```

由于`options.encoding`设置为`'utf8'`，所以，`'YMJj'`与`'ZGVm'`的二进制表示均按照[UTF-8]的编码方式进行解码再输出。

可见，`encoding`控制对输入进行编码，而`options.encoding`控制对输出进行解码。
如果`encoding`等于`options.encoding`，这两步其实都不会发生，也没必要发生。

`chunk`实际是`data`编码转换后的结果。

### 对象模式下接受任意类型的输入
如果设置`options.objectMode`为`true`，则`data`可以是任意类型，流不再对输入进行编码。

但是如果指定了`options.encoding`，且`push`方法未指定`encoding`，则输出前仍然会进行解码。

```js
const stream = require('stream')

const source = ['YMJj', Buffer('ZGVm'), {}]
const readable = stream.Readable({
  objectMode: true,
  encoding: 'utf8',
  read: function () {
    const data = source.length ? source.shift() : null
    this.push(data)
  }
})

readable.on('data', chunk => console.log(chunk))

```
输出：
```
YMJj
ZGVm
[object Object]

```

试图对`String`和`Buffer`以外的数据类型进行解码（调用`toString()`），其结果通常不是所预期的。

如果不设置`options.encoding`，则结果将为：
```
YMJj
<Buffer 5a 47 56 6d>
{}

```

## 可写流
外界与可写流的数据沟通是通过`write(data, encoding)`和`_write(chunk, enc, next)`来实现的。
本小节研究`data`, `chunk`, `encoding`，`enc`，`options.objectMode`，以及`options.decodeStrings`之间的关系。

与可读流相比，没有了`options.encoding`，意味着`chunk`不再是解码的结果。

`readable.push`与`writable.write`都是往流中添加数据，`push`方法会使数据经历编码和解码两个步骤再输出，但`write`只有编码这一个环节。
事实上[`Writable`]不能设置`options.encoding`。

所以，如果不是对象模式，`chunk`一定是`Buffer`对象，`_write`中的`enc`值一定是`buffer`。
```js
const stream = require('stream')

const source = ['YWJj', 'ZGVm']
const writable = stream.Writable({
  write: function (chunk, enc, next) {
    console.log(chunk, enc)
    next()
  }
})

writable.write(source[0], 'base64')
writable.write(source[1], 'base64')
writable.end()

```

输出：
```
<Buffer 61 62 63> 'buffer'
<Buffer 64 65 66> 'buffer'

```

`enc`表示对`data`进行何种转化得到`chunk`。

对象模式：
```js
const stream = require('stream')

const source = ['abc', Buffer('def')]
const writable = stream.Writable({
  objectMode: true,
  write: function (chunk, enc, next) {
    console.log(chunk, enc)
    next()
  }
})

writable.write(source[0])
writable.write(source[1])
writable.end()

```
输出：
```
abc utf8
<Buffer 64 65 66> 'buffer'

```

[`Readable`]: https://nodejs.org/api/stream.html#stream_class_stream_readable_1
[`Writable`]: https://nodejs.org/api/stream.html#stream_class_stream_writable_1
[object mode]: https://nodejs.org/api/stream.html#stream_object_mode
[Base-64]: https://en.wikipedia.org/wiki/Base-64
[UTF-8]: https://en.wikipedia.org/wiki/UTF-8

