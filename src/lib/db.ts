import Dexie, { type Table } from 'dexie'
import type {
  Engagement,
  ReviewLogEntry,
  Settings,
  StoredCard,
  StoredPack,
} from '../types'

export interface MetaRow {
  key: string
  value: unknown
}

export const DEFAULT_SETTINGS: Settings = {
  dailyNewCap: 10,
  theme: 'light',
  feedUrl: '',
  autoPull: true,
  voiceURI: '',
}
export const DEFAULT_ENGAGEMENT: Engagement = { sessionDays: [], lifetimeSessions: 0 }

export class TintaDB extends Dexie {
  packs!: Table<StoredPack, string>
  cards!: Table<StoredCard, string>
  reviews!: Table<ReviewLogEntry, number>
  meta!: Table<MetaRow, string>

  constructor() {
    super('tinta')
    // `front` is the canonical card key (lemma). Indexes on due/state/tier/tags
    // power the review queue and the Library/Progress filters.
    this.version(1).stores({
      packs: 'pack_id, imported_at',
      cards: 'front, due, state, tier, *tags, created_at',
      reviews: '++id, cardId, ts, is_new',
      meta: 'key',
    })
  }
}

export const db = new TintaDB()

// ── Typed key/value helpers over the `meta` table ────────────────────────────

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const row = await db.meta.get(key)
  return row ? (row.value as T) : fallback
}

export async function setMeta<T>(key: string, value: T): Promise<void> {
  await db.meta.put({ key, value })
}

export async function getSettings(): Promise<Settings> {
  const s = await getMeta<Partial<Settings>>('settings', {})
  return { ...DEFAULT_SETTINGS, ...s }
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch }
  await setMeta('settings', next)
  return next
}

export async function getEngagement(): Promise<Engagement> {
  const e = await getMeta<Partial<Engagement>>('engagement', {})
  return { ...DEFAULT_ENGAGEMENT, ...e }
}

export async function setEngagement(value: Engagement): Promise<void> {
  await setMeta('engagement', value)
}
