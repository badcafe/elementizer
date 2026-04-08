import * as path from 'path'
import * as td from 'typedoc'

// ---------------------------------------------------------------------------
// Public output types
// ---------------------------------------------------------------------------

export interface ParameterEntry {
    name: string
    type: string
    optional: boolean
    defaultValue?: string
}

export interface Entry {
    name: string
    optional: boolean
    abstract: boolean
    static: boolean
    comment: string
}

export interface MethodEntry extends Entry {
    kind: 'method' | 'function'
    parameters: ParameterEntry[]
    returnType: string
}

export interface PropertyEntry extends Entry {
    kind: 'property'
    type: string
    defaultValue?: string
}

export type MemberEntry = PropertyEntry | MethodEntry

// Single unified Kind — no plural/singular duality
export type Kind = 'interface' | 'typeAlias' | 'class' | 'function'

export interface DeclarationEntry<K extends Kind = Kind> {
    kind: K
    name: string
    /** Only set for typeAlias: the stringified type definition. */
    definition?: string
    comment: string
    members: Record<string, MemberEntry>
}

export interface API {
    interface: Record<string, DeclarationEntry<'interface'>>
    typeAlias: Record<string, DeclarationEntry<'typeAlias'>>
    class:     Record<string, DeclarationEntry<'class'>>
    function:  Record<string, DeclarationEntry<'function'>>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function reflectionKindToKind(k: td.ReflectionKind): Kind | null {
    switch (k) {
        case td.ReflectionKind.Interface:  return 'interface'
        case td.ReflectionKind.TypeAlias:  return 'typeAlias'
        case td.ReflectionKind.Class:      return 'class'
        case td.ReflectionKind.Function:   return 'function'
        default:                           return null
    }
}

function visitedKey(name: string, kind: Kind): string {
    return `${name}#${kind}`
}

// ---------------------------------------------------------------------------
// Comment extraction
// ---------------------------------------------------------------------------

function extractComment(comment: td.Models.Comment | undefined): string {
    if (!comment) return ''

    const parts: string[] = []

    const summary = comment.summary
        .map((p) => p.text)
        .join('')
        .trim()
    if (summary) parts.push(summary)

    for (const tag of comment.blockTags ?? []) {
        if (tag.tag === '@see') {
            const hasLink = tag.content.some(
                (p) => p.kind === 'inline-tag' && p.tag === '@link'
            )
            if (hasLink) continue
            const seeText = tag.content
                .map((p) => p.text)
                .join('')
                .trim()
            if (seeText) parts.push(`See also: ${seeText}`)
        }
    }

    return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// Type stringification
// ---------------------------------------------------------------------------

function resolveType(type: td.Models.SomeType | undefined): string {
    if (!type) return 'unknown'
    return type.stringify(td.Models.TypeContext.none)
}

// ---------------------------------------------------------------------------
// Internal reference collection
// ---------------------------------------------------------------------------

function collectInternalRefs(
    type: td.Models.SomeType | undefined,
    out: Set<td.Models.DeclarationReflection>
): void {
    if (!type) return

    if (type instanceof td.Models.ReferenceType) {
        const target = type.reflection
        if (
            target instanceof td.Models.DeclarationReflection &&
            reflectionKindToKind(target.kind) !== null
        ) {
            out.add(target)
        }
        for (const arg of type.typeArguments ?? []) collectInternalRefs(arg, out)
        return
    }

    if (
        type instanceof td.Models.UnionType ||
        type instanceof td.Models.IntersectionType
    ) {
        for (const t of type.types) collectInternalRefs(t, out)
        return
    }

    if (type instanceof td.Models.ArrayType) {
        collectInternalRefs(type.elementType, out)
        return
    }

    if (type instanceof td.Models.TupleType) {
        for (const t of type.elements) {
            if (t instanceof td.Models.NamedTupleMember) {
                collectInternalRefs(t.element, out)
            } else {
                collectInternalRefs(t as td.Models.SomeType, out)
            }
        }
        return
    }

    if (type instanceof td.Models.ReflectionType) {
        for (const child of type.declaration?.children ?? []) {
            collectInternalRefs(child.type, out)
        }
        return
    }
}

// ---------------------------------------------------------------------------
// Default value extraction
// ---------------------------------------------------------------------------

function extractDefaultValue(
    child: td.Models.DeclarationReflection
): string | undefined {
    if (child.defaultValue !== undefined && child.defaultValue !== '') {
        return child.defaultValue
    }
    const tag = child.comment?.blockTags?.find(
        (t) => t.tag === '@defaultValue' || t.tag === '@default'
    )
    if (tag) {
        return tag.content
            .map((p) => p.text)
            .join('')
            .trim()
    }
    return undefined
}

// ---------------------------------------------------------------------------
// Signature → MethodEntry
// ---------------------------------------------------------------------------

function signatureToEntry(
    sig: td.Models.SignatureReflection,
    name: string,
    memberKind: MethodEntry['kind'],
    refsToVisit: Set<td.Models.DeclarationReflection>,
    optional: boolean = false,
    abstract: boolean = false,
    statik: boolean = false
): MethodEntry {
    const parameters: ParameterEntry[] = (sig.parameters ?? []).map((p) => {
        collectInternalRefs(p.type, refsToVisit)
        const defaultValue =
            p.defaultValue !== undefined && p.defaultValue !== ''
                ? p.defaultValue
                : undefined
        const pname = p.name === '__namedParameters' ? '···settings···' : p.name
        return {
            name: pname,
            type: resolveType(p.type),
            optional: p.flags.isOptional ?? false,
            ...(defaultValue !== undefined ? { defaultValue } : {}),
        }
    })
    collectInternalRefs(sig.type, refsToVisit)
    return {
        kind: memberKind,
        name,
        optional,
        abstract,
        static: statik,
        parameters,
        returnType: resolveType(sig.type),
        comment: extractComment(sig.comment),
    }
}

// ---------------------------------------------------------------------------
// Single reflection → DeclarationEntry
// ---------------------------------------------------------------------------

function reflectionToEntry(reflection: td.Models.DeclarationReflection): {
    entry: DeclarationEntry
    refsToVisit: Set<td.Models.DeclarationReflection>
} {
    const refsToVisit = new Set<td.Models.DeclarationReflection>()
    const members: Record<string, MemberEntry> = {}

    // Top-level functions expose their signatures directly on the reflection
    if (reflection.kind === td.ReflectionKind.Function) {
        const sig = reflection.signatures?.[0]
        if (sig) {
            const fnEntry = signatureToEntry(sig, reflection.name, 'function', refsToVisit)
            return {
                entry: {
                    kind: 'function',
                    name: reflection.name,
                    comment: extractComment(sig.comment ?? reflection.comment),
                    members: { [reflection.name]: fnEntry },
                },
                refsToVisit,
            }
        }
    }

    const kind = reflectionKindToKind(reflection.kind) ?? 'class'

    let definition: string | undefined
    const children: td.Models.DeclarationReflection[] = []

    if (reflection.kind === td.ReflectionKind.TypeAlias) {
        definition = resolveType(reflection.type)
        if (reflection.type instanceof td.Models.ReflectionType) {
            children.push(...(reflection.type.declaration?.children ?? []))
        }
        collectInternalRefs(reflection.type, refsToVisit)
    } else {
        children.push(...(reflection.children ?? []))
    }

    for (const child of children) {
        if (child.flags.isInherited) continue

        const isProperty =
            child.kind === td.ReflectionKind.Property ||
            child.kind === td.ReflectionKind.Accessor

        const isCallable =
            child.kind === td.ReflectionKind.Method ||
            child.kind === td.ReflectionKind.Constructor ||
            child.kind === td.ReflectionKind.Function

        if (isProperty) {
            collectInternalRefs(child.type, refsToVisit)
            const defaultValue = extractDefaultValue(child)
            const entry: PropertyEntry = {
                kind: 'property',
                name: child.name,
                type: resolveType(child.type),
                optional: child.flags.isOptional ?? false,
                abstract: child.flags.isAbstract ?? false,
                static: child.flags.isStatic ?? false,
                comment: extractComment(child.comment),
            }
            if (defaultValue !== undefined) entry.defaultValue = defaultValue
            members[child.name] = entry
            continue
        }

        if (isCallable) {
            const sig = child.signatures?.[0]
            if (!sig) continue
            const memberKind: MethodEntry['kind'] =
                child.kind === td.ReflectionKind.Function ? 'function' : 'method'
            members[child.name] = signatureToEntry(
                sig,
                child.name,
                memberKind,
                refsToVisit,
                child.flags.isOptional ?? false,
                child.flags.isAbstract ?? false,
                child.flags.isStatic ?? false
            )
        }
    }

    const entry: DeclarationEntry = {
        kind,
        name: reflection.name,
        comment: extractComment(reflection.comment),
        members,
    }
    if (definition !== undefined) entry.definition = definition

    return { entry, refsToVisit }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ExtractOptions {
    /** Absolute or relative path to the source file to parse. */
    sourceFile: string
    /** Names of the top-level symbols to extract. */
    symbolNames: string[]
    /** Path to the tsconfig.json to use. Defaults to cwd/tsconfig.json. */
    tsconfig?: string
}

export async function extract(options: ExtractOptions): Promise<API> {
    const { sourceFile, symbolNames } = options
    const absoluteSource = path.resolve(process.cwd(), sourceFile)
    const tsconfig = options.tsconfig ?? path.resolve(process.cwd(), 'tsconfig.json')

    const app = await td.Application.bootstrapWithPlugins({
        entryPoints: [absoluteSource],
        tsconfig,
        logLevel: td.LogLevel.Error,
        skipErrorChecking: true,
    })

    const project = await app.convert()
    if (!project) throw new Error('TypeDoc failed to parse the project.')

    const output: API = {
        interface: {},
        typeAlias: {},
        class:     {},
        function:  {},
    }

    const queue: td.Models.DeclarationReflection[] = []
    const visited = new Set<string>()

    // Seed: filter project.children by name to collect all reflections with
    // that name, regardless of kind (handles same-name function + typeAlias etc.)
    for (const symbolName of symbolNames) {
        const matches = (project.children ?? []).filter(
            (c): c is td.Models.DeclarationReflection =>
                c instanceof td.Models.DeclarationReflection &&
                c.name === symbolName &&
                reflectionKindToKind(c.kind) !== null
        )
        if (matches.length === 0)
            throw new Error(`Symbol "${symbolName}" not found in ${sourceFile}`)
        queue.push(...matches)
    }

    while (queue.length > 0) {
        const reflection = queue.shift()!
        const kind = reflectionKindToKind(reflection.kind)
        if (!kind) continue

        const key = visitedKey(reflection.name, kind)
        if (visited.has(key)) continue
        visited.add(key)

        const { entry, refsToVisit } = reflectionToEntry(reflection)
        // Safe cast: kind and bucket key are always consistent
        ;(output[entry.kind] as Record<string, DeclarationEntry>)[entry.name] = entry

        for (const ref of refsToVisit) {
            const refKind = reflectionKindToKind(ref.kind)
            if (refKind && !visited.has(visitedKey(ref.name, refKind))) {
                queue.push(ref)
            }
        }
    }

    return output
}
