// Embute as fotos de public/media (e o favicon) no HTML único como data URIs.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const file = join(root, 'dist-single/index.html')
let html = readFileSync(file, 'utf8')
const b64 = (p) => readFileSync(join(root, 'public', p)).toString('base64')
// uma largura por foto: a maior até 1600 px (ou a menor, se todas passarem)
const byId = {}
for (const f of readdirSync(join(root, 'public/media'))) {
  const m = f.match(/^(.*)-(\d+)\.webp$/)
  if (m) (byId[m[1]] ??= []).push(+m[2])
}
const map = {}
for (const [id, ws] of Object.entries(byId)) {
  ws.sort((a, b) => a - b)
  const w = [...ws].reverse().find((x) => x <= 1600) ?? ws[0]
  const f = `${id}-${w}.webp`
  map[f] = `data:image/webp;base64,${b64('media/' + f)}`
}
html = html.replace('<head>', `<head>\n<script>window.__VILX_MEDIA__=${JSON.stringify(map)}</script>`)
for (const icon of ['favicon.png', 'apple-touch-icon.png']) {
  html = html.replace(new RegExp(`"\\.?/${icon.replace('.', '\\.')}"`), `"data:image/png;base64,${b64(icon)}"`)
}
writeFileSync(file, html)
const left = html.match(/["'(]\/(media|assets)\/[^"')]*/g)
console.log(`index.html: ${(html.length / 1024 / 1024).toFixed(2)} MB; referências locais restantes: ${left ? left.join(', ') : 0}`)
