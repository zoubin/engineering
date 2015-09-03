title: character encoding
date: 2014-10-23 17:53:19
tags:
  - basics
---

介绍字符编码的一些基本概念，以及unicode和utf-8, utf-16, utf-32的基本知识。

## 概念
### character sets
一组特定用途的字符形成的集合便是一个字符集（character set）。譬如简体汉字、英文、阿拉伯语等。当然，一个字符集中的字符不限于一门自然语言，可以包含各种字符。
譬如unicode字符集，便包含了地球上大部分的自然语言字符。
### coded character sets
为了方便计算机处理，通常将一个字符集中所有的字符都一一映射到（编码成）一个数字（code point）。字符集对应的code point集合便是编码字符集（coded character set）。
譬如，在编码字符集ISO 8859-1中，code point 233代表字符’é’，但在编码字符集ISO 8859-5中，code point 233代表的是字符’щ’。而在unicode编码字符集同时收录了这两个字符，分别用code point 233, 1097代表。
### character encodings
数字在计算机底层可以用多种方式表示。譬如，可用1位’1’表示数字1，也可用两位’01’表示数字1.这个映射，便是字符编码（encoding），即将一个code point编码成一串0, 1。unicode通常的编码方式是utf-8，utf-16，utf-32。

## unicode
code point是一个4到6位的16进制数，以”U+”开头。例如：
* ASCII whitespace: U+0009, U+000A, U+000C, U+000D, and U+0020
* ASCII digits: U+0030 to U+0039
* A-Z: U+0041 to U+005A
* a-z: U+0061 to U+007A

对unicode中的code point有三种常见的编码：utf-8, utf-16, utf-32，如下图（来自[这里](http://www.w3.org/International/articles/definitions-characters/)）：

![unicode encodings](http://www.w3.org/International/articles/definitions-characters/images/encodings.png)

### utf-8
uft-8是一种变长的字符编码，即每一个code point在计算机里面的表示长度都不尽相同。具体见下表。

|Bits | lowest | highest | Bytes | Byte 1 | Byte 2 | Byte 3 | Byte 4 | Byte 5 | Byte 6 |
|---|---|---|---|---|---|---|---|---|---|
|7 | U+0000 | U+007F | 1 | 0xxxxxxx | | | | | |
|11 | U+0080 | U+07FF | 2 | 110xxxxx | 10xxxxxx | | | | |
|16 | U+0800 | U+FFFF | 3 | 1110xxxx | 10xxxxxx | 10xxxxxx | | | |
|21 | U+10000 | U+1FFFF | 4 | 11110xxx | 10xxxxxx | 10xxxxxx | 10xxxxxx | | |
|26 | U+200000 | U+3FFFFF | 5 | 111110xx | 10xxxxxx | 10xxxxxx | 10xxxxxx | 10xxxxxx | |
|31 | U+4000000 | U+7FFFFF | 6 | 1111110x | 10xxxxxx | 10xxxxxx | 10xxxxxx | 10xxxxxx | 10xxxxxx |

utf-8将比特流逐个字节解析，且解析出的字节可分成single bytes, leading bytes, continuation bytes三种。这三种字节表示的数值范围没有交集，因而可立即判断该如何解析。以下是更具体的特征：
* ASCII中0到127对应的字符用single bytes，以0开头
* 高于127的code points用多个字节表示，首字节为leading byte, 其余为continuation byte
* leading byte高位上连续有两个以上的1，且其数目与该编码使用的字节数一样
* continuation byte高位为10

在2003年，[RFC 3629](http://tools.ietf.org/html/rfc3629)规定utf-8最多编码到U+10FFFF。见[维基百科](http://en.wikipedia.org/wiki/Utf-8)。

### utf-16
与utf-8一样，是变长编码。常见的code point都用16位进行编码，其它的可能会占用更多的字节。见[维基百科](http://en.wikipedia.org/wiki/Utf-16)。

### utf-32
与utf-8和utf-16不一样，是定长编码，所有code point都用32位进行编码。见[维基百科](http://en.wikipedia.org/wiki/Utf-32)。

## How to choose a character encoding?
要想浏览器能正确解码收到的字节流，需要在编辑时将数据保存为一种编码A，服务器在提供内容时在header中指定文件类型（Content-Type）。都用utf-8可以保持最大的兼容性。

## 推荐教程
* <http://www.w3.org/International/tutorials/tutorial-char-enc/>
* <http://www.w3.org/International/questions/qa-what-is-encoding>
* <http://www.w3.org/International/questions/qa-choosing-encodings>
* <http://www.w3.org/International/articles/definitions-characters/>

## 更多参考
* <http://encoding.spec.whatwg.org/>
* <http://www.unicode.org/versions/Unicode6.3.0/>
* <http://www.unicode.org/standard/principles.html>

### utf-8 related
* <http://www.ietf.org/rfc/rfc3629.txt>
* <http://en.wikipedia.org/wiki/Utf-8>
* <http://www.cl.cam.ac.uk/~mgk25/ucs/ISO-10646-UTF-8.html>
* <http://www.cl.cam.ac.uk/~mgk25/unicode.html#utf-8>

### more
* <http://www.ruanyifeng.com/blog/2007/10/ascii_unicode_and_utf-8.html>

### Tools
* <http://www.decodeunicode.org/>


