# Elementizer (Demo)

> **React to Web Components**

`@badcafe/elementizer` is a Javascript library that expose any [React](https://react.dev/) component as a [Web component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components).

<p style='align: center'>
    <img src="logo.svg"/>
</p>

> ### Read this first
> [Library and documentation](https://badcafe.github.io/elementizer): explain how to use `@badcafe/elementizer`

This present demo aims to show with real exemples the simplest usage to the more complex ones of Elementizer ; it is made of :

   * A small React library: `elementizer-demo-react`
   * The counterpart Web components library: `elementizer-demo-elements`, which is build with Elementizer from the React elements
   * A small demo web app (this)

## The demo

We are starting with few React components, based on the [`react-aria`](https://www.npmjs.com/package/react-aria) library :

### Buttons

#### React

* `Button`: just a button
* `Button.Toggle`: also a button, but that toggles
    * can be standalone or part of a group of toggle buttons
* `Button.Group.Toggle`: used to group several toggle buttons
    * only one toggle button can be selected at a time
    * the communication between the group and its toggle buttons occurs thanks to a React context

> See [Typescript source](https://github.com/badcafe/elementizer/blob/main/demo-react/src/Button.tsx) in `elementizer-demo-react`

#### Web components

There is a very simple one to one correspondance with the React buttons :

* `<demo-button>`
* `<demo-toggle-button>`
* `<demo-toggle-button-group>`

They are all calling `createElement()` with 
* the tag name, 
* the React component, 
* and the list of attributes mappers:
    * most of attribute mappers are just primitive conversions, e.g. `['hidden', Boolean]`,
    * some of them are renaming the React prop, e.g. `['disabled', Boolean, 'isDisabled']`,
    * few are made of a list of legal values, e.g. `['type', ['button', 'submit', 'reset']]`,
    * one injects a Javascript function with the attribute value : `['formaction', HTMLReactElement.deriveAttrToMethod('formData'), 'formAction']`
    * the `style` attribute is exposed as an object : `['style', Object]`, the object being [properties of the CSSOM](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleProperties)

As explained in the library documentation, additional structural elements are required to wrap React components into Web components. Consequently, React nested components that are styled as direct children of their parent may require some CSS fixup.
This is the case for our toggle buttons.

> See them in `elementizer-demo-elements`:
> * [Typescript source](https://github.com/badcafe/elementizer/blob/main/demo-elements/src/button.tsx)
> * [CSS fixup source](https://github.com/badcafe/elementizer/blob/main/demo-elements/src/button.css)

### Tabs

#### React

* `Tab.Group`: used to group a set of tabs
    * in `react-aria` the tab panels are **not children** components
* `Tab`: a tab item is made of a label (as a prop) and a panel (children)

> See [Typescript source](https://github.com/badcafe/elementizer/blob/main/demo-react/src/Tab.tsx) in `elementizer-demo-react`

#### Web components

Like the above buttons, the counterpart Web components are also declaring similar attribute mappers.

Unlike the above buttons, all Web components are calling `createElement()` with a specific `render()` method :

* `<aerial-tab-group>`: since the counterpart React component doesn't deal directly with child nodes, the tab items and tab panels have to be pulled to the group
* `<aerial-tab>`: we are passing empty children
    * the original will be moved WHEN mounted by React, when the `<Tab>` will be eventually selected
    * meanwhile, the panel is not displayed by the CSS
    * NOTE: the `label` prop of the React component can be a `string` or a React node ; the latter form implies having a dedicated Web component :
* `<aerial-tab-label>`: used to host the tab label when made of elements. This component is not rendered by itself, but pulled by its parent `<aerial-tab>`

Since the React structure is pulled of the Web components, the React hierarchy is preserved and no CSS fixup are required. However, the `<aerial-tab>` original content (HTML) must not be displayed (since pulled in the React tree).

> See them in `elementizer-demo-elements`:
> * [Typescript source](https://github.com/badcafe/elementizer/blob/main/demo-elements/src/tab.tsx)
> * [CSS addon source](https://github.com/badcafe/elementizer/blob/main/demo-elements/src/tab.css)

### Putting them all together

Now, you can examine the [HTML source](https://github.com/badcafe/elementizer/blob/main/demo-app/index.html) and run the demo :

```bash
npm install elementizer
npm run dev
```

Open http://localhost:8080 you will see buttons and tabs, implemented in React, but used as Web components.
