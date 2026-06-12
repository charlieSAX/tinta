// Small, dependency-free date + interval helpers.

/** Local ISO date (yyyy-mm-dd) for the given instant. */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfToday(now: Date = new Date()): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d
}

export function isToday(ts: number, now: Date = new Date()): boolean {
  return ts >= startOfToday(now).getTime()
}

export function daysAgo(n: number, now: Date = new Date()): Date {
  const d = startOfToday(now)
  d.setDate(d.getDate() - n)
  return d
}

/**
 * A compact, human interval between two instants; used on the grade buttons
 * and the "next due" line. Sub-day intervals read in minutes / hours.
 */
export function intervalLabel(from: Date, to: Date): string {
  const ms = to.getTime() - from.getTime()
  if (ms <= 0) return 'now'
  const min = Math.round(ms / 60000)
  if (min < 1) return '<1m'
  if (min < 60) return `${min}m`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.round(hr / 24)
  if (day < 31) return `${day}d`
  const mo = Math.round(day / 30.4)
  if (mo < 12) return `${mo}mo`
  const yr = day / 365
  return `${yr >= 10 ? Math.round(yr) : yr.toFixed(1)}y`
}

/** "in 3 days", "tomorrow", "in 2 weeks"; for the session-complete card. */
export function relativeDue(to: Date, from: Date = new Date()): string {
  const ms = to.getTime() - from.getTime()
  if (ms <= 0) return 'now'
  const min = Math.round(ms / 60000)
  if (min < 60) return `in ${min} min`
  const hr = Math.round(min / 60)
  if (hr < 24) return hr === 1 ? 'in 1 hour' : `in ${hr} hours`
  const day = Math.round(hr / 24)
  if (day === 1) return 'tomorrow'
  if (day < 14) return `in ${day} days`
  if (day < 60) return `in ${Math.round(day / 7)} weeks`
  return `in ${Math.round(day / 30.4)} months`
}

/** "5 June 2026" from an ISO date string; returns the input untouched if unparseable. */
export function prettyDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
