# HTTPS

## 安全考虑
>Confidentiality

保密性。
防止信息的暴露。

>Integrity

完整性。防止信息被篡改。

>Authentication

身份认证。
有些攻击者可能修改DNS解析，将URL解析到他们想要的IP地址。
所以，通常需要确保对方拥有它所声称的身份。

>Originality

原创性。
第三方可能截获请求信息，之后再去向服务器发请求。
譬如一个下订单的请求，第三方截获后，并不去解密，或是修改，而是将它向服务器反复发送，以达到攻击的目的。
此种攻击行为称为`replay attack`。

>Timeliness

时效性。
与`replay attack`不同，第三方截获后，并不反复发送，而只是延迟请求时间。
譬如一个买入股票的请求，延迟后可能就在一个意想不到的价位入手了。

## 数字加密
通过加密算法来解决保密性的问题。
这也是解决其它问题的基础。

其基本原理是，发送方通过加密函数，将一段明文（plaintext）转换成密文（ciphertext），
接收方在收到密文后，使用解密函数将密文再转换成明文。
对于不知道解密函数的第三方而言，密文是没有任何意义的。
因此，称这对加密、解密函数为密码（cipher）。
这里将cipher翻译成加密算法（总觉直译为“密码”怪怪的）。

### 密钥
加密和解密函数通常还需要接收一个密钥（key）做为参数才能正确工作。

传说凯撒曾使用过一种“三字符旋转”（three-character rotation）加密方式，
将消息中的每个字母都用字母表中比它排列靠后三个位置的字母替代。

![rot3]

这里，加密和解密使用的密钥是3.

由于好的加密算法很有限，不可能大家都使用不同的加密算法。
且一旦暴露，再找替代品也很麻烦。
所以，一般加密算法本身是公开的，只有密钥才是秘密，需要妥善保管。

当然，攻击者可能通过某些手段事先获得了一些信息。
譬如明文的模式，某些明文对应的密文等等。
优秀的加密算法，即使在同时知道明文和密文的条件下，也无法推断出密钥。

这样，攻击者就只剩下穷举法，去遍历密钥的所有可能值。
如果密钥长度是`n`位，就有`2^n`种可能，平均需要猜`2^n/2`次才能猜中。

假设密钥的长度为128位，则一共有约
262,000,000,000,000,000,000,000,000,000,000,000,000
种可能。

对于目前的计算机而言，在合理的时间内是无法完成破解的。

![crack-keys]

当然，密钥越长，加密和解密耗时就越多。
所以密钥长度和加密性能间存在一个trade-off。

字母旋转这样的加密方式，其密钥数量一共只有25种（密钥为0就不会修改明文），平均尝试13次就能破解掉。
加强版的（monoalphabetic ciphers）可以对字母使用一个双射进行任意替换，
这样的双射一共有`26!`种（包括不做任何变动），在`10^26`量级，穷举的话就不太现实了。

### 对称加密与非对称加密
如果加密函数与解密函数使用使用同样的密钥，则称为对称加密，否则称为非对称加密。

对称加密时，发送方用加密函数和密钥加密，接收方用解密函数和同一个密钥解密。

在非对称加密中，双方均产生了一对密钥：公钥和私钥。
公钥会公布出去，私钥则当作秘密保管。
发送方在发送消息时，用接收方的公钥进行加密，接收方在收到密文后，便可用自己的私钥进行解密。

对称加密算法有[DES]系列。非对称算法有[RSA]等。

理论上可以通过大数因式分解来破解[RSA]，其复杂度比穷举要快。
因此，一般来说非对称加密要求的密钥长度更大（至少1024位）。
密钥长度大，加密解密速度相对对称加密而言就慢一些。

对称加密中，N个人之间通信，需要两两均确定一个密钥，密钥数量为`N*(N-1)/2`，每个节点需要保管`N-1`个密钥。
在非对称加密中，N个人一共只产生了`2N`个密钥，且每个节点只需要保管一个私钥。

软件实现时，对称加密比[RSA]快至少100倍，硬件实现时可快100到10000倍。
所以非对称加密一般用来进行认证和创建会话密钥。

在发送数据时，发送方选生成一个密钥用于对称加密，称之为会话密钥。
再使用接收方的公钥对会话密钥进行加密，然后将它发送给接收方，确保会话密钥不被窃取。
之后便可以用这个会话密钥开始对数据进行对称加密了。

## 认证
认证，即能验证某则消息确实来源于某个发送方。

