import { observer } from 'mobx-react-lite';
import { BaseSyntheticEvent, FC, ReactNode } from 'react';

import { Tab } from 'elementizer-demo-react/Tab';
import { CreateElement, createElement, Slot } from '@badcafe/elementizer';

// we have specific rendering methods because tabs are not rendered as children
// in the React tree, rather, they are pulled from a context as a react-aria collection

// DO NOT display <demo-tab>
import './tab.css';

const common: CreateElement['attributes'] = [
    ['variant', Tab.HasVariant],
    ['disabled', Boolean, 'isDisabled'],
    ['hidden', Boolean],
    ['inert', Boolean],
    ['dir', String],
    ['lang', String],
    ['translate',['yes', 'no']],
    ['class', String, 'className'],
    ['style', Object]
]

export const TabGroupElement = createElement({
    name: 'demo-tab-group',
    attributes: [
        ...common,
        ['orientation', ['vertical', 'horizontal']],
        ['selectedkey', String, 'selectedKey'],
        ['keyboardActivation', ['automatic', 'manual']]
    ],
    eventMappers: {
        onselectionchange: ({ name, ownerElement }) =>
            function onSelectionChange(event: Partial<BaseSyntheticEvent>) {
                ownerElement![name!]?.call(ownerElement, {
                    currentTarget: ownerElement,
                    event
                });
            }
    },
    render() {
        const Observer: FC = observer(() => <>
            <Slot children={ [] } portals={ this.reactPortals }/>
            <Tab.Group
                { ...this.observablesProps }
                { ...this.reactEvents() }
            >
                {
                    this.original.filter(node => node instanceof TabElement)
                        .map(tab => {
                            let label: string | null | ReactNode = tab.getAttribute('label');
                            const id = tab.getAttribute('id')!;
                            const children = [...tab.original].filter(node => {
                                if (node instanceof TabLabelElement) {
                                    // /* [...node.childNodes] would discard <demo-tab-label> */
                                    label = <Slot children={ [node] } portals={ node.reactPortals }/>
                                    return false;
                                } else {
                                    return true;
                                }
                            });
                            // DO NOT remove here, due to the weird life-cycle
                            // tab.parentNode?.removeChild(tab);
                            const Observer: FC = observer(() =>
                                <Tab key={ id }
                                    id={ id }
                                    label={ label }
                                    { ...tab.observablesProps }
                                    { ...tab.reactEvents() }
                                >
                                    <Slot children={ children } portals={ tab.reactPortals }/>
                                </Tab>
                            );
                            return <Observer key={ id }/>;
                        })
                }
            </Tab.Group>
        </>)
        return <Observer />;
    }
});

export const TabLabelElement = createElement({
    name: 'demo-tab-label',
    // left this element as-is, without React rendering and React tree
    render() {
        return null
    },
    initialize() {
        delete this.reactPortals
    }
});

export const TabElement = createElement({
    name: 'demo-tab',
    attributes: [
        ...common,
        ['label', String],
        ['shouldforcemount', Boolean, 'shouldForceMount'],
        ['href', String],
        ['target', String],
        ['rel', String],
        ['hrefLang', String],
        ['download', String],
        ['ping', String]
    ],
    render() {
        // we are passing empty children, the original will be
        // moved WHEN mounted by React, when the <Tab> will be
        // eventually selected ; meanwhile, the panel is not
        // displayed by the CSS
        return <Slot children={[]} portals={ this.reactPortals }/>;
    },
    initialize() {
        this.setAttribute('aria-hidden', 'true');
    }
});
