#!/usr/bin/env node
// ── Tinta daily article generator ─────────────────────────────────────────────
// Runs in GitHub Actions on the gh-pages branch. Fetches free Spanish RSS
// feeds, builds level-calibrated study packs with the Claude API, grades each
// pack against a quality rubric (regenerating once on failure), and prepends
// the survivors to feed/index.json. The app pulls that feed on open.
//
// No dependencies. Node 20+. Requires ANTHROPIC_API_KEY in the environment.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'

// ── Per-app configuration (the only block that differs between Tinta/Naomilingo)
const APP = 'Tinta'
const LANGUAGE = 'Spanish'
const LEVEL = 'B1 to B2 (intermediate). Use natural, idiomatic Spanish from Spain and Latin America. Generous vocabulary including common collocations and connectives.'
const SUMMARY_FIELD_LANG = 'Spanish'
const RSS_SOURCES = [
  { name: 'BBC Mundo', url: 'https://feeds.bbci.co.uk/mundo/rss.xml' },
  { name: 'RFI en español', url: 'https://www.rfi.fr/es/rss' },
]
const MAX_NEW_PER_RUN = 4
const FEED_CAP = 40
const FEED_PATH = 'feed/index.json'

// ── Anthropic API ─────────────────────────────────────────────────────────────
const API_KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.PACK_MODEL || 'claude-sonnet-4-6'
if (!API_KEY) {
  console.error('FATAL: ANTHROPIC_API_KEY is not set.')
  process.exit(1)
}

async function claude(system, user, maxTokens = 4000) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  return data.content.map((b) => b.text ?? '').join('')
}

// ── RSS (regex parsing keeps us dependency-free; feeds are simple) ───────────
function decode(s) {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .trim()
}

