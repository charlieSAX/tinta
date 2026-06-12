#!/usr/bin/env node
// ── Offline end-to-end test of generate-packs.mjs ─────────────────────────────
// Stubs the network (RSS + Anthropic API) and runs the real generator against
// a temp feed, asserting: packs are accepted, the feed is prepended, deduped
// and capped. Run from the project root: node scripts/test-generator.mjs

import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const dir = mkdtempSync(join(tmpdir(), 'packgen-'))
mkdirSync(join(dir, 'feed'), { recursive: true })
mkdirSync(join(dir, 'scripts'), { recursive: true })

// Seed feed with one existing pack (also covers URL dedupe: item B is known).
const existing = {
  generated_at: '2026-01-01T00:00:00Z',
  packs: [
    {
      pack_id: 'feed-old-1',
      title: 'Old',
      pack: { pack_id: 'feed-old-1', meta: { title: 'Old', url: 'https://example.org/known' }, vocab: [] },
    },
  ],
}
writeFileSync(join(dir, 'feed/index.json'), JSON.stringify(existing))

// The stub: fake RSS for the generator's sources, fake Anthropic responses.
const stub = `
const realFetch = globalThis.fetch
const RSS = \`<rss><channel>
  <item><title>Nueva noticia A</title><link>https://example.org/a</link><description>Descripción A.</description><pubDate>Thu, 11 Jun 2026 10:00:00 GMT</pubDate></item>
  <item><title>Noticia conocida B</title><link>https://example.org/known</link><description>Ya en el feed.</description></item>
</channel></rss>\`
const RESUMEN = Array.from({length: 150}, (_, i) => 'palabra' + i).join(' ')
const PACK = {
  pack_id: 'feed-2026-06-12-test-a',
  meta: { title: 'Nueva noticia A', source: 'Stub', url: 'https://example.org/a', date_published: '2026-06-11', tags: ['news'], level: 'B1-B2' },
  summary_en: 'A test pack.',
  resumen_es: RESUMEN,
  vocab: Array.from({length: 11}, (_, i) => ({ front: 'palabra' + i, pos: 'noun', back: 'word ' + i, example: 'Ejemplo ' + i + '.', tier: 'B1' })),
  grammar: [{ sentence: 'Frase.', point: 'punto', explanation: 'expl' }],
  idioms: [{ phrase: 'frase hecha', meaning: 'set phrase' }],
  comprehension: [{ q: '¿Qué pasa?', type: 'open' }],
  opinion_prompt: '¿Qué opinas?'
}
let calls = 0
globalThis.fetch = async (url, opts) => {
  const u = String(url)
  if (u.includes('api.anthropic.com')) {
    calls++
    const body = JSON.parse(opts.body)
    const isGrader = body.messages[0].content.includes('grading')
    const text = isGrader ? JSON.stringify({ verdict: 'PASS', failures: [] }) : JSON.stringify(PACK)
    return new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { status: 200 })
  }
  return new Response(RSS, { status: 200 })
}
`
writeFileSync(join(dir, 'stub.mjs'), stub)

const r = spawnSync(
  process.execPath,
  ['--import', join(dir, 'stub.mjs'), join(process.cwd(), 'scripts/generate-packs.mjs')],
  { cwd: dir, env: { ...process.env, ANTHROPIC_API_KEY: 'stub-key' }, encoding: 'utf-8' },
)
console.log(r.stdout)
if (r.status !== 0) {
  console.error(r.stderr)
  console.error('FAIL: generator exited ' + r.status)
  process.exit(1)
}

const out = JSON.parse(readFileSync(join(dir, 'feed/index.json'), 'utf-8'))
const checks = [
  ['one new pack accepted', out.packs.length === 2],
  ['new pack is first (prepended)', out.packs[0].pack_id === 'feed-2026-06-12-test-a'],
  ['old pack kept', out.packs[1].pack_id === 'feed-old-1'],
  ['known URL deduped (no third entry)', !out.packs.some((p) => p.pack?.meta?.url === 'https://example.org/known' && p.pack_id !== 'feed-old-1')],
  ['resumen in range', (() => { const w = out.packs[0].pack.resumen_es.split(/\s+/).length; return w >= 130 && w <= 170 })()],
  ['generated_at refreshed', out.generated_at !== '2026-01-01T00:00:00Z'],
]
let failed = 0
for (const [name, ok] of checks) {
  console.log((ok ? 'PASS' : 'FAIL') + ' · ' + name)
  if (!ok) failed++
}
process.exit(failed ? 1 : 0)
