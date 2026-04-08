import { type FC, type ReactNode, type RefAttributes, useContext, useState } from 'react';
import { Button as AriaButton, type ButtonProps, ButtonContext,
    ToggleButton, type ToggleButtonProps, ToggleButtonContext,
    ToggleButtonGroup, type ToggleButtonGroupProps, ToggleButtonGroupContext } from 'react-aria-components';
import { useId } from '@react-aria/utils';

import { HasSize, HasVariant } from './options';

import './Button.css';

export interface Button extends ButtonProps, HasVariant, HasSize, RefAttributes<HTMLButtonElement> {
    children?: ReactNode;
    label: string | ReactNode;
}

export const Button: Button.$ = (
    ({ children, label, variant, size, ref, ...props }
) => {
    return (
        <AriaButton
            { ...props }
            ref={ ref }
            { ...variant && { 'data-variant': variant }}
            { ...size && { 'data-size': size }}
            data-appearance='fill'
        >
            { label ?? children }
        </AriaButton>
    );
}) as Button.$;

const Toggle: Button.Toggle.$ = ((
    { ref, id, isSelected, onChange, ...allProps }
) => {
    const group = useContext(ToggleButtonGroupContext) as ToggleButtonGroupProps;
    const { children, className, label,
        variant = group?.variant,
        size = group?.size,
        ...props
    } = allProps;
    const [selected, setSelected] = useState(isSelected
        ?? false
    );
    id = useId(id as any);
    return (
        <ToggleButton
            { ...props }
            ref={ ref }
            id={ id }
            className='react-aria-Button react-aria-ToggleButton'
            { ...variant && { 'data-variant': variant }}
            { ...size && { 'data-size': size }}
            { ...{ 'data-appearance': selected
                ? 'fill'
                : 'outline'
            }}
            isSelected={ selected }
            onChange={ isSelected => {
                setSelected(isSelected);
                onChange?.(isSelected);
            }}
        >
            { label ?? children }
        </ToggleButton>
    ); // TODO: RTL => text icon | LTR => icon text ; see flex grid
}) as Button.Toggle.$;

declare module 'react-aria-components' {
    interface ToggleButtonGroupProps extends HasVariant, HasSize {}
}

const Group: Button.Toggle.Group.$ = ((
    { children, className, ref, variant = 'neutral', size = 'medium', ...props }
) => {
    return (
        <ToggleButtonGroup
            { ...props }
            ref={ ref }
        >
            <ToggleButtonGroupContext.Provider value={{ variant, size }}>
                { children }
            </ToggleButtonGroupContext.Provider>
        </ToggleButtonGroup>
    );
}) as Button.Toggle.Group.$;

Button.displayName = 'Button';
Button.Context = ButtonContext;
Button.HasVariant = HasVariant;
Button.HasSize = HasSize;
Button.Toggle = Toggle;
Button.Toggle.displayName = 'Button.Toggle';
Button.Toggle.Context = ToggleButtonContext;
Button.Toggle.Group = Group;
Button.Toggle.Group.displayName = 'Button.Toggle.Group';
Button.Toggle.Group.Context = ToggleButtonGroupContext;

export namespace Button {

    export type $ = FC<Button> & {
        Context: typeof ButtonContext;
        Toggle: typeof Toggle;
        HasVariant: typeof HasVariant;
        HasSize: typeof HasSize;
    }

    export interface Toggle extends Omit<ToggleButtonProps, 'children'>, HasVariant, HasSize, RefAttributes<HTMLButtonElement> {
        children?: ReactNode;
        label: string | ReactNode;
    }

    export namespace Toggle {
        export type $ = FC<Button.Toggle> & {
            Context: typeof ToggleButtonContext;
            Group: typeof Group;
        }

        export interface Group extends Omit<ToggleButtonGroupProps, 'children'>, HasVariant, HasSize, RefAttributes<HTMLDivElement> {
            children?: ReactNode;
        }

        export namespace Group {
            export type $ = FC<Button.Toggle.Group> & {
                Context: typeof ToggleButtonGroupContext;
            }
        }
    }

}
