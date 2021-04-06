# 不可写属性的继承问题

```javascript
(() => {
  const obj = {}
  Object.defineProperty(obj, 'x', { value: 1 }) // obj.x 不可写
  const o = Object.create(obj)
  o.x = 2
  console.log(o.x) // 1 还是 2？
})()

```

关键语句在`o.x = 2`，可以从[ECMA-262][ecma]规范中看看这行语句是如何执行的。

## 流程分析

对于赋值语句，在规范 [Runtime Semantics: Evaluation][12.15.4] 中可以发现实际执行的是 `PutValue(lref, rval)`。而 [PutValue][6.2.4.9] 中对于对象属性赋值，调用的是 `o.[[Set]]('x', 2, o)`。因此，可以根据[Set][9.1.9]来梳理流程。

1. `o.[[set]]('x', 2, o)`
2. `OrdinarySet(o, 'x', 2, o)`
3. `OrdinarySetWithOwnDescriptor(o, 'x', 2, o, undefined)`
4. `obj.[[Set]]('x', 2, o)`
5. `OrdinarySet(obj, 'x', 2, o)`
6. `OrdinarySetWithOwnDescriptor(obj, 'x', 2, o, { writable: false })`

`OrdinarySetWithOwnDescriptor`执行了 2 次，第 1 次传入的 `ownDesc` 为 `undefined`，因为 `o` 上没有 `x` 属性。
从而导致调用 `obj.[[Set]]('x', 2, o)`，触发第二次 `OrdinarySetWithOwnDescriptor` 的调用，不过这次使用的是 `obj` 上的 `ownDesc`。

所以，给对象上非自身属性赋值时，会使用原型上该属性的 `ownDesc`，如果不可写，则这次写操作会失败。


## OrdinarySetWithOwnDescriptor ( O, P, V, Receiver, ownDesc )
When the abstract operation OrdinarySetWithOwnDescriptor is called with Object O, property key P, value V, ECMAScript language value Receiver, and Property Descriptor (or undefined) ownDesc, the following steps are taken:
1. Assert: IsPropertyKey(P) is true.
2. If ownDesc is undefined, then

    a. Let parent be ? O.[[GetPrototypeOf]]().

    b. If parent is not null, then

        1. Return ? parent.[[Set]](P, V, Receiver).

    c. Else,

        1. Set ownDesc to the PropertyDescriptor { [[Value]]: undefined, [[Writable]]: true, [[Enumerable]]: true, [[Configurable]]: true }.

3. If IsDataDescriptor(ownDesc) is true, then

    a. If ownDesc.[[Writable]] is false, return false.

    b. If Type(Receiver) is not Object, return false.

    c. Let existingDescriptor be ? Receiver.[[GetOwnProperty]](P).

    d. If existingDescriptor is not undefined, then

        1. If IsAccessorDescriptor(existingDescriptor) is true, return false.
        2. If existingDescriptor.[[Writable]] is false, return false.
        3. Let valueDesc be the PropertyDescriptor { [[Value]]: V }.
        4. Return ? Receiver.[[DefineOwnProperty]](P, valueDesc).

    e. Else,

        1. Assert: Receiver does not currently have a property P.
        2. Return ? CreateDataProperty(Receiver, P, V).

4. Assert: IsAccessorDescriptor(ownDesc) is true.
5. Let setter be ownDesc.[[Set]].
6. If setter is undefined, return false.
7. Perform ? Call(setter, Receiver, « V »).
8. Return true.

[ecma]: https://www.ecma-international.org/publications-and-standards/standards/ecma-262/
[12.15.4]: https://262.ecma-international.org/11.0/#sec-assignment-operators-runtime-semantics-evaluation
[6.2.4.9]: https://262.ecma-international.org/11.0/#sec-putvalue
[9.1.9]: https://262.ecma-international.org/11.0/#sec-ordinary-object-internal-methods-and-internal-slots-set-p-v-receiver
