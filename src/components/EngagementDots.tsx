import { rollingWindow } from '../lib/engagement'

/** Seven quiet dots: one per day in the rolling window, filled when active. */
export function EngagementDots({
  sessionDays,
  size = 9,
  showWeekdays = false,
}: {
  sessionDays: string[]
  size?: number
  showWeekdays?: boolean
}) {
  const dots = rollingWindow(sessionDays)
  const score = dots.filter((d) => d.active).length
  return (
    <div className="flex items-end gap-1.5" role="img" aria-label={`${score} of 7 recent days studied`}>
      {dots.map((d) => (
        <div key={d.date} className="flex flex-col items-center gap-1">
          <span
            title={`${d.weekday}${d.isToday ? ' · today' : ''}${d.active ? ' · studied' : ''}`}
            className="rounded-full transition-colors"
            style={{
              width: size,
              height: size,
              background: d.active ? 'var(--accent)' : 'transparent',
              border: `1.5px solid ${d.active ? 'var(--accent)' : 'var(--line)'}`,
              boxShadow: d.isToday ? '0 0 0 2.5px var(--accent-soft)' : 'none',
            }}
          />
          {showWeekdays ? (
            <span className={`text-[0.5625rem] ${d.isToday ? 'text-ink-soft' : 'text-muted'}`}>
              {d.weekday.slice(0, 1)}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}