加密本身并不能确保数据的完整性，第三方还是可以篡改消息内容，接收方解密出来后无法判断内容是否被修改过。
当消息可能被篡改时，说消息来源于某个发送方没有什么意义。
所以，确定消息来源于某个发送方，也就意味着需要验证数据的完整性。

### 加密哈希函数
加密哈希函数（cryptographic hash function），可将任意长度的消息映射成一段固定长度的消息摘要（message digest）。
与校验和类似，将消息摘要置于消息体后，便可用来检验消息是否有被意外修改。

由于加密哈希函数将任意长度的消息映射成固定长度的摘要，
本质是将一个无穷空间映射到一个有限空间，
所以存在将不同消息映射成同样的摘要的可能。
因此，第三方可以截获消息后，利用哈希加密函数得到摘要，
再去寻找一则与原消息拥有同样摘要的消息，将新消息发给接收方，
接收方将无法察觉到这样的变动。
故而为了安全起见，要求使用的加密哈希函数有单向性，
即可以方便算出摘要，但从摘要找到可生成它的消息则不太现实。

比较常见的加密哈希函数有[MD5]，[SHA-1]等。

### 消息认证码
但由于加密哈希函数并不是什么秘密，所以第三方截获消息后，可以修改完内容，再生成一份摘要，接收方无法辨别。
所以，单独用加密哈希函数是无法对付恶意篡改者的。

发送方在生成摘要时，输入除消息外还可加上密钥（authentication key），这样第三方就无法生成正确的摘要了。
这个摘要便称为消息认证码（message authentication code），能起到身份认证的作用。

![mac-principle]

以上就是[MAC]的工作原理。
并未涉及到加密，所以速度较快。

改进版的[HMAC]可以结合[MD5]或[SHA-1]使用。

在认证时需要用到密钥，那如何安全地将这个密钥传给接收方？
可以使用接收方的公钥进行一次加密再进行传输。

## 数字签名
[数字签名]的目的便是验证当前收到的消息是否来自某某，是否有被篡改。
它使用公钥加密来实现。

下面看一个使用[RSA]来进行[数字签名]的例子。
* Bob先将消息映射成固定长度的摘要（digest）。譬如使用[MD5]就可以将任意长度的消息映射成128位。
* 使用[RSA]的解密函数`D`将摘要（`c`）映射成签名（`m`）。
  从前面可知`D`是利用私钥做的[模幂]运算，在不知道`d`的情况下，是无法得出`m`的。
  所以，只有Bob能生成这个签名。
* Bob将计算好的签名连接到信息后，一起发送给Alice。
* 如果Alice想验证收到的消息是否来自Bob，且是否有被篡改，
  可以使用Bob的公钥对签名进行加密，得到摘要，与从消息体计算出来的摘要进行对比。

![digital-signature-encrypt]

![digital-signature-decrypt]

之所以要引入哈希，是因为公钥加密速度太慢，使用哈希将内容压缩成很短后，可以较快加密。


## 公钥认证
有了[数字签名]机制，[数字证书]便很容易实现了。

身份证之所以能证明你的身份，是因为大家相信身份证的颁发机构，以及相信身份证难以造假。

[数字证书]证明的是公钥的正确归属，需要权威机构做担保。
证书分为两部分内容，一部分是信息描述，其中包含公钥。
第二部分是权威机构的签名，即用它的私钥针对第一部分内容生成的一个[数字签名]。

![digital certificate]

网站需要向[CA]申请对应域名的数字证书，[CA]会留下自己的[数字签名]。
浏览器在与网站通信时，先下载它的证书，检查是哪个[CA]签发的，再找出对应[CA]的公钥，如同[数字签名]中描述的那样进行验证。

![digital certificate verifying]


## HTTPS协议

## 参考
* [HTTP: The Definitive Guide]
* [Computer Networks: A Systems Approach]
* [Computer Networking: A Top-Down Approach]

