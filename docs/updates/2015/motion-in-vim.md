# motion in vim

## motion command cheat sheet
### 单词级别的移动

命令|特点|含义|示例
---|---|---|---
w|exclusive|移至右边第一个“单词首字母位置”|<mark>H</mark>ello World! &raquo;`w` &raquo; Hello <mark>W</mark>orld!
W|exclusive|移至右边第一个“非空白串首字母位置”|<mark>(</mark>a, b) `W` (a, <mark>b</mark>)<br>(<mark>$</mark>par, $ext) `dW` (<mark>$</mark>ext)
b|exclusive|w的反方向|-
B|exclusive|W的反方向|-
e|inclusive|移至右边第一个“单词末字母位置”|<mark>H</mark>ello World! &raquo;`e` &raquo; Hell<mark>o</mark> World!<br>Hell<mark>o</mark> World! &raquo;`e` &raquo; Hello Worl<mark>d</mark>!
E|inclusive|移至右边第一个“非空白串末字母位置”|<mark>(</mark>$a, $b, $c) &raquo;`E` &raquo; ($a<mark>,</mark> $b, $c) &raquo;`E` &raquo; ($a, $b<mark>,</mark> $c) &raquo; ($a, $b, $c<mark>)</mark>
ge|inclusive|e的反方向|往左+inclusive，T和F是往左+exclusive
gE|inclusive|E的反方向|-

### 行内任意跨度

命令|特点|含义|示例
---|---|---|---
fx|inclusive|向右移至字符x的位置|Hell<mark>o</mark> World! &raquo;`fo` &raquo; Hello W<mark>o</mark>rld!<br>Hell<mark>o</mark> World! &raquo;`dfo`&raquo; Hell<mark>r</mark>ld!
Fx|exclusive|向左移至字符x的位置|Hello W<mark>o</mark>rld! &raquo;`Fo` &raquo; Hell<mark>o</mark> World!<br>Hello W<mark>o</mark>rld! &raquo;`dFo`&raquo; Hell<mark>o</mark>rld!<br>注意对比exclusive与inclusive的效果
tx|inclusive|向右移至字符x的左一个位置|Hell<mark>o</mark> World! &raquo;`to` &raquo; Hello <mark>W</mark>orld!<br>Hell<mark>o</mark> World! &raquo;`dto`&raquo; Hell<mark>o</mark>rld!
Tx|exclusive|向左移至字符x的右一个位置|Hello W<mark>o</mark>rld! &raquo;`To` &raquo; Hello<mark> </mark>World!<br>Hello W<mark>o</mark>rld! &raquo;`dTo`&raquo; Hello<mark>o</mark>rld!<br>注意对比exclusive与inclusive的效果
;|与被重复的移动一样|重复前一次的f, F, t, T|<mark>H</mark>ello World! &raquo;`fo` &raquo; Hell<mark>o</mark> World! &raquo; `;` &raquo; Hello W<mark>o</mark>rld!
,|与被重复的移动一样|反方向重复前一次的f, F, t, T|Hell<mark>o</mark> World! &raquo;`fo` &raquo; Hello W<mark>o</mark>rld! &raquo; `,` &raquo; Hell<mark>o</mark> World!

### 行间
跨行的默认都是inclusive，但可以加v来修改。

命令|含义
---|---
-|移至上一行首个非空字符位置
+|移至下一行首个非空字符位置
2g_|移至下一行最后一个非空字符位置
gg|移至第一行
G|移至最后一行

### Mark
可在任意光标处打标记，并进行命名，再通过命令直接移至该位置。时间顺序上，这些标记形成

设置标记的命令：

命令|含义
---|---
m{a-zA-Z}|命名为指定字母
m'<br>m`|这两个标记表示mark list中的前一个位置

移动至标记的命令：

命令|特点|含义
---|---|---
`|exclusive|移至指定标记对应的光标位置
'|inclusive<br>linewise|移至指定标记对应的光标位置所在行的行首（第一个非空字符）

除字母和数字外，下面还有几组实用的标记：

命令|含义|命令|含义
---|---|---|---
[|前一次修改或复制文本首字符位置|]|前一次修改或复制文本末字符位置
<|前一次选择的visual块文本首字符位置|>|前一次选择的visual块文本末字符位置
', `|前一次jump位置或m'm`设置的位置|"|前一次离开buffer的位置
^|前一次insert的位置|.|前一次修改的位置


### Jump
当使用以下命令时，执行前光标所在位置会被记录：

