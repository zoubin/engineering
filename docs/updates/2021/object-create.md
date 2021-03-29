
在2020年第11版ECMA-262规范中，对于`Object.create`有如下描述：

Object.create ( O, Properties )
The *create* function creates a new object with a specified prototype. When the create function is called, the
following steps are taken:
1. If Type(O) is neither Object nor Null, throw a TypeError exception. 2. Let obj be OrdinaryObjectCreate(O).
3. If Properties is not undefined, then
a. Return ? ObjectDefineProperties(obj, Properties). 4. Return obj.

