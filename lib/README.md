<!-- do not edit, this file has been generated ; 
     see doc-src/README-SRC.md -->

# Elementizer 

> **React to Web Component**

`@badcafe/elementizer` is a JavaScript library that exposes any [React](https://react.dev/) component as a [Web component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components).

<p style='align: center'>
    <img src="https://raw.githubusercontent.com/badcafe/elementizer/refs/heads/main/lib/logo.svg"/>
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

* [Github repo](https://github.com/badcafe/elementizer/tree/main/lib)
* [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/badcafe/elementizer/tree/main/demo-app)

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
```

<table>
  <thead>
    <tr>
      <th>Function</th>
      <th>Signature</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="vertical-align: top;"><code>createElement</code></td>
      <td style="vertical-align: top;">(···settings···: <code>CreateElement</code>) =&gt; <code>typeof HTMLReactElement</code></td>
      <td style="vertical-align: top;">

Create a Web component based on React.

</td>
    </tr>
  </tbody>
</table>
<table>
  <thead>
    <tr>
      <th>Member</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background-color: #F6F6FF">
      <th style="vertical-align: top;"><code>CreateElement</code></th>
      <th style="vertical-align: top;">interface</th>
      <th style="vertical-align: top; font-weight: normal">Allow to customize the creation of a Web component.</th>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>attributes</code></td>
      <td style="vertical-align: top;"><code>AttributeOrMapper[]</code></td>
      <td style="vertical-align: top;">

The HTML attributes to pass to the underlying React component.

All those attributes will be also set as the static `observedAttributes`
property of the created class.

Events attributes MUST NOT be listed here.

HTML attributes that have to be mapped to a specific React prop
may require a specific mapping function to produce a React value,
and optionally a different React prop name. A mapper can also be
a RegExp or a tuple of allowed values.

### Exemples :
```js
{
    attributes: [
       // default mapper
       'foo',
       // built-in mappers
       ['big', BigInt],
       ['disabled', Boolean, 'isDisabled'],
       // user-defined mapper
       ['foo', ({value}) => value ? new Foo(value) : null],
       // allowed values
       ['size': ['small', 'medium', 'large']],
       // RegExp
       ['isbn', /^(?=(?:[^0-9]*[0-9]){10}(?:(?:[^0-9]*[0-9]){3})?$)[\\d-]+$/]
    ]
}
```

Built-in mappers are `Boolean`, `String`, `Number`,
`BigInt`, `Date`, `Array`, `Object`.

The default mapper will parse the attribute value as JSON,
and in case of failure, will register a `String` mapper.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>className</code></td>
      <td style="vertical-align: top;"><code>string</code></td>
      <td style="vertical-align: top;">

The class name that holds the web components ;
a concrete [class](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#constructor)
with that name will be created.

By default, it is derived from the name like this :
`my-great-component` ⮕ `HTMLGreatComponentElement`

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>defineCustomElement</code></td>
      <td style="vertical-align: top;"><code>boolean</code></td>
      <td style="vertical-align: top;">

By default, the custom element created is defined
in the custom element registry ; set `false` to
define it yourself.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>eventMappers</code></td>
      <td style="vertical-align: top;"><code>Record&lt;string, EventMapper&gt;</code></td>
      <td style="vertical-align: top;">

Each event that requires a specific mapping
function must be set here.

### Exemple :
```js
{
    onselectionchange: (attr) => function onSelectionChange(event) {
        attr.ownerElement[attr.name]?.call(attr.ownerElement, event);
    }
}
```

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>name</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;"><code>string</code></td>
      <td style="vertical-align: top;">

The [name](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#name)
of the web component to create.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>reactComponent</code></td>
      <td style="vertical-align: top;"><code>FC&lt;any&gt;</code></td>
      <td style="vertical-align: top;">

The given React component will be wrapped within
the Web component created, except if the `render()`
method is supplied.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>initialize</code></td>
      <td style="vertical-align: top;">(this: <code>HTMLReactElement</code>) =&gt; <code>void</code></td>
      <td style="vertical-align: top;">

When present, this method is executed after the constructor.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>render</code></td>
      <td style="vertical-align: top;">(this: <code>HTMLReactElement</code>) =&gt; <code>ReactNode</code></td>
      <td style="vertical-align: top;">

Allow to override the default rendering strategy.

</td>
    </tr>
  </tbody>
</table>
<table>
  <thead>
    <tr>
      <th>Type alias</th>
      <th>Definition</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="vertical-align: top;"><code>AttributeOrMapper</code></td>
      <td style="vertical-align: top;"><code>string | [attrName: string, mapper: AttrMapper, reactPropName?: string]</code></td>
      <td style="vertical-align: top;">

Just an attribute name, or a tuple of :
* an attribute name
* a mapper for this attribute
* an optional React property name, if it is different of the attribute name

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>EventMapper</code></td>
      <td style="vertical-align: top;"><code>(event: AttrLike) =&gt; EventHandler&lt;any&gt;</code></td>
      <td style="vertical-align: top;">

Allow to map an HTML event to a React event handler builder.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>AttrMapper</code></td>
      <td style="vertical-align: top;"><code>((attr: AttrLike) =&gt; any) | BooleanConstructor | StringConstructor | NumberConstructor | BigIntConstructor | DateConstructor | ObjectConstructor | ArrayConstructor | readonly string[] | RegExp</code></td>
      <td style="vertical-align: top;">

Allow to map an HTML attribute to a React prop value. Can be :
* a custom function that maps an attribute to a value
* an enumeration of the valid strings
* a regular expression
* one of the constructors `Boolean`, `String`, `Number`, `BigInt`, `Date`, `Object` or `Array`

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>Dispose</code></td>
      <td style="vertical-align: top;"><code>() =&gt; void</code></td>
      <td style="vertical-align: top;">

Allow to unmount a React component.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>AttrLike</code></td>
      <td style="vertical-align: top;"><code>Partial&lt;Attr&gt; &amp; Pick&lt;Attr, &quot;localName&quot;&gt; &amp; { ownerElement?: null | Element &amp; Record&lt;string, any&gt;; value: any }</code></td>
      <td style="vertical-align: top;">

Looks like an attribute. Note that a mapper that do require
a real attribute may not be part of `observedAttributes` ;
such mapper works only on initialization.

</td>
    </tr>
  </tbody>
</table>
<table>
  <thead>
    <tr>
      <th>Member</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background-color: #F6F6FF">
      <th style="vertical-align: top;"><code>HTMLReactElement</code></th>
      <th style="vertical-align: top;">class</th>
      <th style="vertical-align: top; font-weight: normal">A Web component wrapper for React.</th>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>constructor</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;">() =&gt; <code>HTMLReactElement</code></td>
      <td style="vertical-align: top;"></td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>dispose</code></td>
      <td style="vertical-align: top;"><code>Dispose</code></td>
      <td style="vertical-align: top;">

Dispose the underlying React component.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>observablesProps</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;"><code>any</code></td>
      <td style="vertical-align: top;">

When the underlying React component use props, those
are initialized in this observable object with the
attributes of the Web component wrapper.

Subsequent updates of the Web component attributes are
propagated here, causing the React component refresh.


<p><strong>Default:</strong> <code>...</code></p></td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>original</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;"><code>ChildNode[]</code></td>
      <td style="vertical-align: top;">

The original child nodes when the element's constructor was
called ; child nodes will eventually be altered when mounting,
whereas original child nodes won't.


<p><strong>Default:</strong> <code>...</code></p></td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>reactPortals</code></td>
      <td style="vertical-align: top;"><code>Set&lt;ReactPortal&gt;</code></td>
      <td style="vertical-align: top;">

Subordinate React components will be rendered in their own
portal.


<p><strong>Default:</strong> <code>...</code></p></td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code style="color: white; background: darkgrey; padding: 0.25em 0.4em; border: 0.1em solid grey; margin-right: 0.25em; font-size: 70%; border-radius: 0.8em">static</code><code>attrMappers</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;"><code>Map&lt;string, [mapper: AttrMapper, reactPropName?: string]&gt;</code></td>
      <td style="vertical-align: top;">

Per-attribute mappers.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code style="color: white; background: darkgrey; padding: 0.25em 0.4em; border: 0.1em solid grey; margin-right: 0.25em; font-size: 70%; border-radius: 0.8em">static</code><code>debug</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;"><code>boolean</code></td>
      <td style="vertical-align: top;"><p><strong>Default:</strong> <code>false</code></p></td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code style="color: white; background: darkgrey; padding: 0.25em 0.4em; border: 0.1em solid grey; margin-right: 0.25em; font-size: 70%; border-radius: 0.8em">static</code><code>eventMappers</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;"><code>Map&lt;string, EventMapper&gt;</code></td>
      <td style="vertical-align: top;">

Per-event mappers, that map HTML events, e.g. `onclick`
to a builder function that returns a React function handler.

The React function handler is supposed someway to invoke
the function bound to the HTML attribute, e.g. :

```js
attr => function (...args) {
    attr.ownerElement[attr.name]?.call(attr.ownerElement, ...args);
}
```

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code style="color: white; background: darkgrey; padding: 0.25em 0.4em; border: 0.1em solid grey; margin-right: 0.25em; font-size: 70%; border-radius: 0.8em">static</code><code>namespace</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;"><code>string</code></td>
      <td style="vertical-align: top;"><p><strong>Default:</strong> <code>'elementizer'</code></p></td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>attributeChangedCallback</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;">(name: <code>string</code>, oldValue: <code>string</code>, newValue: <code>string</code>) =&gt; <code>void</code></td>
      <td style="vertical-align: top;">

Propagate an attribute change in the Web component to the
underlying React component.

See also: [Responding to attribute changes](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#responding_to_attribute_changes)

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>connectedCallback</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;">() =&gt; <code>void</code></td>
      <td style="vertical-align: top;">

Mount the Web component

See also: [Custom element lifecycle callbacks](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#custom_element_lifecycle_callbacks)

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>disconnectedCallback</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;">() =&gt; <code>void</code></td>
      <td style="vertical-align: top;">

Unmount the Web component

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>initialize</code></td>
      <td style="vertical-align: top;">() =&gt; <code>void</code></td>
      <td style="vertical-align: top;">

When present, this method is executed after the constructor.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>reactEvents</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;">() =&gt; <code>object</code></td>
      <td style="vertical-align: top;">

This method creates the React events to inject in the underlying
React component.

Called by the default `render()` method.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code style="color: white; background: darkgrey; padding: 0.25em 0.4em; border: 0.1em solid grey; margin-right: 0.25em; font-size: 70%; border-radius: 0.8em">abstract</code><code>reactProps</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;">() =&gt; <code>object</code></td>
      <td style="vertical-align: top;">

This method creates the React props to inject in the underlying
React component.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>register</code></td>
      <td style="vertical-align: top;">(registry?: <code>CustomElementRegistry</code>) =&gt; <code>void</code></td>
      <td style="vertical-align: top;">

Call this method to register this element, provided that this
method exist, otherwise this element is already registered.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code style="color: white; background: darkgrey; padding: 0.25em 0.4em; border: 0.1em solid grey; margin-right: 0.25em; font-size: 70%; border-radius: 0.8em">abstract</code><code>render</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;">() =&gt; <code>ReactNode</code></td>
      <td style="vertical-align: top;">

Render this Web component as a React node. This method is invoked
once. By default, it renders the React component given if any with
a child `<slot>` where are moved the original children, or directly
an HTML `<slot>`. In both cases, the React portals are also rendered.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>setAttribute</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;">(name: <code>string</code>, value: <code>string</code>, propValue?: <code>any</code>) =&gt; <code>void</code></td>
      <td style="vertical-align: top;">

This method may be invoked with a third parameter, that will
be set directly to this `observablesProps` without using the
class attribute mappers.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code style="color: white; background: darkgrey; padding: 0.25em 0.4em; border: 0.1em solid grey; margin-right: 0.25em; font-size: 70%; border-radius: 0.8em">static</code><code>createPortal</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;">(react: <code>ReactNode</code>, html: <code>HTMLElement</code>) =&gt; <code>Dispose</code></td>
      <td style="vertical-align: top;">

Attach a portal to the React tree.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code style="color: white; background: darkgrey; padding: 0.25em 0.4em; border: 0.1em solid grey; margin-right: 0.25em; font-size: 70%; border-radius: 0.8em">static</code><code>defaultClassName</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;">(name: <code>string</code>) =&gt; <code>string</code></td>
      <td style="vertical-align: top;">

The default implementation that computes the
class name of web components :
`my-great-component` ⮕ `HTMLGreatComponentElement`

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code style="color: white; background: darkgrey; padding: 0.25em 0.4em; border: 0.1em solid grey; margin-right: 0.25em; font-size: 70%; border-radius: 0.8em">static</code><code>defaultClickEventMapper</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;">(···settings···: <code>AttrLike</code>) =&gt; <code>(event: Partial&lt;BaseSyntheticEvent&gt;) =&gt; void</code></td>
      <td style="vertical-align: top;">

Maps the HTML attribute event `onclick` to the React event
prop `onClick: function(e) {}`. This default mapper ignores the
[Bubbling Phase](https://developer.mozilla.org/fr/docs/Web/API/Event/eventPhase#valeur).

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code style="color: white; background: darkgrey; padding: 0.25em 0.4em; border: 0.1em solid grey; margin-right: 0.25em; font-size: 70%; border-radius: 0.8em">static</code><code>defaultDeriveIdentifierAttribute</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;">(···settings···: <code>AttrLike</code>) =&gt; <code>string</code></td>
      <td style="vertical-align: top;">

The Web component and the underlying React component can't
have the same identifier ; this method allow to derive the
attribute found in the Web component to a specific one to
set on the React component, by default : `myId` ⮕ `myId-elementizer`.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code style="color: white; background: darkgrey; padding: 0.25em 0.4em; border: 0.1em solid grey; margin-right: 0.25em; font-size: 70%; border-radius: 0.8em">static</code><code>deriveAttrToMethod</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;">(argNames: <code>string[]</code>) =&gt; <code>(attr: AttrLike) =&gt; AttrLike</code></td>
      <td style="vertical-align: top;">

Derive an attribute, e.g. `onpress="doSomething()"` to a method of the same name
on its host element if it doesn't exist.

See also: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes#event_handler_attributes

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code style="color: white; background: darkgrey; padding: 0.25em 0.4em; border: 0.1em solid grey; margin-right: 0.25em; font-size: 70%; border-radius: 0.8em">static</code><code>mapAttribute</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;">(attr: <code>AttrLike</code>) =&gt; <code>{ [key: string]: any }</code></td>
      <td style="vertical-align: top;">

Maps an HTML attribute to a React prop by doing (in order) :
- looking for a specific mapper of that name
- or trying to parse as JSON the value
- or returning the value as-is

If no specific mapper is found and JSON parsing
fails, then a string mapper is automatically
bound to this attribute in this element for the
next invokations.

Other invalid values are set to null.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code style="color: white; background: darkgrey; padding: 0.25em 0.4em; border: 0.1em solid grey; margin-right: 0.25em; font-size: 70%; border-radius: 0.8em">static</code><code>mapEvent</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;">(attr: <code>AttrLike</code>) =&gt; <code>{ [key: string]: EventHandler&lt;any&gt; }</code></td>
      <td style="vertical-align: top;">

Maps an HTML attribute event, e.g. `onpress` to a React event
prop, e.g. `onPress: function onPress(e) {}`.

When the React component triggers the event, the counterpart function
set in the HTML attribute is invoked.

If this element has an event mapper for this attribute, its function
name will be used as the prop name, otherwise a default prop name is
derived from the attribute name (the third character being uppercased).
This implies that custom React events that doesn't follow this convention,
e.g. `onSelectionChange`, have to be properly mapped.

</td>
    </tr>
  </tbody>
</table>
<table>
  <thead>
    <tr>
      <th>Function</th>
      <th>Signature</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="vertical-align: top;"><code>Slot</code></td>
      <td style="vertical-align: top;">(···settings···: <code>Slot</code>) =&gt; <code>Element</code></td>
      <td style="vertical-align: top;">

Allow a React component to render child nodes.
Internally, a `<slot>` element is rendered and
the given child nodes are moved within. If the
host component has subordinate React components,
the host must pass its `reactPortals` property
to this slot.

</td>
    </tr>
  </tbody>
</table>
<table>
  <thead>
    <tr>
      <th>Member</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background-color: #F6F6FF">
      <th style="vertical-align: top;"><code>Slot</code></th>
      <th style="vertical-align: top;">interface</th>
      <th style="vertical-align: top; font-weight: normal"></th>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>children</code><sup style="color:red" title="required">&#x2605;</sup></td>
      <td style="vertical-align: top;"><code>ChildNode[]</code></td>
      <td style="vertical-align: top;">

The child nodes to render will be moved inside
this slot after it has been mounted.

</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><code>portals</code></td>
      <td style="vertical-align: top;"><code>Set&lt;ReactPortal&gt;</code></td>
      <td style="vertical-align: top;">

If the component that renders this slot has subordinate React
components, it must pass its `reactPortals` property here.

</td>
    </tr>
  </tbody>
</table>