## 相关
* [Crash course on cryptography](http://www.iusmentis.com/technology/encryption/crashcourse/)
* [阮一峰：RSA算法原理（一）](http://www.ruanyifeng.com/blog/2013/06/rsa_algorithm_part_one.html)
* [阮一峰：RSA算法原理（二）](http://www.ruanyifeng.com/blog/2013/07/rsa_algorithm_part_two.html)

## 附录

### 穷举法平均尝试次数
假设密钥数量为`n`，当前有明文`M`和对应的密文`c`，
则用穷举法将`c`解密成`M`需要尝试的次数平均为`n/2`。
假定密钥生成算法是完全随机的。

**证明**

将密钥从1到n进行编号，则加密中使用的密钥，其编号为`k`的概率均为`1/n`。
故：
* 密钥为1，需要尝试1次，概率为`1/n`
* 密钥为2，需要尝试2次，概率为`1/n`
* 密钥为k，需要尝试k次，概率为`1/n`
* 密钥为n-1，需要尝试n-1次，概率为`1/n`
* 密钥为n，需要尝试n-1次，概率为`1/n`（尝试完前n-1次均失败，则只剩下一种可能了，没必要再试）

期望值为`n/2 + 1/2 - 1/n`。

总结起来：
* `n=1`时，不需要尝试。
* `n=2`时，需要且只需要尝试一次。
* `n>2`时，平均需要尝试`Math.ceil((n+1)/2)`次。

### Polyalphabetic ciper
对于monoalphabetic cipher，
如果攻击者事先知道某些信息，可能就会使破解难度大大降低。
>For example, if Trudy the intruder is Bob’s wife and suspects Bob of having an affair with Alice, then she might suspect that the names “bob” and “alice” appear in the text. If Trudy knew for certain that those two names appeared in the ciphertext and had a copy of the example ciphertext message above, then she could immediately determine seven of the 26 letter pairings, requiring 10^9 fewer possibilities to be checked by a brute-force method. Indeed, if Trudy suspected Bob of having an affair, she might well expect to find some other choice words in the message as well.

**cipher-text-only attack**

攻击者只能拿到密文。

**known-plaintext attack**

攻击者有部分明文及其对应的密文。

**chosen-plaintext attack**

攻击者可能选择一段明文，并获得其对应的密文，从而将密钥破解。
譬如前面的字母变换加密方法，攻击都如果能取得以下明文对应的密文，立即就能破解密钥。
>The quick brown fox jumps over the lazy dog

针对以上情况，可以使用多个monoalphabetic cipher来进行加密。
譬如有C1, C2两个monoalphabetic，可以考虑使用C1, C2, C2, C1, C2这样的序列来加密。
即第1个字符用C1，第2,3个字符用C2，第4个字符用C1，第5个字符用C2，从第6个字符开始又用C1，进行循环。

这种加密方法（polyaphabetic encryption）可使同样的字母在不同位置时编码会不一样。

### 对称加密
对称加密可分为两类：
* block ciphers
* stream ciphers

#### block ciphers
[DES]即一种block cipher

将原消息拆分为固定大小的块再逐块加密。

假定块大小为3位，则块的可能性共有`2^3`种。
这个块的集合一共有`2^3!`种双射映射到自身。
每一种映射即一个密钥，故一共有`2^3! = 40320`个密钥。

譬如，假设选取以下映射（密钥）：

输入 | 输出 | 输入 | 输出
--- | --- | --- | ---
000 | 110 | 100 | 011
001 | 111 | 101 | 010
010 | 101 | 110 | 000
011 | 100 | 111 | 001

可以将`010110001111`加密成`101000111001`

如果块大小为64，将会有`2^64!`种密钥，很难穷举。
但同时，存储密钥时需要至少存储`2^64`个输入值。
所以，直接存储映射表是不可行的。

为此，可以使用函数来模拟映射表。
* 将64位再拆分成8个8位的小块，每个小块都用一种映射表去处理，
* 再使用映射将8个小块组合成64位
* 将组合成的64位再按上面的步骤处理若干次。这样明文中的每一位都会影响密文中的全部（或大部分）位。

![block cipher]

每个密钥决定了算法内部的这些变换。
>Observe that with a key length of n, there are 2n possible keys. NIST [NIST 2001] estimates that a machine that could crack 56-bit DES in one second (that is, try all 256 keys in one second) would take approx- imately 149 trillion years to crack a 128-bit AES key.


#### stream ciphers


### 非对称加密
[RSA]是公钥加密，包括两部分：
* 生成公钥私钥对
* 加密和解密算法

#### 生成公钥私钥对
* 选择两个足够大的质数`p`和`q`。
  越大[RSA]就越难破解，但加密和解密耗时就越长。
  推荐的做法是`pq`的量级在1024位。
* 计算`n = pq`，`z = (p - 1)(q - 1)`。
* 寻找`e`：`1 < e < n`且`e`与`z`互质。`e`位数不大，通常选择`2^16 + 1 = 65537`。
* 寻找`d`：`ed - 1`可被`z`整除。
* `(n, e)`即公钥，`(n, d)`即私钥。

#### 加密与解密
Bob发送消息给Alice的过程如下：
* Alice将`(n, e)`作为公钥告诉Bob，`(n, d)`作为私钥自己保管。
* Bob想将消息`m`（`m < n`）发送给Alice，先用Alice的公钥`(n, e)`对`m`进行加密。

![encode]

* Alice收到`c`后可以用如下方式解出`m`。

![decode]

#### 工作原理
给定

![encode]

需要证明

![decode]

**证明**

由
```
(ab) mod n = (a mod n)(b mod n) mod n

```
可得
```
(c^d) mod n = ((m^e) mod n)^d mod n = (m^(ed)) mod n

```

所以，需要证明的等式转化成
```
m = (m^(ed)) mod n

```

这里需要用到如下结论：
```
p, q is prime
n = pq
z = (p - 1)(q - 1)

then
(x^y) mod n = (x^(y mod z)) mod n

```

根据上面的结论，所需要证明的等式被进一步转化成：
```
m = (m^(ed)) mod n = (m^(ed mod z)) mod n

```

上述等式之所以成立，是因为我们在生成`e`和`d`时，保证了`ed - 1`可被`z`整除，即`(ed) mod z = 1`。


可见，[RSA]依赖的基本原理是，可以找到三个大整数`e`, `d`, `n`，对于任意的整数`m`，下面的等式都成立：

![rsa-1]

上式左边的运算称为[模幂]，它有`log(ed)`级别的解法。
在这里它最有用的特点就是，即使知道了`e`, `n`, `m`，也很难计算出`d`。

上面等式中`e`和`d`是可交换的，即

![rsa-2]

这就是解密的工作原理。

#### 破解复杂度
假定攻击者拿到了公钥，即知道了`n`和`e`，考虑能否解出`d`。

由于`(ed) mod z = 1`，要得到`d`，必须知道`z`，但其值是保密的，只能推断。
由`z = (p − 1)(q − 1)`可知，如果知道`p`和`q`，便可得到`z`。
由于`n = pq`，可以对`n`进行因式分解得到`p`和`q`。
正是因为这个因式分解的难度很大，才使得[RSA]难以破解。
当`n`很大时（如1024位），可以认为无解。目前已知能破解的最大长度为768位。


[RSA]: https://en.wikipedia.org/wiki/RSA_(cryptosystem)
[模幂]: https://en.wikipedia.org/wiki/Modular_exponentiation
[padding]: https://en.wikipedia.org/wiki/Padding_(cryptography)
[MD5]: https://en.wikipedia.org/wiki/MD5
[SHA-1]: https://en.wikipedia.org/wiki/SHA-1
[数字签名]: https://en.wikipedia.org/wiki/Digital_signature
[数字证书]: https://en.wikipedia.org/wiki/Public_key_certificate
[欧拉函数]: https://en.wikipedia.org/wiki/Euler%27s_totient_function
[维基百科#RSA]: https://en.wikipedia.org/wiki/RSA_(cryptosystem)#Proofs_of_correctness
[CA]: https://en.wikipedia.org/wiki/Certificate_authority
[DES]: https://en.wikipedia.org/wiki/Data_Encryption_Standard
[Computer Networking: A Top-Down Approach]: http://dl.yazdanpress.com/BOOKS/ENGINEERING/COMPUTER-IT/Computer%20Networking(marked).pdf
[Computer Networks: A Systems Approach]: http://www.pdfiles.com/pdf/files/English/Networking/Computer_Networks_A_Systems_Approach.pdf
[HTTP: The Definitive Guide]: http://www.staroceans.org/e-book/O'Reilly%20-%20HTTP%20-%20The%20Definitive%20Guide.pdf
[decode]: https://upload.wikimedia.org/math/d/4/c/d4c69dd0311459f6be400e7d4a3c5dae.png
[encode]: https://upload.wikimedia.org/math/8/6/b/86bae03c22af912674149ed242f754b9.png
[mac-principle]: mac.png
[MAC]: https://en.wikipedia.org/wiki/Message_authentication_code
[HMAC]: https://en.wikipedia.org/wiki/Hash-based_message_authentication_code
[digital-signature]: digital-signature.png
[digital-signature-encrypt]: digital-signature-encrypt.png
[digital-signature-decrypt]: digital-signature-decrypt.png
[digital certificate]: digital-certificate.png
[digital certificate verifying]: digital-certificate-verify.png
[block cipher]: block-cipher.png
[rsa-1]: https://upload.wikimedia.org/math/4/7/4/474522f25bc32949c42695902c615396.png
[rsa-2]: https://upload.wikimedia.org/math/9/c/c/9cc8d72c3d61105fc50a761fa9061fe3.png
[rot3]: rot3.png
[crack-keys]: crack-keys.png
