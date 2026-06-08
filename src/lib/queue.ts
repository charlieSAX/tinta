import { db, getSettings } from './db'
import { State } from './fsrs'
import { startOfToday } from './format'
import type { StoredCard } from '../types'

export interface DueCounts {
  dueReviews: number // already-introduced cards due now
  newAvailable: number // cards still in the New state
  newRemaining: number // new cards still allowed today (cap − introduced today)
  introducedToday: number
  reviewsToday: number
  actionable: number // dueReviews + min(newRemaining, newAvailable) — today's queue size
  total: number
  learned: number // cards that have left the New state
}

/** How many brand-new cards have been introduced (first-reviewed) today. */
export async function countIntroducedToday(now: Date = new Date()): Promise<number> {
  const start = startOfToday(now).getTime()
  return db.reviews
    .where('ts')
    .aboveOrEqual(start)
    .and((r) => r.is_new)
    .count()
}

export async function getDueCounts(now: Date = new Date()): Promise<DueCounts> {
  const start = startOfToday(now).getTime()
  const [cards, settings, introducedToday, reviewsToday] = await Promise.all([
    db.cards.toArray(),
    getSettings(),
    countIntroducedToday(now),
    db.reviews.where('ts').aboveOrEqual(start).count(),
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
      if (c.due.getTime() <= t) dueReviews += 1
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
 * The unified review queue across all packs: due reviews first (oldest due
 * first), then up to the remaining daily allowance of new cards (oldest first).
 */
export async function buildQueue(now: Date = new Date()): Promise<StoredCard[]> {
  const [cards, settings, introducedToday] = await Promise.all([
    db.cards.toArray(),
    getSettings(),
    countIntroducedToday(now),
  ])
  const t = now.getTime()
  const due = cards
    .filter((c) => c.state !== State.New && c.due.getTime() <= t)
    .sort((a, b) => a.due.getTime() - b.due.getTime())

  const newRemaining = Math.max(0, settings.dailyNewCap - introducedToday)
  const fresh = cards
    .filter((c) => c.state === State.New)
    .sort((a, b) => a.created_at - b.created_at)
    .slice(0, newRemaining)

  return [...due, ...fresh]
}
