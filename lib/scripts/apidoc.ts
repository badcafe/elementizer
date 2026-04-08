import { extract } from './extract-api'
import { toMarkdown } from './to-markdown'

const args = process.argv.slice(2)
if (args.length < 2) {
    console.error('Usage: tsx scripts/apidoc.ts <sourceFile> <Symbol> [Symbol2 ...]')
    process.exit(1)
}

const [sourceFile, ...symbolNames] = args

try {
    const result = await extract({ sourceFile, symbolNames });
    for (const line of toMarkdown(result)) {
        console.log(line);
    }
} catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
}
