import type {
  ComprehensionItem,
  GrammarItem,
  IdiomItem,
  StoredCard,
  StoredPack,
  StudyPack,
  Tier,
  VocabItem,
} from '../types'
import { TIERS } from '../types'
import { db } from './db'
import { emptyState } from './fsrs'
import { isoDate } from './format'

export interface ValidationOk {
  ok: true
  pack: StudyPack
}
export interface ValidationErr {
  ok: false
  errors: string[]
}
export type ValidationResult = ValidationOk | ValidationErr

export interface ImportResult {
  added: number
  skipped: number
  title: string
  pack_id: string
}

// ── helpers ──────────────────────────────────────────────────────────────────

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function strArr(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out = v.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean)
  return out.length ? out : undefined
}

export function slugify(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'pack'
  )
}

function normTier(t: unknown, fallback: string | undefined): Tier {
  const up = typeof t === 'string' ? t.trim().toUpperCase() : ''
  if ((TIERS as string[]).includes(up)) return up as Tier
  const fb = (fallback ?? '').toUpperCase()
  if ((TIERS as string[]).includes(fb)) return fb as Tier
  return 'B2'
}

function normVocab(raw: unknown): VocabItem {
  const v = (raw ?? {}) as Record<string, unknown>
  return {
    id: str(v.id),
    front: (str(v.front) ?? '').trim(),
    pos: str(v.pos),
    back: str(v.back) ?? '',
    example: str(v.example),
    tier: str(v.tier),
    tags: strArr(v.tags) ?? [],
  }
}

function normGrammar(v: unknown): GrammarItem[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out = v
    .map((g) => {
      const o = (g ?? {}) as Record<string, unknown>
      return {
        sentence: str(o.sentence) ?? '',
        point: str(o.point) ?? '',
        explanation: str(o.explanation),
        why_tricky: str(o.why_tricky),
      }
    })
    .filter((g) => g.sentence || g.point)
  return out.length ? out : undefined
}

function normIdioms(v: unknown): IdiomItem[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out = v
    .map((g) => {
      const o = (g ?? {}) as Record<string, unknown>
      return { phrase: str(o.phrase) ?? '', meaning: str(o.meaning), example: str(o.example) }
    })
    .filter((g) => g.phrase)
  return out.length ? out : undefined
}

function normComprehension(v: unknown): ComprehensionItem[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out = v
    .map((g) => {
      const o = (g ?? {}) as Record<string, unknown>
      return { q: str(o.q) ?? '', type: str(o.type) }
    })
    .filter((g) => g.q)
  return out.length ? out : undefined
}

// ── validation ───────────────────────────────────────────────────────────────

export function parseAndValidate(input: string): ValidationResult {
  let raw: unknown
  try {
    raw = JSON.parse(input)
  } catch (e) {
    return { ok: false, errors: [`That isn't valid JSON: ${(e as Error).message}.`] }
  }
  return validatePack(raw)
}

export function validatePack(raw: unknown): ValidationResult {
  const errors: string[] = []
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['The pack must be a JSON object (got ' + (Array.isArray(raw) ? 'an array' : typeof raw) + ').'] }
  }
  const obj = raw as Record<string, unknown>

  const meta = obj.meta as Record<string, unknown> | undefined
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    errors.push("Missing 'meta' object; it needs at least a title.")
  } else if (typeof meta.title !== 'string' || !meta.title.trim()) {
    errors.push("'meta.title' is required.")
  }

  const vocab = obj.vocab
  if (!Array.isArray(vocab)) {
    errors.push("Missing 'vocab' array.")
  } else if (vocab.length === 0) {
    errors.push("'vocab' is empty; there's nothing to study.")
  } else {
    vocab.forEach((v, i) => {
      if (typeof v !== 'object' || v === null) {
        errors.push(`vocab[${i}] is not an object.`)
        return
      }
      const item = v as Record<string, unknown>
      if (typeof item.front !== 'string' || !item.front.trim()) {
        errors.push(`vocab[${i}] is missing 'front' (the Spanish term).`)
      }
      if (typeof item.back !== 'string' || !item.back.trim()) {
        const who = typeof item.front === 'string' ? ` ("${item.front}")` : ''
        errors.push(`vocab[${i}]${who} is missing 'back' (the English gloss).`)
      }
    })
  }

  if (errors.length) return { ok: false, errors }

  const m = meta as Record<string, unknown>
  const title = (m.title as string).trim()
  const pack_id =
    typeof obj.pack_id === 'string' && obj.pack_id.trim()
      ? obj.pack_id.trim()
      : `${str(m.date_processed) ?? isoDate()}-${slugify(title)}`

  const pack: StudyPack = {
    pack_id,
    meta: {
      title,
      source: str(m.source),
      url: str(m.url),
      date_published: str(m.date_published),
      date_processed: str(m.date_processed),
      tags: strArr(m.tags),
      length_words: typeof m.length_words === 'number' ? m.length_words : undefined,
      level: str(m.level),
    },
    summary_en: str(obj.summary_en),
    resumen_es: str(obj.resumen_es),
    article_text: str(obj.article_text),
    vocab: (vocab as unknown[]).map(normVocab).filter((v) => v.front && v.back),
    grammar: normGrammar(obj.grammar),
    idioms: normIdioms(obj.idioms),
    comprehension: normComprehension(obj.comprehension),
    opinion_prompt: str(obj.opinion_prompt),
  }

  return { ok: true, pack }
}

// ── import / merge ───────────────────────────────────────────────────────────

/**
 * Store the pack's reading content and merge its vocab into the canonical card
 * store. Deduplicates by lemma: an existing lemma is skipped (counted as
 * "already known") and the new pack is appended to its sources.
 */
export async function importPack(
  pack: StudyPack,
  opts: { is_sample?: boolean } = {},
): Promise<ImportResult> {
  const now = Date.now()
  let added = 0
  let skipped = 0

  await db.transaction('rw', db.packs, db.cards, async () => {
    const stored: StoredPack = { ...pack, imported_at: now, is_sample: opts.is_sample }
    await db.packs.put(stored)

    for (const v of pack.vocab) {
      const front = v.front.trim()
      if (!front || !v.back) continue
      const existing = await db.cards.get(front)
      if (existing) {
        skipped += 1
        if (!existing.sources.includes(pack.pack_id)) {
          await db.cards.update(front, { sources: [...existing.sources, pack.pack_id] })
        }
        continue
      }
      const card: StoredCard = {
        front,
        back: v.back.trim(),
        example: v.example?.trim() || undefined,
        pos: v.pos?.trim() || undefined,
        tier: normTier(v.tier, pack.meta.level),
        tags: (v.tags ?? []).map((t) => t.trim()).filter(Boolean),
        sources: [pack.pack_id],
        created_at: now,
        ...emptyState(new Date(now)),
      }
      await db.cards.add(card)
      added += 1
    }
  })

  return { added, skipped, title: pack.meta.title, pack_id: pack.pack_id }
}

/** Remove a pack and detach it from its cards; cards with no remaining source are dropped. */
export async function deletePack(pack_id: string): Promise<void> {
  await db.transaction('rw', db.packs, db.cards, async () => {
    await db.packs.delete(pack_id)
    const all = await db.cards.toArray()
    for (const c of all) {
      if (!c.sources.includes(pack_id)) continue
      const sources = c.sources.filter((s) => s !== pack_id)
      if (sources.length === 0) await db.cards.delete(c.front)
      else await db.cards.update(c.front, { sources })
    }
  })
}
