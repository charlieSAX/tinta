import { db, getSettings } from './db'
import { importPack, parseAndValidate, validatePack } from './packs'
import type { StudyPack } from '../types'

// ── The article feed (Tinta's "inbox") ───────────────────────────────────────
// A feed is a small JSON index listing study packs. The app pulls it (on a
// button press and, optionally, automatically on open), imports any packs it
// doesn't already have, and keeps everything previously pulled. New packs are
// produced by the daily generator and published to this feed.

export interface FeedEntry {
  pack_id: string
  /** Either embed the whole pack inline (preferred — single self-contained feed file)… */
  pack?: StudyPack
  /** …or reference a separate pack file, relative to the feed index URL. */
  file?: string
  title?: string
  source?: string
  date?: string
  level?: string
  topics?: string[]
}

export interface FeedIndex {
  generated_at?: string
  packs: FeedEntry[]
}

export interface PullResult {
  reachedFeed: boolean
  added: number // new articles imported
  cards: number // new cards created
  alreadyHad: number // entries already in the library (skipped)
  errors: string[]
}

/** The built-in feed: <base>feed/index.json on the deployed (same-origin) site. */
export function defaultFeedUrl(): string {
  const base = import.meta.env?.BASE_URL ?? '/'
  return `${base}feed/index.json`
}

export async function resolveFeedUrl(): Promise<string> {
  const s = await getSettings()
  return s.feedUrl && s.feedUrl.trim() ? s.feedUrl.trim() : defaultFeedUrl()
}

function bust(url: string): string {
  return url + (url.includes('?') ? '&' : '?') + '_=' + Date.now()
}

/**
 * Pull the feed: import every pack we don't already have (dedupe by pack_id),
 * keep everything already imported. Network failures are reported, not thrown.
 */
export async function pullFeed(): Promise<PullResult> {
  const result: PullResult = { reachedFeed: false, added: 0, cards: 0, alreadyHad: 0, errors: [] }
  const indexUrl = await resolveFeedUrl()

  let index: FeedIndex
  try {
    const res = await fetch(bust(indexUrl), { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    index = (await res.json()) as FeedIndex
    result.reachedFeed = true
  } catch (e) {
    result.errors.push(`Couldn't reach the feed — ${(e as Error).message}`)
    return result
  }

  if (!index || !Array.isArray(index.packs)) {
    result.errors.push('The feed is malformed (no "packs" array).')
    return result
  }

  const existing = new Set((await db.packs.toCollection().primaryKeys()) as string[])
  const base = new URL(indexUrl, window.location.href)

  for (const entry of index.packs) {
    if (!entry || !entry.pack_id || (!entry.pack && !entry.file)) continue
    if (existing.has(entry.pack_id)) {
      result.alreadyHad += 1
      continue
    }
    try {
      let pack: StudyPack
      if (entry.pack) {
        const v = validatePack(entry.pack)
        if (!v.ok) {
          result.errors.push(`${entry.title ?? entry.pack_id}: ${v.errors[0]}`)
          continue
        }
        pack = v.pack
      } else {
        const fileUrl = new URL(entry.file as string, base).href
        const res = await fetch(bust(fileUrl), { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const parsed = parseAndValidate(await res.text())
        if (!parsed.ok) {
          result.errors.push(`${entry.title ?? entry.pack_id}: ${parsed.errors[0]}`)
          continue
        }
        pack = parsed.pack
      }
      const imp = await importPack(pack)
      result.added += 1
      result.cards += imp.added
      existing.add(entry.pack_id)
    } catch (e) {
      result.errors.push(`${entry.title ?? entry.pack_id}: ${(e as Error).message}`)
    }
  }

  return result
}
