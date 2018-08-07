# 文档渲染时两种视口的作用
本文是 [A tale of two viewports] 的读后总结。

## desktop

### CSS像素不同于设备像素
设备像素（device pixels）用于给定设备的分辨率，一般可以通过 `screen.width/height` 得到。
CSS像素是CSS中的一种长度单位。

譬如，设置某个元素 `width: 128px`，如果显示器宽度是1024px，则浏览器全屏时一行可以放下8个128px CSS像素长度的元素。

### 屏幕尺寸使用设备像素表示设备的分辨率
`screen.width/height`可以拿到显示器的宽高，然而这个数据对于页面布局而言并没有太大用处。

### 窗口尺寸使用CSS像素表示用户可以看到页面范围
`window.innerWidth/innerHeight`给出了用户可以看到的页面宽高（包含滚动条），使用CSS像素作为单位。

当用户放大时，可以看到的页面宽高都变小了，这时 `window.innerWidth/innerHeight` 的值会变小。

### 缩放会改变CSS像素实际覆盖的设备像素数目
在上面的例子中，如果用户将页面放大2倍，则一行只可以放下4个128px宽度的元素。
元素的宽度仍然是128个CSS像素，但每1个CSS像素长度等同于2个设备像素，因此我们看到元素在显示器上的尺寸变大了。

在缩放系数为1时，不放大也不缩小，1个CSS像素长度与1个设备像素长度一样。

### 滚动的偏移量使用CSS像素
`window.pageX/YOffset` 表示文档往右、下的滚动量。

缩放时浏览器会稍微调整该值，以确保某个元素总是在视口中。

### 视口用于限定<html>元素
块级元素的宽度默认是父元素的宽度，也可使用 10% 这样的相对量来设置。
但`<html>`元素是没有父元素的，它的宽度总是与视口的宽度一样。

**视口即浏览器窗口**。

假设一个元素的宽度是100%的`<html>`元素宽度，当放大页面时，视口宽度不变，故`<html>`宽度不变，因而该元素的宽度也不变。
但是元素的内容被放大了，它们如果使用的是绝对单位，内容的便可能溢出。

### 获取视口尺寸
`document.documentElement.clientWidth/Height`。

`document.documentElement`即`<html>`，但是它的`clientWidth/Height`却表示的是视口（可以认为是`<html>`的容器）的尺寸。
可以将`<html>`设置成任意尺寸，而`clientWidth/Height`仍然不变。
这个是`<html>`独有的特性，其它元素的`clientWidth/Height`永远都是padding box的尺寸。

另外一组类似的属性也能给出视口的尺寸：`window.innerWidth/Height`。
但`clientWidth/Height`不包含滚动条，而`innerWidth/Height`包含。
在浏览器大战时代，IE只支持前者，而Netscape只支持后者，所以导致后来出现两者并存的局面。

但这两者并存的局面对于移动端来说却是一种福音。（TODO：什么情况下有用？）

### 获取<html>元素的尺寸
既然`document.documentElement.clientWidth/Height`表示视口的尺寸，而非`<html>`元素的padding box尺寸，那么如何获取后者？

答案是无法直接获取。
但可以通过`offsetWidth/Height`来取得`<html>`的border box的尺寸。

事实上，一共有下面几种属性与元素尺寸相关：

- `clientWidth/Height`：padding box
- `offsetWidth/Height`：border box
- `scrollWidth/Height`：padding box 加上溢出的内容区域
- `clientLeft/Top`：left border edge与left padding edge的距离（左边宽加滚动条），top border edge与top padding edge的距离（上边宽加滚动条）。对于行内元素而言，总是为0.
- `offsetLeft/Top`：元素相对于`offsetParent`的偏移。对于无定位的元素来说，`offsetParent`就是`<html>`。
- `scrollLeft/Top`：滚动位置，可设置。

此外，`getBoundingClientRect()`返回`{ left, top, right, bottom }`，这些位置是相对于视口而言的。

### 事件对象中的位置信息
有三种属性对：
- `pageX/Y`：相对于`<html>`的偏移，单位是CSS像素
- `clientX/Y`：相对于视口的偏移，单位是CSS像素
- `screenX/Y`：相对于显示屏的偏移，单位是设备像素

### media queries中的尺寸指的是视口的尺寸

```css
div.sidebar {
  width: 300px;
}

@media all and (max-width: 400px) {
  /* styles assigned when width is smaller than 400px; */
  div.sidebar {
    width: 100px;
  }
}

```

## mobile

### 难点在于屏幕尺寸太小
一般的CSS规则在手机上应用后，元素尺寸小到无法正常识别。

### 提供一种更大的视口来布局
CSS根据视口来进行布局，在桌面上，浏览器窗口足够大，视口可以给CSS提供足够的空间。但在手机上，需要一个更大的视口。
由此，引入了两种视口：

- 观察视口（the visual viewport）
- 布局视口（the layout viewport）

>Imagine the layout viewport as being a large image which does not change size or shape. Now image you have a smaller frame through which you look at the large image. The small frame is surrounded by opaque material which obscures your view of all but a portion of the large image. The portion of the large image that you can see through the frame is the visual viewport. You can back away from the large image while holding your frame (zoom out) to see the entire image at once, or you can move closer (zoom in) to see only a portion. You can also change the orientation of the frame, but the size and shape of the large image (layout viewport) never changes.

- 观察视口是当前显示在屏幕上的页面部分，用户可以通过滚动来改变视口内容，也可以通过缩放来改变视口大小。
- 实际的元素布局发生在布局视口，CSS中的相对宽度（譬如`<html>`的宽度）是相对它的宽度来计算的。布局视口的宽度是固定不变的，Safari iPhone使用980px，Opera使用850px，Android WebKit使用800px，IE使用974px。可见，这些宽度都远远大于一般手机。
- 在开始的时刻，两个视口宽度一样，这也是页面可以缩小的最大程度。当用户放大时或旋转时，布局视口宽度都是不变的，但观察视口的尺寸会被修改。

**尺寸**：
- 布局视口：`document.documentElement.clientWidth/Height`。固定不变。
- 观察视口：`window.innerWidth/Height`。放大时减小，缩小时增大。

### 指定布局视口宽度
`<meta name="viewport" content="width=320">`

场景：一个文本段落在较大宽度的布局视口下可能会渲染成一行，放大后查看时阅读困难，所以可以将布局视口设置成一个更小的尺寸以改善体验。

[A tale of two viewports]: http://www.quirksmode.org/mobile/viewports.html

