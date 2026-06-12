import { db, getSettings } from './db'
import { State } from './fsrs'
import { startOfToday } from './format'
import type { StoredCard } from '../types'

export interface DueCounts {
  dueReviews: number // already-introduced cards due now (excluding today-banked)
  newAvailable: number // cards still in the New state
  newRemaining: number // new cards still allowed today (cap − introduced today)
  introducedToday: number
  reviewsToday: number
  actionable: number // dueReviews + min(newRemaining, newAvailable); today's queue size
  total: number
  learned: number // cards that have left the New state
}

/** A learning-phase card drilled this many times today is banked until tomorrow. */
const DAILY_DRILL_CAP = 3

/** How many brand-new cards have been introduced (first-reviewed) today. */
export async function countIntroducedToday(now: Date = new Date()): Promise<number> {
  const start = startOfToday(now).getTime()
  return db.reviews
    .where('ts')
    .aboveOrEqual(start)
    .and((r) => r.is_new)
    .count()
}

/** cardId -> times reviewed today. */
async function reviewsTodayByCard(now: Date): Promise<Map<string, number>> {
  const start = startOfToday(now).getTime()
  const rows = await db.reviews.where('ts').aboveOrEqual(start).toArray()
  const m = new Map<string, number>()
  for (const r of rows) m.set(r.cardId, (m.get(r.cardId) ?? 0) + 1)
  return m
}

/**
 * Cards in the short-interval learning phase reappear within minutes by design,
 * but past a few same-day drills repetition stops teaching. Bank those until
 * tomorrow so the session moves on to new material instead.
 */
function bankedToday(c: StoredCard, todayCount: number): boolean {
  const learning = c.state === State.Learning || c.state === State.Relearning
  return learning && todayCount >= DAILY_DRILL_CAP
}

export async function getDueCounts(now: Date = new Date()): Promise<DueCounts> {
  const start = startOfToday(now).getTime()
  const [cards, settings, introducedToday, reviewsToday, perCard] = await Promise.all([
    db.cards.toArray(),
    getSettings(),
    countIntroducedToday(now),
    db.reviews.where('ts').aboveOrEqual(start).count(),
    reviewsTodayByCard(now),
  ])

  let dueReviews = 0
  let newAvailable = 0
  let learned = 0
  const t = now.getTime()
  for (const c of cards) {
    if (c.state === State.New) {
      newAvailable += 1
    } else {
      learned += 1
      if (c.due.getTime() <= t && !bankedToday(c, perCard.get(c.front) ?? 0)) dueReviews += 1
    }
  }
  const newRemaining = Math.max(0, settings.dailyNewCap - introducedToday)
  const actionable = dueReviews + Math.min(newRemaining, newAvailable)
  return {
    dueReviews,
    newAvailable,
    newRemaining,
    introducedToday,
    reviewsToday,
    actionable,
    total: cards.length,
    learned,
  }
}

/**
 * The unified review queue across all packs:
 * - due reviews (oldest due first), minus cards already drilled enough today;
 * - new cards up to the daily allowance, preferring vocab from the articles
 *   read most recently, interleaved through the due cards (one new per three
 *   reviews) so every session reaches fresh material.
 */
export async function buildQueue(now: Date = new Date()): Promise<StoredCard[]> {
  const [cards, packs, settings, introducedToday, perCard] = await Promise.all([
    db.cards.toArray(),
    db.packs.toArray(),
    getSettings(),
    countIntroducedToday(now),
    reviewsTodayByCard(now),
  ])
  const t = now.getTime()
  const due = cards
    .filter((c) => c.state !== State.New && c.due.getTime() <= t && !bankedToday(c, perCard.get(c.front) ?? 0))
    .sort((a, b) => a.due.getTime() - b.due.getTime())

  // New-card priority: vocab from the most recently opened articles first.
  const openedAt = new Map<string, number>()
  for (const p of packs) if (p.last_opened_at) openedAt.set(p.pack_id, p.last_opened_at)
  const recency = (c: StoredCard) => Math.max(0, ...c.sources.map((s) => openedAt.get(s) ?? 0))

  const newRemaining = Math.max(0, settings.dailyNewCap - introducedToday)
  const fresh = cards
    .filter((c) => c.state === State.New)
    .sort((a, b) => recency(b) - recency(a) || a.created_at - b.created_at)
    .slice(0, newRemaining)

  // Interleave: three due cards, then a new one, so new words arrive early
  // instead of hiding behind the whole review backlog.
  const out: StoredCard[] = []
  let d = 0
  let n = 0
  while (d < due.length || n < fresh.length) {
    for (let k = 0; k < 3 && d < due.length; k++) out.push(due[d++])
    if (n < fresh.length) out.push(fresh[n++])
  }
  return out
}
