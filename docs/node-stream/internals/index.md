# Node.js Stream - 进阶篇
主要介绍[Node.js]中[stream]模块的一些底层原理。

## 目录
- [流对数据的编码与解码](encoding.md)
  - [可读流](encoding.md#可读流)
  - [可写流](encoding.md#可写流)
- [数据生产和消耗的媒介](hose.md)
  - [为什么使用流取数据](hose.md#为什么使用流取数据)
  - [如何通过流取到数据](hose.md#如何通过流取到数据)
  - [read](hose.md#read)
  - [push方法](hose.md#push方法)
  - [end事件](hose.md#end事件)
  - [readable事件](hose.md#readable事件)
  - [doRead](hose.md#doread)
  - [howMuchToRead](hose.md#howmuchtoread)
- [数据的流式消耗](flow.md)
  - [数据消耗模式](flow.md#数据消耗模式)
  - [暂停模式](flow.md#暂停模式)
  - [流动模式](flow.md#流动模式)
- [流的背压反馈机制](back-pressure.md)
  - [pipe](back-pressure.md#pipe)
  - [消耗驱动的数据生产](back-pressure.md#消耗驱动的数据生产)
- [几个需要注意的问题](bonus.md)
  - [不要在非对象模式下往流中添加空字符串](bonus.md#不要在非对象模式下往流中添加空字符串)
  - [避免执行_read时在不同tick中多次调用push方法](bonus.md#避免执行_read时在不同tick中多次调用push方法)

## 相关
- [Node.js Stream - 基础篇](../basics/index.md)
- [Node.js Stream - 实战篇](../programming/index.md)

## 参考文献
- [substack#browserify-handbook]
- [zoubin#streamify-your-node-program]

[Node.js]: https://nodejs.org/
[stream]: https://nodejs.org/api/stream.html
[substack#browserify-handbook]: https://github.com/substack/browserify-handbook
[zoubin#streamify-your-node-program]: https://github.com/zoubin/streamify-your-node-program

