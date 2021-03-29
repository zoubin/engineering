# 不可写属性的继承问题

## `Object.create`与不可写属性的问题

```javascript
(() => {
  const o = {}
  Object.defineProperty(o, 'x', { value: 1 }) // o.x 不可写
  const p = Object.create(o)
  p.x = 2
  console.log(p.x) // 1 还是 2？
})()

```

关键语句在`p.x = 2`，可以从[ECMA-262](https://www.ecma-international.org/publications-and-standards/standards/ecma-262/)规范中看看这行语句是如何执行的。

## 基本流程
1. `Set (p, 'x', 2, true)`
1. `p.[[set]]('x', 2, p)`
1. `OrdinarySet(p, 'x', 2, p)`
1. `OrdinarySetWithOwnDescriptor(p, 'x', 2, p, undefined)`
1. `o.[[Set]]('x', 2, p)`
1. `OrdinarySet(o, 'x', 2, p)`
1. `OrdinarySetWithOwnDescriptor(o, 'x', 2, p, { writable: false })`
1. `p.[[set]]('x', 2, p)`返回`false`
1. `Set (p, 'x', 2, true)`抛出异常

**重点**：`p`本身没有`x`属性时，会使用原型链上一级的descriptor。

## 规范摘要

### Set ( O, P, V, Throw )
The abstract operation Set is used to set the value of a specific property of an object. The operation is called with arguments O, P, V, and Throw where O is the object, P is the property key, V is the new value for the property and Throw is a Boolean flag. This abstract operation performs the following steps:
1. Assert: Type(O) is Object.
2. Assert: IsPropertyKey(P) is true.
3. Assert: Type(Throw) is Boolean.
4. Let success be ? O.[[Set]](P, V, O).
5. If success is false and Throw is true, throw a TypeError exception.
6. Return success.

### [[Set]] ( P, V, Receiver )
When the [[Set]] internal method of O is called with property key P, value V, and ECMAScript language value Receiver, the following steps are taken:
1. Return ? OrdinarySet(O, P, V, Receiver).

### OrdinarySet ( O, P, V, Receiver )
When the abstract operation OrdinarySet is called with Object O, property key P, value V, and ECMAScript language value Receiver, the following steps are taken:
1. Assert: IsPropertyKey(P) is true.
2. Let ownDesc be ? O.[[GetOwnProperty]](P).
3. Return OrdinarySetWithOwnDescriptor(O, P, V, Receiver, ownDesc).


### OrdinarySetWithOwnDescriptor ( O, P, V, Receiver, ownDesc )
When the abstract operation OrdinarySetWithOwnDescriptor is called with Object O, property key P, value V, ECMAScript language value Receiver, and Property Descriptor (or undefined) ownDesc, the following steps are taken:
1. Assert: IsPropertyKey(P) is true.
2. If ownDesc is undefined, then
  a. Let parent be ? O.[[GetPrototypeOf]]().
  b. If parent is not null, then
    i. Return ? parent.[[Set]](P, V, Receiver). c. Else,
    i. Set ownDesc to the PropertyDescriptor { [[Value]]: undefined, [[Writable]]: true, [[Enumerable]]: true, [[Configurable]]: true }.
3. If IsDataDescriptor(ownDesc) is true, then
  a. If ownDesc.[[Writable]] is false, return false.
  b. If Type(Receiver) is not Object, return false.
  c. Let existingDescriptor be ? Receiver.[[GetOwnProperty]](P).
  d. If existingDescriptor is not undefined, then
    i. If IsAccessorDescriptor(existingDescriptor) is true, return false.
    ii. If existingDescriptor.[[Writable]] is false, return false.
    iii. Let valueDesc be the PropertyDescriptor { [[Value]]: V }.
    iv. Return ? Receiver.[[DefineOwnProperty]](P, valueDesc).
  e. Else,
    i. Assert: Receiver does not currently have a property P.
    ii. Return ? CreateDataProperty(Receiver, P, V).
4. Assert: IsAccessorDescriptor(ownDesc) is true.
5. Let setter be ownDesc.[[Set]].
6. If setter is undefined, return false.
7. Perform ? Call(setter, Receiver, « V »). 8. Return true.
