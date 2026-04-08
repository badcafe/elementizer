import { Button } from 'elementizer-demo-react/Button';
import { type CreateElement, createElement, HTMLReactElement } from '@badcafe/elementizer';

// patch CSS for <slot> rendering
import './button.css';

const common: CreateElement['attributes'] = [
    ['variant', Button.HasVariant],
    ['size', Button.HasSize],
    ['disabled', Boolean, 'isDisabled'],
    ['hidden', Boolean],
    ['inert', Boolean],
    ['dir', String],
    ['lang', String],
    ['translate',['yes', 'no']],
    ['class', String, 'className'],
    ['style', Object]
]

// order matters: instances will be created in this order, not in the document order

export const ButtonToggleGroupElement = createElement({
    name: 'demo-toggle-button-group',
    attributes: [
        ...common,
        ['selectionmode', ['single', 'multiple'], 'selectionMode'],
        ['orientation', ['horizontal', 'vertical']],
    ],
    reactComponent: Button.Toggle.Group
})

const commonButtons: CreateElement['attributes'] = [
    ['label', String],
    ['type', ['button', 'submit', 'reset']],
    ['name', String],
    ['value', String],
    ['autofocus', Boolean, 'autoFocus'],
    ['preventfocusonpress', Boolean, 'preventFocusOnPress'],
    ['excludefromtaborder', Boolean, 'excludeFromTabOrder'],
    ['form', String],
    ['formaction', HTMLReactElement.deriveAttrToMethod('formData'), 'formAction'],
    ['formenctype', String, 'formEncType'],
    ['formmethod', String, 'formMethod'],
    ['formtarget', String, 'formTarget']
] as const;

export const ButtonElement = createElement({
    name: 'demo-button',
    attributes: [
        ...common,
        ...commonButtons
    ],
    reactComponent: Button
})

export const ButtonToggleElement = createElement({
    name: 'demo-toggle-button',
    attributes: [
        ...common,
        ...commonButtons,
        ['selected', Boolean, 'isSelected'],
    ],
    reactComponent: Button.Toggle,
})
