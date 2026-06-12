import { getEngagement, setEngagement } from './db'
import { daysAgo, isoDate } from './format'

/**
 * Record that a session completed today. At most one engagement point per
 * calendar day (the day is a set member); lifetime sessions counts every
 * completed session. Missing days never subtract; there are no streaks.
 */
export async function recordSessionComplete(now: Date = new Date()): Promise<void> {
  const eng = await getEngagement()
  const set = new Set(eng.sessionDays)
  set.add(isoDate(now))
  const cutoff = isoDate(daysAgo(120, now))
  const sessionDays = [...set].filter((d) => d >= cutoff).sort()
  await setEngagement({ sessionDays, lifetimeSessions: eng.lifetimeSessions + 1 })
}

export interface Dot {
  date: string
  weekday: string
  active: boolean
  isToday: boolean
}

/** The rolling window (default 7 days), oldest → newest, for the dot strip. */
export function rollingWindow(sessionDays: string[], now: Date = new Date(), span = 7): Dot[] {
  const active = new Set(sessionDays)
  const today = isoDate(now)
  const out: Dot[] = []
  for (let i = span - 1; i >= 0; i--) {
    const d = daysAgo(i, now)
    const iso = isoDate(d)
    out.push({
      date: iso,
      weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      active: active.has(iso),
      isToday: iso === today,
    })
  }
  return out
}

export function rollingScore(sessionDays: string[], now: Date = new Date(), span = 7): number {
  return rollingWindow(sessionDays, now, span).filter((d) => d.active).length
}
