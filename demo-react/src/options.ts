export const HasVariant = ['neutral', 'positive', 'negative', 'informative'] as const;
export type HasVariant = {
    variant?: typeof HasVariant[number];
}

export const HasSize = ['tiny', 'small', 'medium', 'large', 'big', 'huge'] as const;
export type HasSize = {
    size?: typeof HasSize[number];
}
