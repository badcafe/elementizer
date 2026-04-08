import { Tabs as AriaTabs, TabList, TabsProps, Tab as AriaTab, TabPanel, TabPanels, TabProps,
    TabPanelProps, TabsContext, TabListStateContext, SelectionIndicator } from 'react-aria-components';
import { createContext, FC, ReactNode, RefAttributes, useContext, useEffect, useMemo } from 'react';
import { useId } from '@react-aria/utils';

import { HasVariant } from './options';
import './Tab.css';

export interface Tab extends
    Omit<TabProps, 'children'>,
    HasVariant,
    Pick<TabPanelProps, 'shouldForceMount'>,
    RefAttributes<HTMLDivElement>
{
    /** The Tab label */
    label: ReactNode,
    id?: string
    /** The panels of the Tab */
    children?: ReactNode
}

export namespace Tab {

    export type $ = FC<Tab> & {
        Context: typeof TabsContext;
        State: typeof TabListStateContext;
        Group: Tab.Group.$;
        HasVariant: typeof HasVariant;

    }

    export interface Group extends
        Omit<TabsProps, 'children'>,
        HasVariant,
        RefAttributes<HTMLDivElement>
    {
        children?: ReactNode
    }

    export namespace Group {

        export type $ = FC<Tab.Group>;

    }

}

/**
 * ### Usage :
 * ```tsx
 * <Tab.Group>
 *     <Tab label='Foo' id='Foo'>
 *         FOO
 *     </Tab>
 * </Tab.Group>
 * ```
 */
export const Tab: Tab.$ = (tab: Tab) => {
    const {
        id,
        label,
        shouldForceMount,
        variant,
        className,
        children,
        ref,
        ...props
    } = tab;
    // copy + default values
    tab = { ...tab };
    // do not feed this registry inside an effect to have it always up to date...
    const registry = useContext(TabPanelRegistry);
    const identifier = useId(id);
    registry.set(identifier, tab);
    useEffect(() => {
        // ...but cleanup is expected on unmount
        return () => { registry.delete(identifier); };
    }, []);
    return (
        <AriaTab
            { ...props }
            id={ identifier }
            ref={ ref }
            { ...variant && { 'data-variant': variant }}
            >
            { label }
            <SelectionIndicator/>
        </AriaTab>
    );
};

Tab.Context = TabsContext;
Tab.HasVariant = HasVariant;
Tab.State = TabListStateContext;

// should we expose this ?
const TabPanelRegistry = createContext<Map<string, Tab>>(new Map());
const ContextualTabPanels: FC = () => {
    // let have panels in the right order
    const state = useContext(TabListStateContext);
    // all tabs collected
    const registry = useContext(TabPanelRegistry);
    return (
        <TabPanels>
            {[...state?.collection ?? []].map(item => {
                const id = String(item.key);
                const panel = registry.get(id);
                return panel && (
                    <TabPanel
                        key={id}
                        id={id}
                        {...panel.variant && { 'data-variant': panel.variant }}
                        shouldForceMount={panel.shouldForceMount}
                    >
                        {panel.children}
                    </TabPanel>
                );
            })}
        </TabPanels>
    );
};
const Group: Tab.Group.$ = (
    {   className,
        children,
        variant,
        ref,
        'aria-label': aLabel,
        'aria-labelledby' : aLabelledBy,
        'aria-describedby': aDescribedBy,
        'aria-details': aDetails,
        ...props
    }: Tab.Group
) => {
    const registry = useMemo(() => new Map<string, Tab>(), []);
    return (
        <TabPanelRegistry.Provider value={registry}>
            <AriaTabs
                { ...props }
                ref={ ref }
                { ...variant && { 'data-variant': variant }}
            >
                <TabList
                    {...aLabel && { 'aria-label': aLabel }}
                    {...aLabelledBy && { 'aria-labelledby': aLabelledBy }}
                    {...aDescribedBy && { 'aria-describedby': aDescribedBy }}
                    {...aDetails && { 'aria-details': aDetails }}
                >
                    { children }
                </TabList>
                <ContextualTabPanels/>
            </AriaTabs>
        </TabPanelRegistry.Provider>
    );
};
Group.displayName = 'Tab.Group';
Tab.Group = Group;
