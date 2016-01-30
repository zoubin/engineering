# Node.js Stream

## 前言
在构建大型系统时，通常将其拆解为功能独立的若干部分，
这些部分的接口都遵循一定的规范，通过某种方式连接起来，以共同完成较复杂的任务。

在unix中，shell通过管道`|`连接各部分，其输入输出的规范是文本流。
在[Node.js]中，内置的[stream]模块也实现了类似功能，组件间通过`.pipe()`连接。

本系列试着从三个方面介绍[stream]相关的内容，这三部分各自独立，无须从头至尾全部读完。
* 第一部分：[stream]入门。介绍[stream]接口的基本使用。
* 第二部分：[stream]底层实现管窥。重点剖析[stream]底层是如何支持流式数据处理的，以及[stream]提供的`backpressure mechanism`是如何实现的。
* 第三部分：介绍如何使用[stream]进行程序设计。这部分会着重解析[Browserify]和[Gulp]的[stream]设计模式，并基于[stream]构建一个为[Git]仓库自动生成changelog的应用。

## Stream原理

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

