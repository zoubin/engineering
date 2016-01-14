# cheat sheet - vim

## 修改文本
功能|命令
---|---
在插入模式下将光标前一个单词所有字母大写|``<Esc>gUiw`]a``

### 有序列表
The CTRL-A command is very useful in a macro.  Example: Use the following
steps to make a numbered list.

1. Create the first list entry, make sure it starts with a number.
2. qa	     - start recording into register 'a'
3. Y	     - yank the entry
4. p	     - put a copy of the entry below the first one
5. CTRL-A    - increment the number
6. q	     - stop recording
7. <count>@a - repeat the yank, put and increment <count> times

## Text object selection
仅能在Visual模式下使用，或是紧跟在操作命令后。

模式：`[ai]x`。

其中[ai]表示可以是“a”或者“i”。x为范围类型，可以是以下字符：

```
w, W, [, ], (, ), {, }, <, t, ", ', `
```

命令|含义
---|---
a|包含边界
i|不包含边界

示例

操作前|操作|操作后
---|---|---
"Hello Wo<mark>r</mark>ld!"|`vaw`|<mark>"Hello World!"</mark>
(Hello Wo<mark>r</mark>ld!)|`vi)`|(<mark>Hello World!)
(Hello Wo<mark>r</mark>ld!)|`di)`|()

## 移动
### 单词跨度
命令|含义|命令|含义
---|---|---|---
w|移至右边第一个“单词首字母位置”|W|移至右边第一个“非空白串首字符位置”
b|w的反方向|B|W的反方向
e|移至右边第一个“单词末字母位置”|E|移至右边第一个“非空白串末字符位置”
ge|e的反方向|gE|E的反方向

### 行内任意跨度
命令|含义|命令|含义
---|---|---|---
fx|向右移至字符x的位置|Fx|向左移至字符x的位置
tx|向右移至字符x的左侧字符位置|Tx|向左移至字符x的右侧字符位置
;|重复前一次的f, F, t, T|,|反方向重复前一次的f, F, t, T
ge|e的反方向|gE|E的反方向

### 整行跨度
命令|含义|命令|含义
---|---|---|---
-|移至上一行首个非空字符位置|+|移至下一行首个非空字符位置
gg|移至第一行|G|移至最后一行
2g_|移至下一行最后一个非空字符位置|H|窗口顶部
M|窗口中间|L|窗口底部

### JUMP
命令|含义|命令|含义
---|---|---|---
CTRL-O|移至更旧的记录位置|CTRL-I<br>Tab|移至更新的记录位置
g;|移至更旧的修改位置|g,|移至更新的修改位置

注：如果对tab做了重映射，会导致CTRL-I失效。

### 配对括号间跳转
命令|含义
---|---
%|移至当前位置下的或同行右侧第一个括号的匹配位置
[{|移至前面（可不在同一行）第一个未被匹配的{
[(|移至前面（可不在同一行）第一个未被匹配的(
])|移至后面（可不在同一行）第一个未被匹配的)
]}|移至后面（可不在同一行）第一个未被匹配的}

关于%，可匹配的除了([{}])外，还有/\* \*/，以及#if, #ifdef, #else, #elif, #endif。如果装上matchit，可以在html开始结束标签间跳转。

## 浏览
命令|含义
---|---
zt|当前行置于窗口顶部
zb|当前行置于窗口底部
zz|当前行置于窗口中间
CTRL-F|往下一屏
CTRL-B|往上一屏
CTRL-D|往下半屏
CTRL-U|往上半屏

## visual模式
命令|含义
---|---
v|characterwise visual mode
V|linewise visual mode
CTRL-V|blockwise visual mode

### 模式转换
old mode|new node after command|-|-
---|---|---
-|v|CTRL-V|V
Normal|Visual|blockwise Visual|linewise Visual
Visual|Normal|blockwise Visual|linewise Visual
blockwise Visual|Visual|Normal|linewise Visual
linewise Visual|Visual|blockwise Visual|Normal

简要概之：三条命令都会将模式切换到各自关联的模式（譬如v对应Visual，V对应linewise Visual），但如果旧模式就是所关联的模式，则会取消，回到Normal。

### gv
>Start Visual mode with the same area as the previous area and the same mode.  
In Visual mode the current and the previous Visual area are exchanged.  
After using "p" or "P" in Visual mode the text that was put will be selected.

#### 打开文件时正定位到上次离开时光标的位置
在.vimrc中添加以下代码即可：

```
au BufReadPost * if line("'\"") > 1 && line("'\"") <= line("$") | exe "normal! g'\"" | endif
```

其中`line("'\"")`，就是获取"标记所在的行号。`g'\"`就是移至"标记的位置。

#### gv选择上一次的选择区
如果需要对一段代码修改缩进，通常的做法是V之后选中这段代码，再用<或>左右调整。但输入一次<或>后选中状态便消失了，如果需要往左两次的话，需要再V然后选中，再输一次<。这个过程其实可以很简单。

下面将当前行减少两次缩进为例来说明如何做到快速连续修改缩进。  
gv命令可以启动可视模式，并重新选择上一次的选择区。因此，实现上述目标执行如下序列即可：

```
V<gv<
```

如果要左移三次的话，得输两次gv，还是比较麻烦的。可以通过重新映射<与>来改进。在.vimrc中加入如下行：

```
vnoremap < <gv
vnoremap > >gv
```

这样每次<或>后，会自动再选择缩进区域，只需要接着按<或>便可连续调整。

gv的另一个用途类似，是改进p。  
譬如，在替换几处文本时，如果我们觉得用s命令太麻烦，通常会用y复制新文本，再选中旧文本，按p去替换。这种效果可以实现的原理是，dcsxy等命令操作的文本会被填充无名寄存器""，而p在不指定寄存器时，使用的是无名寄存器中的内容，执行p操作时先取出无名寄存器中的内容（y复制的内容），再替换选中的内容。  
选中的内容被删除，会进入无名寄存器中，故下次再执行p时，取出的是上次被替换的内容，而不是y复制的内容了。  
为了多次替换，需要反复复制新内容。可以做如下映射来自动完成这个过程：

```
vnoremap p pgvy
```

### 在Visual区域中跳转
命令|含义
---|---
o|在起始与结束位置间跳转
O|在起始与结束位置间跳转

在不同的Visual模式下o与O有些不太一样，谁试谁知道。

### 在Visual区域中编辑
可使用的operator有：

```
~, d, c, y, >, <, !, =, gq
```

可使用text object选择方法，即`[ai]x`形式。

```
viw "选择当前光标所在位置的单词
```

可使用以下命令：

```
:, r, s, C, S, R, x, D, X, Y, p, J, U, u, CTRL-], I, A
```

在blockwise Visual模式下使用I可以在块中所有行前添加内容。

用CTRL-V选中一块文本，如下：

<pre>
<mark>H</mark>ello World!
<mark>H</mark>ello World!
</pre>

输入`IIt says `可将其修改成

<pre>
It says Hello World!
It says Hello World!
</pre>


