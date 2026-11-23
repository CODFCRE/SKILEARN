import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const clientRoot = dirname(fileURLToPath(import.meta.url))
const outputDirectory = resolve(clientRoot, 'dist-android')
const generatedModule = resolve(clientRoot, '../skillrean-android/src/web/generatedWebApp.js')
const embeddedOrigin = 'https://skilearn-app.local/'

process.env.VITE_AUTH_REDIRECT_URL = 'skilearn://auth/error'

await build({
  mode: 'android',
  base: embeddedOrigin,
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
})

let html = await readFile(resolve(outputDirectory, 'index.html'), 'utf8')
const scriptTags = [...html.matchAll(/<script\b[^>]*><\/script>/gi)]
const stylesheetTags = [...html.matchAll(/<link\b[^>]*>/gi)]
  .filter(([tag]) => /\brel=["']stylesheet["']/i.test(tag))

if (scriptTags.length !== 1 || stylesheetTags.length !== 1) {
  throw new Error('Expected the Android web build to contain one script bundle and one stylesheet.')
}

const getResourcePath = (tag) => {
  const url = tag.match(/\b(?:src|href)=["']([^"']+)["']/i)?.[1]
  if (!url) throw new Error('A generated web resource is missing its URL.')
  const resourcePath = new URL(url, embeddedOrigin).pathname.slice(1).split('/').join(sep)
  return resolve(outputDirectory, resourcePath)
}

const javascript = await readFile(getResourcePath(scriptTags[0][0]), 'utf8')
const stylesheet = await readFile(getResourcePath(stylesheetTags[0][0]), 'utf8')
const inlineJavascript = javascript.replace(/<\/script/gi, '<\\/script')
html = html.replace(scriptTags[0][0], () => `<script type="module">${inlineJavascript}</script>`)
html = html.replace(stylesheetTags[0][0], () => `<style>${stylesheet}</style>`)
html = html.replace(/<link\b(?=[^>]*\brel=["']icon["'])[^>]*>/gi, '')

const embeddedJavascript = html.match(/<script type="module">([\s\S]*?)<\/script>/i)?.[1]
const embeddedStylesheet = html.match(/<style>([\s\S]*?)<\/style>/i)?.[1]
if (embeddedJavascript !== inlineJavascript || embeddedStylesheet !== stylesheet) {
  throw new Error('The Android web assets were not embedded intact.')
}
if (!embeddedJavascript.includes('skilearn://auth/error')) {
  throw new Error('The Android web build is missing its app OAuth redirect URL.')
}

await mkdir(dirname(generatedModule), { recursive: true })
await writeFile(generatedModule, `export const webAppHtml = ${JSON.stringify(html)};\n`)
