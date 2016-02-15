# Node.js Stream - 数据生产和消耗的媒介
本文介绍如何通过流将数据从底层取出来并提供给消耗方。

## 为什么使用流取数据
下面是一个读取文件内容的例子：
```js
const fs = require('fs')
fs.readFile(file, function (err, body) {
  console.log(body)
  console.log(body.toString())
})

```

但如果文件内容较大，譬如在440M时，执行上述代码的输出为：
```
<Buffer 64 74 09 75 61 09 63 6f 75 6e 74 0a 0a 64 74 09 75 61 09 63 6f 75 6e 74 0a 32 30 31 35 31 32 30 38 09 4d 6f 7a 69 6c 6c 61 2f 35 2e 30 20 28 63 6f 6d ... >
buffer.js:382
    throw new Error('toString failed');
    ^

Error: toString failed
    at Buffer.toString (buffer.js:382:11)

```

报错的原因是`body`这个`Buffer`对象的长度过大，导致`toString`方法失败。
可见，这种一次获取全部内容的做法，不适合操作大文件。

可以考虑使用流来读取文件内容。
```js
const fs = require('fs')
fs.createReadStream(file).pipe(process.stdout)

```

`fs.createReadStream`创建一个可读流，连接了源头（上游，文件）和消耗方（下游，标准输出）。

执行上面代码时，流会逐次调用[`fs.read`]，将文件中的内容分批取出传给下游。
在文件看来，它的内容被分块地连续取走了。
在下游看来，它收到的是一个先后到达的数据序列。
如果不需要一次操作全部内容，它可以处理完一个数据便丢掉。
在流看来，任一时刻它都只存储了文件中的一部分数据，只是内容在变化而已。

这种情况就像是用水管去取池子中的水。
每当用掉一点水，水管便会从池子中再取出一点。
无论水池有多大，都只存储了与水管容积等量的水。

## 如何通过流取到数据
用[`Readable`]创建对象`readable`后，便得到了一个可读流。
如果实现`_read`方法，就将流连接到一个底层数据源。
流通过调用`_read`向底层请求数据，底层再调用流的`push`方法将需要的数据传递过来。

当`readable`连接了数据源后，下游便可以调用`readable.read(n)`向流请求数据，同时监听`readable`的`data`事件来接收取到的数据。

这个流程可简述为：

![how-data-comes-out]

## read
本小节具体了解一下`read`方法的细节。

![read]

## push方法
消耗方调用`read(n)`促使流输出数据，而流通过`_read()`使底层调用`push`方法将数据传给流。

如果流在流动模式下（`state.flowing`为`true`）输出数据，数据会自发地通过`data`事件输出，不需要消耗方反复调用`read(n)`。

如果调用`push`方法时缓存为空，则当前数据即为下一个需要的数据。
这个数据可能先添加到缓存中，也可能直接输出。
执行`read`方法时，在调用`_read`后，如果从缓存中取到了数据，就以`data`事件输出。

所以，如果`_read`异步调用`push`时发现缓存为空，则意味着当前数据是下一个需要的数据，且不会被`read`方法输出，应当在`push`方法中立即以`data`事件输出。

因此，上图中“立即输出”的条件是：
```js
state.flowing && state.length === 0 && !state.sync

```

## end事件
由于流是分次向底层请求数据的，需要底层显示地告诉流数据是否取完。
所以，当某次（执行`_read()`）取数据时，调用了`push(null)`，就意味着底层数据取完。
此时，流会设置`state.ended`。

`state.length`表示缓存中当前的数据量。
只有当`state.length`为`0`，且`state.ended`为`true`，才意味着所有的数据都被消耗了。
一旦在执行`read(n)`时检测到这个条件，便会触发`end`事件。
当然，这个事件只会触发一次。

## readable事件
在调用完`_read()`后，`read(n)`会试着从缓存中取数据。
如果`_read()`是异步调用`push`方法的，则此时缓存中的数据量不会增多，容易出现数据量不够的现象。