async function fetchRss(src) {
  try {
    const res = await fetch(src.url, { headers: { 'user-agent': 'tinta-pack-generator' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const xml = await res.text()
    const items = []
    for (const m of xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/g)) {
      const block = m[1]
      const pick = (tag) => {
        const r = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
        return r ? decode(r[1]) : ''
      }
      const title = pick('title')
      const link = pick('link') || (block.match(/<link[^>]*href="([^"]+)"/) || [])[1] || ''
      const description = pick('description')
      const pubDate = pick('pubDate')
      if (title && link) items.push({ source: src.name, title, link, description, pubDate })
    }
    console.log(`RSS ok: ${src.name} (${items.length} items)`)
    return items
  } catch (e) {
    console.warn(`RSS FAIL: ${src.name}: ${e.message}`)
    return []
  }
}

// ── Pack prompt ───────────────────────────────────────────────────────────────
const PACK_SCHEMA_HINT = `{
  "pack_id": "feed-YYYY-MM-DD-slug",
  "meta": { "title": "...", "source": "...", "url": "...", "date_published": "YYYY-MM-DD", "tags": ["topic", "topic"], "level": "B1-B2" },
  "summary_en": "2-3 sentence English summary",
  "resumen_es": "the ${SUMMARY_FIELD_LANG} summary, 130-170 words",
  "vocab": [ { "front": "lemma or collocation", "pos": "noun|verb|adj|adv|phrase", "back": "English meaning", "example": "short natural example sentence", "tier": "B1|B2|C1|C2" } ],
  "grammar": [ { "sentence": "...", "point": "...", "explanation": "...", "why_tricky": "..." } ],
  "idioms": [ { "phrase": "...", "meaning": "...", "example": "..." } ],
  "comprehension": [ { "q": "open question in ${SUMMARY_FIELD_LANG}", "type": "open" } ],
  "opinion_prompt": "one writing prompt in ${SUMMARY_FIELD_LANG}"
}`

function generatorPrompt(item, today) {
  return `Build one ${APP} study pack from this real news item.

HEADLINE: ${item.title}
SOURCE: ${item.source}
URL: ${item.link}
PUBLISHED: ${item.pubDate || today}
DESCRIPTION: ${item.description || '(none)'}

Learner level: ${LEVEL}

Rules:
- The resumen_es is a self-contained ${SUMMARY_FIELD_LANG} mini-article of 130-170 words at the learner's level. Build from the headline and description only; add general background context, never invented specifics (no made-up numbers, quotes or names).
- 10 to 14 vocab items actually drawn from or natural to the topic; include 2-3 collocations.
- 2-3 grammar points using sentences from your resumen.
- 1-2 idioms or set phrases.
- 3 comprehension questions and 1 opinion prompt, all in ${SUMMARY_FIELD_LANG}.
- pack_id format feed-${today}-<short-slug>.
- NEVER use the em dash character anywhere.
- Reply with ONLY the JSON object, no markdown fences. Schema: ${PACK_SCHEMA_HINT}`
}

function graderPrompt(pack) {
  return `You are grading a ${LANGUAGE} study pack for quality. You did not write it. Grade strictly.

PACK: ${JSON.stringify(pack)}

Criteria (each PASS/FAIL):
1. resumen_es is 130-170 words, natural ${LANGUAGE}, level: ${LEVEL}
2. resumen_es does not invent specific facts beyond reasonable general context for the headline.
3. vocab has 10+ useful items with correct meanings and natural examples.
4. grammar explanations are accurate.
5. No em dash character anywhere.
6. comprehension questions and opinion prompt are in ${SUMMARY_FIELD_LANG} and answerable from the resumen.

Reply with ONLY JSON: {"verdict":"PASS"|"FAIL","failures":["short reason per failed criterion"]}`
}

function parseJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  return JSON.parse(cleaned)
}

function validatePack(pack, item) {
  const errs = []
  if (!pack || typeof pack !== 'object') return ['not an object']
  if (!pack.pack_id) errs.push('missing pack_id')
  if (!pack.meta?.title) errs.push('missing meta.title')
  if (!Array.isArray(pack.vocab) || pack.vocab.length < 8) errs.push('vocab < 8')
  const words = (pack.resumen_es || '').split(/\s+/).filter(Boolean).length
  if (words < 120 || words > 185) errs.push(`resumen ${words} words`)
  if (JSON.stringify(pack).includes('—')) errs.push('contains em dash')
  if (!pack.meta?.url) pack.meta.url = item.link
  if (!pack.meta?.source) pack.meta.source = item.source
  return errs
}

// ── Main ──────────────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10)

const feed = existsSync(FEED_PATH)
  ? JSON.parse(readFileSync(FEED_PATH, 'utf-8'))
  : { packs: [] }
const knownUrls = new Set(feed.packs.map((e) => e.pack?.meta?.url).filter(Boolean))
const knownIds = new Set(feed.packs.map((e) => e.pack_id))

const all = (await Promise.all(RSS_SOURCES.map(fetchRss))).flat()
const seenThisRun = new Set()
const fresh = all
  .filter((it) => {
    if (knownUrls.has(it.link) || seenThisRun.has(it.link)) return false
    seenThisRun.add(it.link)
    return true
  })
  .slice(0, MAX_NEW_PER_RUN)
console.log(`Candidates: ${all.length} items, ${fresh.length} new (cap ${MAX_NEW_PER_RUN})`)

const accepted = []
for (const item of fresh) {
  try {
    let raw = await claude(
      `You write impeccable ${LANGUAGE} learning material. You output only valid JSON.`,
      generatorPrompt(item, today),
    )
    let pack = parseJson(raw)
    let errs = validatePack(pack, item)
    let grade = errs.length ? { verdict: 'FAIL', failures: errs } : parseJson(await claude('You are a strict reviewer. Output only valid JSON.', graderPrompt(pack), 600))

    if (grade.verdict !== 'PASS') {
      console.log(`Regenerating "${item.title}": ${grade.failures?.join('; ')}`)
      raw = await claude(
        `You write impeccable ${LANGUAGE} learning material. You output only valid JSON.`,
        generatorPrompt(item, today) + `\n\nA previous attempt failed review for these reasons; fix all of them:\n- ${(grade.failures || []).join('\n- ')}`,
      )
      pack = parseJson(raw)
      errs = validatePack(pack, item)
      grade = errs.length ? { verdict: 'FAIL', failures: errs } : parseJson(await claude('You are a strict reviewer. Output only valid JSON.', graderPrompt(pack), 600))
    }

    if (grade.verdict === 'PASS') {
      if (knownIds.has(pack.pack_id)) pack.pack_id = `${pack.pack_id}-${Math.random().toString(36).slice(2, 6)}`
      pack.meta.date_processed = today
      accepted.push(pack)
      knownIds.add(pack.pack_id)
      console.log(`ACCEPTED: ${pack.pack_id} (${pack.vocab.length} vocab)`)
    } else {
      console.log(`SKIPPED after retry: "${item.title}" (${grade.failures?.join('; ')})`)
    }
  } catch (e) {
    console.warn(`ERROR on "${item.title}": ${e.message}`)
  }
}

if (accepted.length === 0) {
  console.log('No new packs accepted; feed unchanged.')
  process.exit(0)
}

const newEntries = accepted.map((p) => ({
  pack_id: p.pack_id,
  title: p.meta.title,
  source: p.meta.source,
  date: p.meta.date_published || today,
  level: p.meta.level,
  topics: p.meta.tags || [],
  pack: p,
}))
feed.packs = [...newEntries, ...feed.packs].slice(0, FEED_CAP)
feed.generated_at = new Date().toISOString()
writeFileSync(FEED_PATH, JSON.stringify(feed, null, 2))
console.log(`Feed updated: +${accepted.length} packs, total ${feed.packs.length}.`)
