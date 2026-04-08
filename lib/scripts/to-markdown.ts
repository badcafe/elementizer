import type { DeclarationEntry, API, MemberEntry, MethodEntry } from './extract-api'

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

function renderMd(md: string): string {
    if (!md) return ''
    return '\n\n' + md + '\n\n';
}

function memberKindType(member: MemberEntry): string {
    if (member.kind === 'property') {
        return `<code>${escapeHtml(member.type)}</code>`
    }
    // method or function: render as a single grouped signature
    const m = member as MethodEntry
    const params = m.parameters
        .map((p) => {
            const opt = p.optional ? '?' : ''
            const def = p.defaultValue !== undefined
                ? ` = ${p.defaultValue}`
                : ''
            return `${escapeHtml(p.name)}${opt}: <code>${escapeHtml(p.type)}</code>${escapeHtml(def)}`
        })
        .join(', ')
    const ret = `<code>${escapeHtml(m.returnType)}</code>`
    return `(${params}) =&gt; ${ret}`
}

function descriptionCell(member: MemberEntry): string {
    const parts: string[] = []
    if (member.comment) parts.push(renderMd(member.comment))
    if (member.kind === 'property' && member.defaultValue !== undefined) {
        parts.push(`<p><strong>Default:</strong> <code>${escapeHtml(member.defaultValue)}</code></p>`)
    }
    return parts.join('\n')
}

const badgeStyleAttr = 'style="color: white; background: darkgrey; padding: 0.25em 0.4em; border: 0.1em solid grey; margin-right: 0.25em; font-size: 70%; border-radius: 0.8em"';

export function * toMarkdown(api: API) {
//    const group = Object.entries(api).reduce((group, [name, decl]) => {
//        group[decl.kind] = Object.assign(group[decl.kind] ?? {}, {
//            [name]: decl
//        })
//        return group;
//    }, {} as Record<DeclarationEntry['kind'], API>);
    yield * functions(api.function);
    yield * structure(api.interface);
    yield * typeAliases(api.typeAlias);
    yield * structure(api.class);
}

export function * tableHeaders(...cols: string[]) {
    yield '<table>';
    yield '  <thead>';
    yield '    <tr>';
    for (const col of cols) {
        yield `      <th>${col}</th>`;
    }
    yield '    </tr>';
    yield '  </thead>';
    yield '  <tbody>';
}

export function * tableFooter() {
    yield '  </tbody>';
    yield '</table>';
}

export function * typeAliases(aliases: API['typeAlias']) {
    if (aliases && Object.entries(aliases).length > 0) {
        yield * tableHeaders('Type alias', 'Definition', 'Description');
        for (const [name, decl] of Object.entries(aliases)) {
            yield '    <tr>';
            yield `      <td style="vertical-align: top;"><code>${escapeHtml(name)}</code></td>`;
            yield `      <td style="vertical-align: top;"><code>${decl.definition ? escapeHtml(decl.definition) : ''}</code></td>`;
            yield `      <td style="vertical-align: top;">${renderMd(decl.comment)}</td>`;
            yield '    </tr>';
        }
        yield * tableFooter();
    }
}

export function * functions(fun: API['function']) {
    if (fun && Object.entries(fun).length > 0) {
        yield * tableHeaders('Function', 'Signature', 'Description');
        for (const [name, decl] of Object.entries(fun)) {
            for (const member of Object.values(decl.members)) {
                yield * memberEntry(member, false);
            }
        }
        yield * tableFooter();
    }
}

export function * structure(struc: Record<string, DeclarationEntry<'interface' | 'class'>>) {
    if (struc && Object.entries(struc).length > 0) {
        yield * tableHeaders('Member', 'Type', 'Description');
        for (const [name, decl] of Object.entries(struc)) {
            yield '    <tr style="background-color: #F6F6FF">';
            yield `      <th style="vertical-align: top;"><code>${name}</code></th>`;
            yield `      <th style="vertical-align: top;">${decl.kind}</th>`;
            yield `      <th style="vertical-align: top; font-weight: normal">${decl.comment}</th>`;
            yield '    </tr>';
            for (const member of Object.values(decl.members)) {
                yield * memberEntry(member, true);
            }
        }
        yield * tableFooter();
    }
}

export function * memberEntry(member: MemberEntry, canBeOptional: boolean) {
    const star = ! canBeOptional || member.optional
        ? ''
        : '<sup style="color:red" title="required">&#x2605;</sup>'
    const abstract = member.abstract
        ? '<code ' + badgeStyleAttr + '>abstract</code>'
        : ''
    const statik = member.static
        ? '<code ' + badgeStyleAttr + '>static</code>'
        : ''
    const nameCell = `${abstract}${statik}<code>${escapeHtml(member.name)}</code>${star}`
    const ktCell = memberKindType(member)
    const descCell = descriptionCell(member)
    yield '    <tr>';
    yield `      <td style="vertical-align: top;">${nameCell}</td>`;
    yield `      <td style="vertical-align: top;">${ktCell}</td>`;
    yield `      <td style="vertical-align: top;">${descCell}</td>`;
    yield '    </tr>';
}
