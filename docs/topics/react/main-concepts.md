# 快速入门
https://reactjs.org/docs/hello-world.html

## Hello World

> a syntax extension to JavaScript.
> ... to describe what the UI should look like
> ... JSX produces React “elements”.

```jsx
ReactDOM.render(
  <h1>Hello, world!</h1>,
  document.getElementById('root')
)
```

## Introducing JSX
> You can put any valid JavaScript expression inside the curly braces in JSX.

> You may use quotes to specify string literals as attributes
> You may also use curly braces to embed a JavaScript expression in an attribute

> JSX Prevents Injection Attacks

JSX Represents Objects. Babel compiles JSX down to React.createElement() calls.

```jsx
const element = (
  <h1 className="greeting">
    Hello, world!
  </h1>
);

```

```jsx
const element = React.createElement(
  'h1',
  {className: 'greeting'},
  'Hello, world!'
);

```

> These objects are called “React elements”. You can think of them as descriptions of what you want to see on the screen. React reads these objects and uses them to construct the DOM and keep it up to date.

## Rendering Elements
To render a React element into a root DOM node, pass both to ReactDOM.render()

React elements are immutable.
the only way to update the UI is to create a new element, and pass it to ReactDOM.render().

## Components and Props
Conceptually, components are like JavaScript functions. They accept arbitrary inputs (called “props”) and return React elements describing what should appear on the screen.

All React components must act like pure functions with respect to their props.

## State and Lifecycle
State Updates May Be Asynchronous

React may batch multiple setState() calls into a single update for performance.

Because this.props and this.state may be updated asynchronously, you should not rely on their values for calculating the next state.