如果`read(n)`的返回值为`null`，说明这次未能从缓存中取出所需量的数据。
此时，消耗方需要等待新的数据到达后再次尝试调用`read`方法。

在数据到达后，流是通过`readable`事件来通知消耗方的。
在此种情况下，`push`方法如果立即输出数据，接收方直接监听`data`事件即可，否则数据被添加到缓存中，需要触发`readable`事件。
消耗方必须监听这个事件，再调用`read`方法取得数据。

## doRead
流中维护了一个缓存，当缓存中的数据足够多时，调用`read()`不会引起`_read()`的调用，即不需要向底层请求数据。
用`doRead`来表示`read(n)`是否需要向底层取数据，其逻辑为：
```js
var doRead = state.needReadable

if (state.length === 0 || state.length - n < state.highWaterMark) {
  doRead = true
}

if (state.ended || state.reading) {
  doRead = false
}

if (doRead) {
  state.reading = true
  state.sync = true
  if (state.length === 0) {
    state.needReadable = true
  }
  this._read(state.highWaterMark)
  state.sync = false
}

```

`state.reading`标志上次从底层取数据的操作是否已完成。
一旦`push`方法被调用，就会设置为`false`，表示此次`_read()`结束。

`state.highWaterMark`是给缓存大小设置的一个上限阈值。
如果取走`n`个数据后，缓存中保有的数据不足这个量，便会从底层取一次数据。

## howMuchToRead
调用`read(n)`去取`n`个数据时，`m = howMuchToRead(n)`是将从缓存中实际获取的数据量。
根据以下几种情况赋值，一旦确定则立即返回：
* `state.length`为0，`state.ended`为`true`。
  数据源已枯竭，且缓存为空，无数据可取，`m`为0.
* `state.objectMode`为`true`。
  `n`为0，则`m`为0；
  否则`m`为1，将缓存的第一个元素输出。
* `n`是数字。
  若`n <= 0`，则`m`为0；
  若`n > state.length`，表示缓存中数据量不够。
  此时如果还有数据可读（`state.ended`为`false`），则`m`为0，同时设置`state.needReadable`，下次执行`read()`时`doRead`会为`true`，将从底层再取数据。
  如果已无数据可读（`state.ended`为`true`），则`m`为`state.length`，将剩下的数据全部输出。
  若`0 < n <= state.length`，则缓存中数据够用，`m`为`n`。
* 其它情况。
  `state.flowing`为`true`（流动模式），则`m`为缓存中第一个元素（`Buffer`）的长度，实则还是将第一个元素输出；
  否则`m`为`state.length`，将缓存读空。

上面的规则中：
* `n`通常是`undefined`或`0`，即不指定读取的字节数。
* `read(0)`不会有数据输出，但从前面对`doRead`的分析可以看出，是有可能从底层读取数据的。
* 执行`read()`时，由于流动模式下数据会不断输出，所以每次只输出缓存中第一个元素输出，而非流动模式则会将缓存读空。
* `objectMode`为`true`时，`m`为`0`或`1`。此时，一次`push()`对应一次`data`事件。

## 总结
可读流是获取底层数据的工具，消耗方通过调用`read`方法向流请求数据，流再从缓存中将数据返回，或以`data`事件输出。
如果缓存中数据不够，便会调用`_read`方法去底层取数据。
该方法在拿到底层数据后，调用`push`方法将数据交由流处理（立即输出或存入缓存）。

可以结合`readable`事件和`read`方法来将数据全部消耗，这是暂停模式的消耗方法。
但更常见的是在流动模式下消耗数据，具体见后面的章节。

[`fs.read`]: https://nodejs.org/api/fs.html#fs_fs_read_fd_buffer_offset_length_position_callback
[`Readable`]: https://nodejs.org/api/stream.html#stream_class_stream_readable_1

[how-data-comes-out]: assets/how-data-comes-out.svg
[read]: assets/read.svg