```
', `, G, /, ?, n, N, %, (, ), [[, ]], {, }, :s, :tag, L, M, H
```

这些被记录的位置（jump list）可以通过以下这组命令快速移动：

命令|含义
---|---
CTRL-o|移至更旧的记录位置
CTRL-I<br>Tab|移至更新的记录位置

可以通过:ju[mps]来查看当前窗口的jump list。

类似jump list，当修改文本时，光标位置也会被记录，形成一个change list。通过以下这组命令移动：

命令|含义
---|---
g;|移至更旧的修改位置
g,|移至更新的修改位置

:changes可查看当前文件的所有修改位置


### Various

命令|含义
---|---
%|在括号（或其它，见后面）的匹配位置间跳转
[{|移至前面（可不在同一行）第一个未被匹配的{
[(|移至前面（可不在同一行）第一个未被匹配的(
])|移至后面（可不在同一行）第一个未被匹配的)
]}|移至后面（可不在同一行）第一个未被匹配的}

* 关于%，可匹配的除了([{}])外，还有/* */，以及#if, #ifdef, #else, #elif, #endif。如果装上matchit，可以在html开始结束标签间跳转
* 关于有转义或是括号出现在字符串中的情况，可在:h %中找到更多信息

以下这组命令适合较大范围的移动

命令|含义
---|---
H|窗口顶部
M|窗口中间
L|窗口底部

注意：效果受scrolloff选项的影响。

下面这组命令适合于在类似Java或PHP等中class定义文件中移动：

命令|含义|命令|含义
---|---|---|---
]m|下一个方法的开始位置{|]M|下一个方法的结束位置}
[m|上一个方法的开始位置{|[M|上一个方法的结束位置}


#### %示例

`%`之前：
<pre>
<mark>Y</mark>.mix(Y_Node.prototype, {
    purge: function (recurse, type) {
        Y.Event.purgeElement(this._node, recurse, type);
        return this;
    }
});
</pre>

`%`之后：
<pre>
Y.mix(Y_Node.prototype, {
    purge: function (recurse, type) {
        Y.Event.purgeElement(this._node, recurse, type);
        return this;
    }
}<mark>)</mark>;
</pre>

#### [{示例

`[{`之前：
<pre>
Y.mix(Y_Node.prototype, {
    purge: function (<mark>r</mark>ecurse, type) {
        Y.Event.purgeElement(this._node, recurse, type);
        return this;
    }
});
</pre>

`[{`之后：
<pre>
Y.mix(Y_Node.prototype, <mark>{</mark>
    purge: function (recurse, type) {
        Y.Event.purgeElement(this._node, recurse, type);
        return this;
    }
});
</pre>

## 浏览
以下几组命令适合于浏览文件，不一定会移动光标：

命令|含义
---|---
zt|当前行置于窗口顶部
zb|当前行置于窗口底部
zz|当前行置于窗口中间
CTRL-F|往下一屏
CTRL-B|往上一屏
CTRL-D|往下半屏
CTRL-U|往上半屏

注意：效果受scrolloff选项的影响。


## 移动命令的两组特性
### linewise and characterwise
移动命令可能影响整行，或是起始与结束位置间的文本。

如果移动是跨行的（如k,j），则影响整行（或linewise）。这样操作的便是整行，所以dj删除的是两行。

如果移动是行内的（如h,l），则影响起始与结束间的文本（characterwise）。这样操作的是一段文本（可能跨行），所以dl删除的是当前光标下的字符。

### exclusive and inclusive
对于跨行移动，起始与结束位置所在行总是受影响的。但对于行内移动而言，其起始与结束处的位置是否受影响，取决于该移动命令是exclusive还是inclusive。

每个移动命令，都会指明其影响是exclusive还是inclusive。  
对于inclusive命令而言，影响起始与结束位置的字符。对于exclusive命令而言，文本范围中的最后一个字符将被排除在外。  

```
" 假设光标停留在"abcdef"中的c字符上
yfe " 复制cde，因为f是inclusive命令
yFa " 复制ab，因为F是exclusive命令，所以文本范围中的最后一个字符c被排除在外
```

跨行移动，总是inclusive的。

### 转换的情况
linewise和characterwise的操作是可以强制转换的。方法便是在operator后面加v, V或CTRL-V。  

* v置于operator和motion之间，则操作将成为characterwise。
  * 如果移动命令是linewise，则转换后操作是exclusive的。譬如dj本来删除的是两行，而dvj则删除的是当前光标到下行同样位置间的字符，不包括最后一个字符。
  * 如果移动命令是characterwise，则会切换其exclusive/inclusive特性。譬如dl本来删除的是当前光标下的字符，但dvl则删除的是当前光标和下一个位置的两个字符，因为l本是characterwise且exclusive，加上v后便成了inclusive了。
* V置于operator和motion之间，则操作将成为linewise。
* CTRL-V可实现块操作


