title: JS中一些有关原型的问题
date: 2015-11-18 13:59:00
tags:
  - javascript
---

## obj.hasOwnProperty('__proto__') === false
```javascript
var o = {}

print('toString', o)
o.toString = true
print('toString', o)

print('__proto__', o)
o.__proto__ = true
print('__proto__', o)

function print(name, obj) {
  console.log(
    'name:', name,
    ',',
    'typeof:', typeof obj[name],
    ',',
    'hasOwnProperty:', Object.prototype.hasOwnProperty.call(obj, name)
  )
}

```

output:

```
name: toString , typeof: function , hasOwnProperty: false
name: toString , typeof: boolean , hasOwnProperty: true
name: __proto__ , typeof: object , hasOwnProperty: false
name: __proto__ , typeof: object , hasOwnProperty: false

```

## Object.create(null)
```javascript
var o = Object.create(null)

print('toString', o)
o.toString = true
print('toString', o)

print('__proto__', o)
o.__proto__ = true
print('__proto__', o)

function print(name, obj) {
  console.log(
    'name:', name,
    ',',
    'typeof:', typeof obj[name],
    ',',
    'hasOwnProperty:', Object.prototype.hasOwnProperty.call(obj, name)
  )
}

```

output:

```
name: toString , typeof: undefined , hasOwnProperty: false
name: toString , typeof: boolean , hasOwnProperty: true
name: __proto__ , typeof: undefined , hasOwnProperty: false
name: __proto__ , typeof: boolean , hasOwnProperty: true

```



