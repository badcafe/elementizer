# Elementizer 

> **React to Web Component**

`@badcafe/elementizer` is a JavaScript library that exposes any [React](https://react.dev/) component as a [Web component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components).

<p style='align: center'>
    <img src="logo.svg"/>
</p>

<div style="display: flex;">
<div>

Out-of-the-box :

- ✅ Automatic attribute conversion
- ✅ Automatic event handling
- ✅ Support of child nodes
- ✅ Support of React contexts

</div>
<div>

For more complex cases :
- ✅ Custom attribute mappers
- ✅ Custom event mapper
- ✅ Custom context filling
- ✅ Custom rendering

</div>
</div>

### Setup

```bash
npm install @badcafe/elementizer
```

Usage:

* for the most common usage, just go on reading
* for more complete and complex usage, visit our [Elementizer demo](https://github.com/badcafe/elementizer/tree/main/demo-app), with a custom `render()` method.
* see also the [full API](#api)

The following examples use TypeScript, but they work the same way with JavaScript.

### Basic use

Import your React component and pass it to `createElement()` with the tag name :

#### `foo.ts`
```ts
import { createElement } from '@badcafe/elementizer';
import { Foo } from '@example/Foo'; // your React component

const FooElement = createElement({
    name: 'exemple-foo',
    reactComponent: Foo
})
```

Now, let's use `<exemple-foo>` (and other custom elements) like any other HTML element:

```html
<body>
    <h1>Elementizer exemple</h1>
    <exemple-foo>
        Nested content <b>works</b>
        <exemple-bar>out of the box !</exemple-bar>
    </exemple-foo>
</body>
```

> Note that bundling your Web component may vary according to the tool you used (and this is outside of the scope of this documentation), but it should end with such an import in your code:
> 
> ```html
> <script type="module">
>     import './foo'
> </script>
> ```
> Visit our [Elementizer demo](https://github.com/badcafe/elementizer/tree/main/demo-app) for a live example.

### Attributes

To observe attribute changes, just pass the list of their names when creating the element:

#### `foo.ts`
```ts
import { createElement } from '@badcafe/elementizer';
import { Foo } from '@example/Foo'; // your React component

const FooElement = createElement({
    name: 'exemple-foo',
    reactComponent: Foo,
    attributes: [
        'size',
        'variant'
    ]
})
```

* the `on[event]` attributes MUST NOT be set here (see below)
* do not listen to the `id` attribute (see below)
* by default, before passing them to the React component, the value is parsed with `JSON.parse()`; if it fails, a `String` mapper is used

```html
<body>
    <h1>Elementizer exemple</h1>
    <exemple-foo variant="neutral" size="20" id="myFoo">
        Nested content <b id="nested">works</b>
    </exemple-foo>
    <script>
        setInterval(() => {
            const Size = ['20', '30', '40'];
            const size = Size[Math.floor(Math.random() * Size.length)];
            // the size will be parsed and set as a number to the React prop
            myFoo.setAttribute('size', size);
        }, 2000);
        setInterval(() => {
            // the variant was initialized with the value "neutral",
            // (<exemple-foo variant="neutral" ...)
            // which is an invalid JSON value, and falls back to a string
            const Variant = ['positive' | 'informative' | 'negative'];
            const variant = Variant[Math.floor(Math.random() * Variant.length)];
            nested.textContent = variant;
            // the variant will be set as a string to the React prop
            myFoo.setAttribute('variant', variant);
        }, 3000);
    </script>
</body>
```

### Attribute mappers

Attribute values are strings, whereas React props may be... anything else.

We assume that the `Foo` React component expects the `size` prop as a number, and that the `variant` prop can have only the given values; we also introduce a `disable` boolean attribute mapped to the `isDisabled` React prop:

#### `foo.ts`
```ts
import { createElement } from '@badcafe/elementizer';
import { Foo } from '@example/Foo';

const FooElement = createElement({
    name: 'exemple-foo',
    reactComponent: Foo,
    attributes: [
        ['size', Number],
        ['variant', ['positive' | 'informative' | 'negative']],
        ['disabled', Boolean, 'isDisabled']
    ]
})
```

A mapper can be:
* one of the following constructors: `Boolean`, `Number`, `String`, `Date`, `Object`, `Array`
* an enumeration of all possible values
* a RegExp
* a custom function that takes the attribute node as an argument and returns anything useful for the React component

```html
<body>
    <h1>Elementizer exemple</h1>
    <exemple-foo disabled size="20" id="myFoo">
        Nested content
    </exemple-foo>
    <script>
        setTimeout(() => {
            // will check that the value is part of the list of known values
            myFoo.setAttribute('variant', 'informative');
            // will also delete the isDisabled React prop
            myFoo.removeAttribute('disabled');
            // will be converted to a number before passed to the React prop
            myFoo.setAttribute('size', '30');
        }, 1000);
        setTimeout(() => {
            // set again the disabled attribute
            // see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes#boolean_attributes
            myFoo.setAttribute('disabled', '');
            // the third parameter will be set directly to the React prop 
            // without using the mapper of this attribute
            myFoo.setAttribute('size', '40', 40);
            // a value that can't be mapped is set to null
            myFoo.setAttribute('variant', 'fuzzy');
        }, 2000);
    </script>
</body>
```

### Identifier attribute

As shown in the previous examples, every custom element may have an `id` attribute
* the `id` attribute MUST NOT be listed in the attributes list
* This is because a special mapper already exists for the `id` attribute
* Identifiers MUST be unique in the DOM; this is why it is not set as-is in the React component
* Instead, the `id` prop of the React component is **derived** from the Web component `id` attribute
* The derived value is by default: `myId` → `myId-elementizer` (this may be customized in the API)

### Standard events attributes

They work out of the box:

* Function invocation

```html
<body>
    <h1>Elementizer exemple</h1>
    <exemple-foo
        variant="neutral"
        size="20"
        onclick="doClick(event)"
    >
        Nested content <b id="nested">works</b>
    </exemple-foo>
    <script>
        function doClick(e) {
            const Variant = ['positive' | 'informative' | 'negative'];
            const variant = Variant[Math.floor(Math.random() * Variant.length)];
            nested.textContent = variant;
            e.currentTarget.setAttribute('variant', variant);
        }
    </script>
</body>
```

* Function call with `this`

Using `this` is like in any other JavaScript code:

```html
<body>
    <h1>Elementizer exemple</h1>
    <exemple-foo
        variant="neutral"
        size="20"
        onclick="doClick.call(this, event)"
    >
        Nested content <b id="nested">works</b>
    </exemple-foo>
    <script>
        function doClick(e) {
            const Variant = ['positive' | 'informative' | 'negative'];
            const variant = Variant[Math.floor(Math.random() * Variant.length)];
            nested.textContent = variant;
            this.setAttribute('variant', variant);
        }
    </script>
</body>
```

### Standard event members

```html
<body>
    <h1>Elementizer exemple</h1>
    <exemple-foo
        variant="neutral"
        size="20"
        id="myFoo"
    >
        Nested content <b id="nested">works</b>
    </exemple-foo>
    <script>
        myFoo.onclick = function doClick(e) {
            const Variant = ['positive' | 'informative' | 'negative'];
            const variant = Variant[Math.floor(Math.random() * Variant.length)];
            nested.textContent = variant;
            this.setAttribute('variant', variant);
        }
    </script>
</body>
```

### Standard event listener

```html
<body>
    <h1>Elementizer exemple</h1>
    <exemple-foo
        variant="neutral"
        size="20"
        id="myFoo"
    >
        Nested content <b id="nested">works</b>
    </exemple-foo>
    <script>
        const fooClickListener = myFoo.addEventListener('click', function doClick(e) {
            const Variant = ['positive' | 'informative' | 'negative'];
            const variant = Variant[Math.floor(Math.random() * Variant.length)];
            nested.textContent = variant;
            this.setAttribute('variant', variant);
        });
    </script>
</body>
```

### React events

On the React side, a component may manage a specific event, e.g. `onPress()`. In that case it works like any other standard event on the Web component side: the `onpress` attribute defines a function that will be invoked by the React component, and that function is exposed as a method of the Web component.

```html
<body>
    <h1>Elementizer exemple</h1>
    <exemple-foo
        variant="neutral"
        size="20"
        onpress="doPress(event)"
    >
        Nested content <b id="nested">works</b>
    </exemple-foo>
    <script>
        function doPress(e) {
            const Variant = ['positive' | 'informative' | 'negative'];
            const variant = Variant[Math.floor(Math.random() * Variant.length)];
            nested.textContent = variant;
            e.currentTarget.setAttribute('variant', variant);
        }
    </script>
</body>
```

> Non-standard event handlers can only be registered as HTML attributes.

### Events mappers

More often than not, events just work, but in some situations, a specific event mapper builder may be passed to `createElement()`.

Here is a template to use when the React prop name differs from the default name mapping (the third character being uppercase):

#### `foo.ts`
```ts
import { createElement } from '@badcafe/elementizer';
import { Foo } from '@example/Foo'; // this is your React element

const FooElement = createElement({
    name: 'exemple-foo',
    reactComponent: Foo,
    attributes: [
        ['size', Number],
        ['variant', ['positive' | 'informative' | 'negative']],
        ['disabled', Boolean, 'isDisabled']
    ],
    eventMappers: {
        onselectionchange: (attr) => function onSelectionChange(event) {
            // this is how every event is invoked by default
            attr.ownerElement[attr.name]?.call(attr.ownerElement, event);
        }
    }
})
```

In fact, there is a specific default event mapper for the `click` event, which intercepts the bubble-phase event to prevent some events from running twice. It is defined in `HTMLReactElement.defaultClickEventMapper`.

### Context filling

A React context is not a component, but it can be exposed as a Web component, allowing population of some data within the HTML page:

```html
<body>
    <h1>Elementizer exemple</h1>
    <exemple-foo-context id="exemple">
        <script id="fooContext" type="application/json">
            {
                "apiUrl": "https://api.exemple.com",
                "theme": "dark",
                "features": ["login", "search", "profile"]
            }
        </script>
        <div>
            <exemple-foo>Can use the React context</exemple-foo>
        </div>
    </exemple-foo-context>
</body>
```

Notice that to render a React context, we have to change the file extension:

#### `foo.tsx`
```ts
import { createElement, Slot } from '@badcafe/elementizer';
import { FooContext } from '@example/Foo'; // your React context

const FooContextElement = createElement({
    name: 'exemple-foo-context',
    render() {
        const fooContext = JSON.parse(document.getElementById('fooContext')?.textContent);
        return (
            <FooContext value={ fooContext }>
                // ensure that the children will inherit the context
                <Slot children={ this.original } portals={ this.reactPortals }/>
            </FooContext>
        );
    }
})
```

Above, the Web component wraps a static React context, but we can also have a live context:

### Dynamic context

In the following example, we are just binding a React context to an observable property set on the Web component: every change will be propagated to the React component that observes it:

#### `foo.tsx`
```ts
import { createElement, Slot } from '@badcafe/elementizer';
import { FooContext } from '@example/Foo'; // your React context

export const FooContextElement = createElement({
    name: 'exemple-foo-context',
    initialize() {
        const fooContext = JSON.parse(document.getElementById('fooContext')!.textContent);
        this.observablesProps.fooContext = fooContext;
        // expose as a prop of the Web component
        this.fooContext = this.observablesProps.fooContext;
    },
    render() {
        return (
            <FooContext value={ this.observablesProps.fooContext }>
                <Slot children={ this.original } portals={ this.reactPortals }/>
            </FooContext>
        );
    }
});
```

Now, from the ID of `<exemple-foo-context>` :

```html
    <script>
        function setTheme(theme) {
            exemple.fooContext.theme = 'light';
        }
    </script>
```

> Note: any **observer** React component that use this context will rerender.

### Subordinate elements

In every component, Elementizer allows the use of any children, even other Web components.

However, in certain circumstances:
* The React component's design doesn't deal directly with child nodes,
* Subordinate components are pulled directly by React
* There is no 1-to-1 mapping between the React component and the Web component
* The React component works with props that are React nodes

Since we are bypassing the standard rendering process, we must supply a `render()` method instead when calling the `createElement()` function.

In all the mentioned cases, or if the rendering doesn't work as expected, or if the CSS doesn't apply as expected, you are falling into complex use cases. The [Elementizer demo](https://github.com/badcafe/elementizer/tree/main/demo-app) shows a real complex example and contains detailed explanations.

## How Elementizer works

Unlike a React app where the React tree is superposed to the DOM tree, Elementizer manages a React tree separated from the DOM tree, which makes possible the cohabitation of React with non-React components; the link between the 2 worlds is made with portals and observers:

* The React tree is made exclusively of React portals
* React portals are rendered in the HTML tree
* Observers let React components re-render when their Web component wrapper is updated

However, on the Web components side, the rendering of the nested element must cohabit with the rendering of the React portals. To achieve this cohabitation, Elementizer introduces an intermediate `<slot>` element under the rendered React component where the original child nodes of the Web component are moved.

This may lead to CSS mismatch, for example when a React component is supposed to have another React element as its direct child. It may be necessary to inspect the rendering and either fix the original CSS or supply an add-on CSS.

Visit the [Elementizer demo](https://github.com/badcafe/elementizer/tree/main/demo-app) to see a real complex example with detailed explanations.

### Things that may not work

It's worth mentioning that React and Web components are strongly incompatible, and every difference is subject to making things go wrong:

* In React, the lifecycle is managed by the React rendering engine (Virtual DOM + reconciliation). Developers do not control when DOM updates occur.
* In Web components, the lifecycle is managed directly by the browser's DOM. Lifecycle triggers are actual DOM operations: element added to or removed from the DOM, attribute change. No virtual DOM exists.

| Lifecycle Stage | React               | Web Components             |
| --------------- | --------------------| -------------------------- |
| Creation        | function init       | constructor                |
| Mount           | `useEffect([])`     | `connectedCallback`        |
| Update          | `useEffect(deps)`   | `attributeChangedCallback` |
| Unmount         | cleanup function    | `disconnectedCallback`     |
| DOM management  | Virtual DOM diffing | Direct DOM manipulation    |

| Architectural Differences | React                                              | Web Components                                |
| ------------------------- | -------------------------------------------------- | --------------------------------------------- |
| Bootstrap                 | Creation → Mount                                   | HTMLElement  → HTMLReactElement (*) → Mount   |
| Hooks                     | State → render() → Virtual DOM → Diff → DOM update | DOM insertion/removal → lifecycle callbacks   |
| Forms management          | controlled/uncontrolled                            | uncontrolled inputs                           |
| State management          | Contexts, component states                         | HTML, DOM data-[attributes], class properties |

> Note (*) :
> * Web components are instantiated in `import` order; this may lead to rendering issues
> * `<script>` that are handling element triggered **before** Web component instantiation won't see a `HTMLReactElement`, but only a `HTMLElement`

## API

The entry point is the `createElement()` function:

```ts
import { createElement } from '@badcafe/elementizer';

const MyCustomElement = createElement({
    // CreateElement settings
})
