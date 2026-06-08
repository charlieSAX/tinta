import { db, setEngagement, type MetaRow } from './db'
import { importPack } from './packs'
import type { ReviewLogEntry, StoredCard, StoredPack } from '../types'

interface CardExport extends Omit<StoredCard, 'due' | 'last_review'> {
  due: string
  last_review?: string
}

export interface Backup {
  app: 'tinta'
  schema: number
  exported_at: string
  packs: StoredPack[]
  cards: CardExport[]
  reviews: ReviewLogEntry[]
  meta: MetaRow[]
}

/** Serialise the entire local database to a JSON string (Date → ISO). */
export async function exportAll(): Promise<string> {
  const [packs, cards, reviews, meta] = await Promise.all([
    db.packs.toArray(),
    db.cards.toArray(),
    db.reviews.toArray(),
    db.meta.toArray(),
  ])
  const payload: Backup = {
    app: 'tinta',
    schema: 1,
    exported_at: new Date().toISOString(),
    packs,
    cards: cards.map((c) => ({
      ...c,
      due: c.due.toISOString(),
      last_review: c.last_review ? c.last_review.toISOString() : undefined,
    })),
    reviews,
    meta,
  }
  return JSON.stringify(payload, null, 2)
}

function reviveCard(c: CardExport): StoredCard {
  return {
    ...c,
    due: new Date(c.due),
    last_review: c.last_review ? new Date(c.last_review) : undefined,
  }
}

/** Replace the entire local database from a backup string (ISO → Date). Lossless. */
export async function importAll(
  json: string,
): Promise<{ packs: number; cards: number; reviews: number }> {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch (e) {
    throw new Error(`That file isn't valid JSON — ${(e as Error).message}.`)
  }
  const d = data as Partial<Backup>
  if (!d || typeof d !== 'object' || !Array.isArray(d.cards) || !Array.isArray(d.packs)) {
    throw new Error('This file is not a Tinta backup.')
  }

  await db.transaction('rw', db.packs, db.cards, db.reviews, db.meta, async () => {
    await Promise.all([db.packs.clear(), db.cards.clear(), db.reviews.clear(), db.meta.clear()])
    await db.packs.bulkAdd(d.packs as StoredPack[])
    await db.cards.bulkAdd((d.cards as CardExport[]).map(reviveCard))
    await db.reviews.bulkAdd((d.reviews as ReviewLogEntry[]) ?? [])
    await db.meta.bulkAdd((d.meta as MetaRow[]) ?? [])
  })

  return {
    packs: (d.packs as StoredPack[]).length,
    cards: (d.cards as CardExport[]).length,
    reviews: ((d.reviews as ReviewLogEntry[]) ?? []).length,
  }
}

/**
 * Reset the review deck: clear all cards, history and engagement, then rebuild
 * the cards fresh from the imported packs so the library is kept but scheduling
 * starts over.
 */
export async function resetDeck(): Promise<void> {
  const packs = await db.packs.orderBy('imported_at').toArray()
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.cards.clear()
    await db.reviews.clear()
  })
  await setEngagement({ sessionDays: [], lifetimeSessions: 0 })
  for (const p of packs) {
    await importPack(p, { is_sample: p.is_sample })
  }
}
