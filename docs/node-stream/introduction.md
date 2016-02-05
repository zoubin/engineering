# Node.js Stream

## 前言
在构建大型系统时，通常将其拆解为功能独立的若干部分，
这些部分的接口都遵循一定的规范，通过某种方式连接起来，以共同完成较复杂的任务。

在unix中，shell通过管道`|`连接各部分，其输入输出的规范是文本流。
在[Node.js]中，内置的[stream]模块也实现了类似功能，组件间通过`.pipe()`连接。

本系列试着从三个方面介绍[stream]相关的内容，这三部分各自独立，无须从头至尾全部读完。
* 第一部分：[基础篇]。介绍[stream]接口的基本使用。
* 第二部分：[进阶篇]。
  重点剖析[stream]底层如何支持流式数据处理，及其[背压]（[back pressure]）机制。
* 第三部分：[实战篇]。介绍如何使用[stream]进行程序设计。
  从[Browserify]和[Gulp]总结出两种设计模式，
  并基于[stream]构建一个为[Git]仓库自动生成changelog的应用。

## 目录
- [基础篇]
  - [Readable](basics.md#readable)
  - [Writable](basics.md#writable)
  - [Duplex](basics.md#duplex)
  - [Transform](basics.md#transform)
  - [objectMode](basics.md#objectmode)
- [进阶篇]
  - [流式数据生产原理](principles.md#流式数据生产原理)
  - [背压原理](principles.md#背压原理)
  - [需要注意的几个问题](principles.md#需要注意的几个问题)
- [实战篇]
  - [实例](programming.md#实例)
  - [Browserify](programming.md#browserify)
  - [Gulp](programming.md#gulp)


[背压]: http://baike.baidu.com/link?url=MvuUdBitMnXIa1qj5MZihQbK6c1KDMW6HLPGZMGEUP7DlBbxJsAfV80lXKPKSteQrlh1ikEN0CYQOCW0PNvnx_
[back pressure]: https://en.wikipedia.org/wiki/Back_pressure
[Browserify]: https://github.com/substack/node-browserify
[Gulp]: https://github.com/gulpjs/gulp
[Git]: https://git-scm.com/
[Node.js]: https://nodejs.org/
[stream]: https://nodejs.org/api/stream.html

[基础篇]: basics.md
[进阶篇]: principles.md
[实战篇]: programming.md
