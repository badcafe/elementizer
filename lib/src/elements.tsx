import { type BaseSyntheticEvent, type EventHandler, type FC, type ReactNode, type ReactPortal,
    useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { autorun, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';

// portal count
let n = 0;

/**
 * Allow to unmount a React component.
 */
export type Dispose = () => void;

/**
 * Allow to map an HTML attribute to a React prop value. Can be :
 * * a custom function that maps an attribute to a value
 * * an enumeration of the valid strings
 * * a regular expression
 * * one of the constructors `Boolean`, `String`, `Number`, `BigInt`, `Date`, `Object` or `Array`
 */
export type AttrMapper = ((attr: AttrLike) => any)
    | BooleanConstructor | StringConstructor | NumberConstructor 
    | BigIntConstructor | DateConstructor | ObjectConstructor | ArrayConstructor
    | readonly string[] | RegExp ;

/**
 * Allow to map an HTML event to a React event handler builder.
 */
export type EventMapper = (event: AttrLike) => EventHandler<any>;

/**
 * By default, the `<body>` will host the react tree.
 */
export interface HostElement extends HTMLElement {

    /**
     * `<slot>` element that holds the React root tree
     */
    reactSlot?: HTMLSlotElement;

    /**
     * React root tree
     */
    reactRoot?: Root;

    /**
     * The set of React portals to render in the root.
     */
    reactPortals?: Set<ReactPortal>;

}

// web component count
let count = 0;

// for testing readonly arrays
const isArray = Array.isArray as <T>(value: T) => value is Extract<T, readonly unknown[]>;

/**
 * A Web component wrapper for React.
 * 
 * @see {@link createElement}
 */
export abstract class HTMLReactElement extends HTMLElement {

    static namespace = 'elementizer';

    static debug = false;

    /**
     * Attach a portal to the React tree.
     * 
     * @param react The React node to render.
     * @param html Where to render the React node.
     * @returns The dispose function that will detach the portal.
     */
    static createPortal(react: ReactNode, html: HTMLElement): Dispose {
        const rootElem = document.body as HostElement;
        this.#init(rootElem);
        const portal = createPortal(react, html, `${HTMLReactElement.namespace}-portal-${n++}`);
        runInAction(() => {
            rootElem.reactPortals!.add(portal);
        });
        return () => {
            runInAction(() => {
                rootElem.reactPortals!.delete(portal);
            });
        };
    }

    /**
     * Initialize the React tree on the top-level HTML element.
     */
    static #init(rootElem: HostElement) {
        if (! rootElem.reactRoot) {
            // create or reuse <slot id="elementizer-slot-NNN">
            if (! rootElem.reactSlot) {
                const slot = document.createElement('slot');
                rootElem.reactSlot = slot;
                slot.setAttribute('id', `${HTMLReactElement.namespace}-slot-${n++}`);
                rootElem.appendChild(slot);                
            }
            rootElem.reactRoot = createRoot(rootElem.reactSlot);
            rootElem.reactPortals = observable.set(new Set(), { deep: false });
            autorun(() => {
                queueMicrotask(() => rootElem.reactRoot!.render([...rootElem.reactPortals!]));
            });
        }
    }

    constructor() {
        super();
        this.initialize?.();
        if (HTMLReactElement.debug) {
            console.log(this.constructor.name, 'new', '<' + this.localName + '> @id=', this.id, `#${++count}`);
        }
    }

    /**
     * When present, this method is executed after the constructor.
     */
    initialize?(): void;

    /**
     * The original child nodes when the element's constructor was
     * called ; child nodes will eventually be altered when mounting,
     * whereas original child nodes won't.
     */
    original = [...this.childNodes];

    /**
     * Subordinate React components will be rendered in their own
     * portal.
     */
    reactPortals?: Set<ReactPortal> = observable.set(new Set(), { deep: false });

    /**
     * Dispose the underlying React component.
     */
    dispose?: Dispose

    /**
     * Render this Web component as a React node. This method is invoked
     * once. By default, it renders the React component given if any with
     * a child `<slot>` where are moved the original children, or directly
     * an HTML `<slot>`. In both cases, the React portals are also rendered.
     * 
     * @see {@link createElement}
     * @see {@link CreateElement.render}
     * @see {@link CreateElement.reactComponent}
     */
    abstract render(): ReactNode

    /**
     * This method creates the React props to inject in the underlying
     * React component.
     * 
     * @see {@link CreateElement.attributes}
     */
    abstract reactProps(): object

    /**
     * When the underlying React component use props, those
     * are initialized in this observable object with the
     * attributes of the Web component wrapper.
     * 
     * Subsequent updates of the Web component attributes are
     * propagated here, causing the React component refresh.
     * 
     * @see {@link reactProps}
     */
    observablesProps: any = observable.object(this.reactProps());

    /**
     * Call this method to register this element, provided that this
     * method exist, otherwise this element is already registered.
     * 
     * @param registry By default, the default custom element registry.
     * 
     * @see {@link CreateElement.defineCustomElement}
     * @see [Registering a custom element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#registering_a_custom_element)
     */
    register?(registry?: CustomElementRegistry): void

    /**
     * This method creates the React events to inject in the underlying
     * React component.
     * 
     * Called by the default `render()` method.
     * 
     * @see {@link render}
     */
    reactEvents(): object {
        return [...this.attributes]
            .filter(att => att.name.startsWith('on')) // e.g. onclick
            .map(HTMLReactElement.deriveAttrToMethod('event'))
            .map((this.constructor as typeof HTMLReactElement).mapEvent.bind(this.constructor))
            .reduce((atts, att) => Object.assign(atts, att), {});
    }

    /**
     * Maps an HTML attribute event, e.g. `onpress` to a React event
     * prop, e.g. `onPress: function onPress(e) {}`.
     * 
     * When the React component triggers the event, the counterpart function
     * set in the HTML attribute is invoked.
     * 
     * If this element has an event mapper for this attribute, its function
     * name will be used as the prop name, otherwise a default prop name is
     * derived from the attribute name (the third character being uppercased).
     * This implies that custom React events that doesn't follow this convention,
     * e.g. `onSelectionChange`, have to be properly mapped.
     * 
     * @see {@link eventMappers}
     */
    static mapEvent(attr: AttrLike) {
        const { name, ownerElement } = attr;
        const mapper = this.eventMappers.get(name!);
        const fun = mapper?.(attr)
            ?? function (event: Partial<BaseSyntheticEvent>) {
                ownerElement![name!]?.call(ownerElement, {
                    currentTarget: ownerElement,
                    ...event
                });
            }
        const propName = fun?.name !== ''
            ? fun.name
            : `on${ name!.charAt(2).toUpperCase() }${ name!.substring(3) }`;
        return ({
            [propName]: fun
        })
        // e.g. { onClick: function onClick(e) { elem.onclick?.(e as any);} }
    }

    /**
     * Per-event mappers, that map HTML events, e.g. `onclick`
     * to a builder function that returns a React function handler.
     * 
     * The React function handler is supposed someway to invoke
     * the function bound to the HTML attribute, e.g. :
     * 
     * ```js
     * attr => function (...args) {
     *     attr.ownerElement[attr.name]?.call(attr.ownerElement, ...args);
     * }
     * ```
     * 
     * @see {@link mapEvent}
     */
    static eventMappers: Map<string, EventMapper>

    /**
     * Maps an HTML attribute to a React prop by doing (in order) :
     * - looking for a specific mapper of that name
     * - or trying to parse as JSON the value
     * - or returning the value as-is
     * 
     * If no specific mapper is found and JSON parsing
     * fails, then a string mapper is automatically
     * bound to this attribute in this element for the
     * next invokations.
     * 
     * Other invalid values are set to null.
     * 
     * @returns An object with the name and value mapped.
     * 
     * @see {@link attrMappers}
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes#boolean_attributes
     */
    static mapAttribute(attr: AttrLike) {
        let { localName: name, value } = attr;
        const [mapper, reactPropName = name] = this.attrMappers.get(name) ?? [];
        if (mapper instanceof RegExp) {
            if (! mapper.test(value)) {
                value = null;
            }
        } else if (isArray(mapper)) {
            if (! mapper.includes(value)) {
                value = null;
            }
        } else {
            switch (mapper) {
            case Boolean:
                value = value === '' || String(value).toLowerCase() === name.toLowerCase()
                    || null;
                break;
            case String:
                break;
            case Number:
                value = Number(value);
                if (Number.isNaN(value)) {
                    value = null;
                }
                break;
            case BigInt:
                try {
                    value = BigInt(value);
                } catch (e) {
                    value = null;
                }
                break;
            case Date:
                value = new Date(value);
                if (Number.isNaN(value.valueOf())) {
                    value = null;
                }
                break;
            case Object:
                try {
                    value = JSON.parse(value);
                } catch (e) {}
                if (typeof value !== 'object' || Array.isArray(value)) {
                    value = null;
                }
                break;
            case Array:
                try {
                    value = JSON.parse(value);
                } catch (e) {}
                if (! Array.isArray(value)) {
                    value = null;
                }
                break;
            default:
                try {
                    value = (mapper as (attr: AttrLike) => any)?.(attr)
                        ?? JSON.parse(value);
                } catch (e) {
                    this.attrMappers.set(name, [String]);
                    if (HTMLReactElement.debug) {
                        console.debug(e, name, value);
                    }
                }
            }
        }
        return {
            [reactPropName]: value
        }
    }

    /**
     * Per-attribute mappers.
     * 
     * @see {@link mapAttribute}
     */
    static attrMappers: Map<string, [mapper: AttrMapper, reactPropName?: string]>

    /**
     * One-shot per-attribute mappers.
     */
    #selfAttrMappers?: Map<string, () => Record<string, any>>

    /**
     * This method may be invoked with a third parameter, that will
     * be set directly to this `observablesProps` without using the
     * class attribute mappers.
     * 
     * @param name The name of the attribute.
     * @param value The string value of the attribute.
     * @param propValue The React value as it is expected.
     */
    setAttribute(name: string, value: string, propValue?: any): void {
        if (propValue !== undefined) {
            if (! this.#selfAttrMappers) {
                this.#selfAttrMappers = new Map();
            }
            const propName = (this.constructor as typeof HTMLReactElement).attrMappers.get(name)?.[1]
                ?? name;
            this.#selfAttrMappers.set(name, () => {
                this.#selfAttrMappers?.delete(name);
                return {
                    [propName] : propValue
                }
            });
        }
        super.setAttribute(name, value);
    }

    /**
     * Propagate an attribute change in the Web component to the
     * underlying React component.
     * 
     * @see [Responding to attribute changes](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#responding_to_attribute_changes)
     */
    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue) {
            runInAction(() => {
                const [[propName, propValue]] = Object.entries(
                    this.#selfAttrMappers?.get(name)?.()
                    ?? (this.constructor as typeof HTMLReactElement).mapAttribute({ localName: name, value: newValue })
                ) as [[string, any]];
                if (propValue === null) {
                    delete this.observablesProps[propName];
                } else {
                    this.observablesProps[propName] = propValue;
                }
            })
        }
    }

    /**
     * Mount the Web component
     * 
     * @see [Custom element lifecycle callbacks](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#custom_element_lifecycle_callbacks)
     */
    connectedCallback() {
        // portal element ?
        for (let parent = this.parentElement ; parent !== null ; parent = parent?.parentElement) {
            if (parent instanceof HTMLReactElement && parent.reactPortals) {
                const nodes = this.render();
                const portal = createPortal(nodes, this);
                runInAction(() => {
                    parent.reactPortals!.add(portal);
                });
                this.dispose = () => {
                    runInAction(() => {
                        parent.reactPortals!.delete(portal);
                    });
                }
                if (HTMLReactElement.debug) {
                    console.log(this.constructor.name, `connected (portal ${parent.getAttribute('id')} #${parent.reactPortals.size})`, '<' + this.localName + '> @id=', this.id);
                }
                return;
            }
        }

        // standalone element
        this.dispose = HTMLReactElement.createPortal(this.render(), this);
        if (HTMLReactElement.debug) {
            console.log(this.constructor.name, 'connected (standalone)', '<' + this.localName + '> @id=', this.id);
        }
    }

    /**
     * Unmount the Web component
     */
    disconnectedCallback() {
        this.dispose?.()
        this.reactPortals?.clear();
        if (HTMLReactElement.debug) {
            console.log(this.constructor.name, 'disconnected', '<' + this.localName + '> @id=', this.id);
        }
    }

    /**
     * The Web component and the underlying React component can't
     * have the same identifier ; this method allow to derive the
     * attribute found in the Web component to a specific one to
     * set on the React component, by default : `myId` ⮕ `myId-elementizer`.
     * 
     * @see {@link namespace}
     */
    static defaultDeriveIdentifierAttribute({ value: id }: AttrLike) {
        return `${id}-${HTMLReactElement.namespace}`;
    }

    /**
     * Maps the HTML attribute event `onclick` to the React event
     * prop `onClick: function(e) {}`. This default mapper ignores the
     * [Bubbling Phase](https://developer.mozilla.org/fr/docs/Web/API/Event/eventPhase#valeur).
     * 
     * @see {@link eventMappers}
     * @see {@link mapEvent}
     */
    static defaultClickEventMapper({ ownerElement, name }: AttrLike) {
        return function onClick(event: Partial<BaseSyntheticEvent>) {
            if (event?.eventPhase !== Event.BUBBLING_PHASE) {
                (ownerElement as any)[name!]?.call(ownerElement, {
                    currentTarget: ownerElement,
                    ...event
                });
            }
        }
    }

    /**
     * The default implementation that computes the
     * class name of web components :
     * `my-great-component` ⮕ `HTMLGreatComponentElement`
     * 
     * @see {@link CreateElement.className}
     */
    static defaultClassName(name: string) {
        return ['HTML', ...name.split('-').slice(1), 'Element']
            .map(string => string.charAt(0).toUpperCase() + string.slice(1))
            .join('')
    }

    /**
     * Derive an attribute, e.g. `onpress="doSomething()"` to a method of the same name
     * on its host element if it doesn't exist.
     * 
     * @param argNames Argument names to pass to the function, e.g. `event`.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes#event_handler_attributes
     */
    static deriveAttrToMethod(...argNames: string[]) {
        return (attr: AttrLike) => {
            const el = attr.ownerElement! as HTMLElement & Record<string, Function>;
            // not a native event
            if (! (attr.name! in el)) {
                const code = `    with (this.ownerDocument) {
        with (this) {
            ${attr.value}
        }
    }`;
                if (HTMLReactElement.debug) {
                    console.log(`${el.localName}${el.id ?? `#${el.id}`}.${attr.name}: ${attr.name}(event) {
${code}
}`);
                }
                el[attr.name!] = ({
                    [attr.name!]: new Function(...argNames, code)
                })[attr.name!]!;
            };
            return attr;
        }
    }

}

/**
 * Just an attribute name, or a tuple of :
 * * an attribute name
 * * a mapper for this attribute
 * * an optional React property name, if it is different of the attribute name
 */
export type AttributeOrMapper = string | [attrName: string, mapper: AttrMapper, reactPropName?: string]

/**
 * Allow to customize the creation of a Web component.
 */
export interface CreateElement {

    /**
     * The [name](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#name)
     * of the web component to create.
     */
    name: string,

    /**
     * The class name that holds the web components ;
     * a concrete [class](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#constructor)
     * with that name will be created.
     * 
     * By default, it is derived from the name like this :
     * `my-great-component` ⮕ `HTMLGreatComponentElement`
     * 
     * @see {@link HTMLReactElement.defaultClassName}
     */
    className?: string,

    /**
     * When present, this method is executed after the constructor.
     */
    initialize?(this: HTMLReactElement): void;

    /**
     * Allow to override the default rendering strategy.
     * 
     * @see {@link reactComponent}
     */
    render?(this: HTMLReactElement): ReactNode,

    /**
     * The HTML attributes to pass to the underlying React component.
     * 
     * All those attributes will be also set as the static `observedAttributes`
     * property of the created class.
     * 
     * Events attributes MUST NOT be listed here.
     * 
     * HTML attributes that have to be mapped to a specific React prop
     * may require a specific mapping function to produce a React value,
     * and optionally a different React prop name. A mapper can also be
     * a RegExp or a tuple of allowed values.
     * 
     * ### Exemples :
     * ```js
     * {
     *     attributes: [
     *        // default mapper
     *        'foo',
     *        // built-in mappers
     *        ['big', BigInt],
     *        ['disabled', Boolean, 'isDisabled'],
     *        // user-defined mapper
     *        ['foo', ({value}) => value ? new Foo(value) : null],
     *        // allowed values
     *        ['size': ['small', 'medium', 'large']],
     *        // RegExp
     *        ['isbn', /^(?=(?:[^0-9]*[0-9]){10}(?:(?:[^0-9]*[0-9]){3})?$)[\\d-]+$/]
     *     ]
     * }
     * ```
     * 
     * Built-in mappers are `Boolean`, `String`, `Number`,
     * `BigInt`, `Date`, `Array`, `Object`.
     * 
     * The default mapper will parse the attribute value as JSON,
     * and in case of failure, will register a `String` mapper.
     * 
     * @see {@link eventMappers}
     * @see {@link HTMLReactElement.mapAttribute}
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes#boolean_attributes
     */
    attributes?: AttributeOrMapper[],

    /**
     * The given React component will be wrapped within
     * the Web component created, except if the `render()`
     * method is supplied.
     * 
     * @see {@link render}
     */
    reactComponent?: FC<any>

    /**
     * By default, the custom element created is defined
     * in the custom element registry ; set `false` to
     * define it yourself.
     * 
     * @see {@link HTMLReactElement.register}
     */
    defineCustomElement?: boolean

    /**
     * Each event that requires a specific mapping
     * function must be set here.
     * 
     * ### Exemple :
     * ```js
     * {
     *     onselectionchange: (attr) => function onSelectionChange(event) {
     *         attr.ownerElement[attr.name]?.call(attr.ownerElement, event);
     *     }
     * }
     * ```
     * 
     * @see {@link attributes}
     * @see {@link HTMLReactElement.mapAttribute}
     */
    eventMappers?: Record<string, EventMapper>

}

/**
 * Looks like an attribute. Note that a mapper that do require
 * a real attribute may not be part of `observedAttributes` ;
 * such mapper works only on initialization.
 */
export type AttrLike = Partial<Attr> & Pick<Attr, 'localName'> & {
    ownerElement?: null | Element & Record<string, any>
    value: any
}

/**
 * Create a Web component based on React.
 * 
 * @returns The constructor of the Web Component.
 * 
 * @see {@link CreateElement}
 */
export function createElement({
    name,
    className = HTMLReactElement.defaultClassName(name),
    render,
    initialize,
    reactComponent: Elem,
    attributes = [],
    defineCustomElement = true,
    eventMappers
}: CreateElement): typeof HTMLReactElement {

    const attrMap = new Map<string, [mapper: AttrMapper, reactPropName?: string]>([
        ['id', [HTMLReactElement.defaultDeriveIdentifierAttribute]],
        ...attributes.filter(a => Array.isArray(a))
                     .map(([name, ...a]) => [name, a] as const)
    ]);
    const eventMap = new Map<string, EventMapper>([
        ['onclick', HTMLReactElement.defaultClickEventMapper],
        ...eventMappers
            ? Object.entries(eventMappers)
            : []
    ]);
    const observedAttributes = [...new Set<string>([...attributes.map(a => typeof a === 'string' ? a : a[0]), ...attrMap.keys()])];

    const Class: typeof HTMLReactElement & { new(): HTMLReactElement }= ({
        [className]: class extends HTMLReactElement {

            static observedAttributes = observedAttributes;
            static attrMappers = attrMap;
            static eventMappers = eventMap;

            render() {
                const Observer: FC = observer(() => Elem
                    ? <Elem
                        { ...this.observablesProps }
                        { ...this.reactEvents() }
                    >
                        <Slot children={ this.original } portals={ this.reactPortals }/>
                    </Elem>
                    : <Slot children={ this.original } portals={ this.reactPortals }/>
                )
                return <Observer />;
            }

            reactProps() {
                return observedAttributes.map(attrName => this.getAttributeNode(attrName) as AttrLike ?? { localName: attrName, value: null })
                    .filter(({ localName, value }) => value !== null && ! localName.startsWith('on')) // e.g. onclick
                    .map(attr => Class.mapAttribute(attr))
                    .reduce((atts, att) => Object.assign(atts, att), {});
            }
        }
    })[className]!;

    if (render) {
        Object.assign(Class.prototype, { render });
    }
    if (initialize) {
        Object.assign(Class.prototype, { initialize });
    }
    if (defineCustomElement) {
        customElements.define(name, Class);
    } else {
        Object.assign(Class.prototype, {
            register(registry: CustomElementRegistry = customElements) {
                registry.define(name, Class);
            }
        });
    }
    return Class;
}

export interface Slot {

    /**
     * The child nodes to render will be moved inside
     * this slot after it has been mounted.
     */
    children: ChildNode[]

    /**
     * If the component that renders this slot has subordinate React
     * components, it must pass its `reactPortals` property here.
     */
    portals?: Set<ReactPortal> | undefined

}

/**
 * Allow a React component to render child nodes.
 * Internally, a `<slot>` element is rendered and
 * the given child nodes are moved within. If the
 * host component has subordinate React components,
 * the host must pass its `reactPortals` property
 * to this slot.
 */
export function Slot({ children, portals }: Slot) {
    const ref = useRef<HTMLSlotElement>(null);
    const [done, setDone] = useState(false);
    useEffect(() => {
        ref.current?.append(...children);
        setDone(true);
    }, []);
    return <>
        { done && portals && [...portals] }
        <slot ref={ ref }/>
    </>
}
