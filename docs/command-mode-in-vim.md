# command mode in vim

## ex Commands
command|meaning
---|---
d|Delete lines
m|Move lines
co|Copy lines
t|Copy lines (a synonym forco)

### 指定操作的行范围
命令形式|含义
---|---
|直接使用数字
:3,18d | 删除3到18行
:3,18m100 | 将3到18行移动到第100行后，相当于d再p
:3,18t100 | 将3到18行复制到第100行后，相当于y再p
|使用相对当前行号的符号
:.,$d | 删除当前行到最后一行
:%d | 删除所有行
:3,.m100 | 将3到当前行移动到第100行后
:%t$ | 复制所有行，添加到末尾
:.,+20d | 删除当前行及接下来的20行
:20,$m.-2 | 将20行以后的内容移动到当前行往上的两行位置
:-,+t0 | 复制当前行上下共三行到文件顶部（1表示第1行）
|使用搜索：`/pattern/`可表示行号。
:/pattern/d | 删除下一处pattern所在的行
:/pattern/+d | 删除下一处pattern所在行的下一行
:/pattern1/,/pattern2/d | 删除下一处pattern1所在行到下一处pattern2所在行
:.,/pattern/m23|-
`d/pattern`|删除从当前位置到pattern所在位置前的所有字符。
`:.,/pattern/d`|删除从当前行到pattern所在行。注意与`d/pattern`的区别
|使用分号修改相对行号的含义
`100,+6d`|删除100行到当前行以下的第6行。
`100;+6d`|删除100行到106行。

### 搜索
`:g`可以进行全局搜索。

命令形式|含义
---|---
:g/pattern | 查找（并移动）到最后一处pattern
:g/pattern/p | 查找并展示所有pattern所在的行
:g!/pattern/nu | 查找并展示所有pattern不在的行，并展示行号
:60,120g/pattern/p | 在60到120行中查找并展示所有pattern在的行

`:g`可以和`:s`，`:d`，`:mo`，`:co`组合使用。

命令形式|含义
---|---
`:g/pattern/s/old/new/g`|在所有含有pattern的行上执行`s/old/new/g`
`:g/pattern/s//new/g`|即`:g/pattern/s/pattern/new/g`或`%s/pattern/new/g`

### 其它
#### 多条命令组合
可以用`|`来在同一行执行多条命令，相当于shell中的`;`。
#### 添加到文件末尾

```
:300,$w>>filename
```
#### 读取文件内容

```
:r file
:30r file
:$r file
:0r file
:/pattern/r file
```
