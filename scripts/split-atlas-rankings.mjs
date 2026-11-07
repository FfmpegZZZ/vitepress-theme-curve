import { gunzipSync } from 'node:zlib'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../public/kamikoi-atlas/data')
const source = JSON.parse(gunzipSync(await readFile(resolve(root, 'rankings.json.gz'))).toString('utf8'))
const { profiles, ...metadata } = source

await writeFile(resolve(root, 'rankings.js'), `window.ATLAS_RANKINGS={...${JSON.stringify(metadata)},profiles:{}};\n`)

for (const [stars, rows] of Object.entries(profiles)) {
  const chunk = `window.ATLAS_RANKINGS.profiles[${JSON.stringify(stars)}]=${JSON.stringify(rows)};\n`
  await writeFile(resolve(root, `rankings-${stars}.js`), chunk)
}
