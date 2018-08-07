# Node.js Stream
在构建复杂系统时，通常将其拆解为功能独立的若干部分，通过一定的接口规范连接起来，以共同完成较复杂的任务。

在unix中，shell通过管道`|`连接各部分，输入输出为文本流。
在[Node.js]中，内置的[stream]模块也实现了类似功能，各部分通过通过`.pipe()`连接，输入输出可以是普通的文本流，也可以是对象流。

本系列试着从三个方面介绍[stream]相关的内容：
* 第一部分：[基础篇]。介绍[stream]接口的基本使用。
* 第二部分：[进阶篇]。重点剖析[stream]底层如何支持流式数据处理，及其[背压]（[back pressure]）机制。
* 第三部分：[实战篇]。介绍如何使用[stream]进行程序设计。从[Browserify]和[Gulp]的实现总结出两种模式，并基于[stream]构建一个为[Git]仓库自动生成changelog的应用作为示例。

## 目录

- [基础篇]
- [进阶篇]
- [实战篇]
- 番外篇
  - [流对数据的编码与解码](extra/encoding.md)
  - [几个需要注意的问题](extra/bonus.md)

[背压]: http://baike.baidu.com/view/1036778.htm
[back pressure]: https://en.wikipedia.org/wiki/Back_pressure
[Browserify]: https://github.com/substack/node-browserify
[Gulp]: https://github.com/gulpjs/gulp
[Git]: https://git-scm.com/
[Node.js]: https://nodejs.org/
[stream]: https://nodejs.org/api/stream.html

[基础篇]: basics/index.md
[进阶篇]: internals/index.md
[实战篇]: programming/index.md
