import { useLiveQuery } from 'dexie-react-hooks'
import { db, getEngagement } from '../lib/db'
import { getDueCounts } from '../lib/queue'
import { State } from '../lib/fsrs'
import { breakdown } from '../lib/topics'
import { rollingScore } from '../lib/engagement'
import { TIERS, type Tier } from '../types'
import { Screen, PageHeader } from '../components/layout'
import { EngagementDots } from '../components/EngagementDots'
import { StatTile, Spinner } from '../components/ui'

export function Progress() {
  const counts = useLiveQuery(() => getDueCounts(), [])
  const engagement = useLiveQuery(() => getEngagement(), [])
  const cards = useLiveQuery(() => db.cards.toArray(), [])

  if (!counts || !engagement || !cards) {
    return (
      <Screen>
        <PageHeader title="Progress" kicker="Progreso" />
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      </Screen>
    )
  }

  const learnedCards = cards.filter((c) => c.state !== State.New)
  const { byTier, byTopic } = breakdown(learnedCards)
  const score = rollingScore(engagement.sessionDays)
  const tierMax = Math.max(1, ...TIERS.map((t) => byTier[t]))
  const topicMax = Math.max(1, ...byTopic.map((t) => t.count))

  return (
    <Screen>
      <PageHeader title="Progress" kicker="Progreso" />

      {/* Engagement */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="kicker">Last 7 days</div>
            <div className="tabular mt-1 font-reading text-3xl leading-none text-ink">
              {score}
              <span className="text-lg text-muted">/7</span>
            </div>
            <div className="mt-1 text-xs text-muted">days studied · no streaks, no pressure</div>
          </div>
          <div className="text-right">
            <div className="tabular font-reading text-3xl leading-none text-ink">{engagement.lifetimeSessions}</div>
            <div className="mt-1 text-xs text-muted">lifetime sessions</div>
          </div>
        </div>
        <div className="mt-4">
          <EngagementDots sessionDays={engagement.sessionDays} size={12} showWeekdays />
        </div>
      </section>

      {/* Today + totals */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <StatTile value={counts.actionable} label="Due today" accent />
        <StatTile value={counts.reviewsToday} label="Reviewed today" />
        <StatTile value={counts.learned} label="Words learned" hint={`of ${counts.total} in deck`} />
        <StatTile value={counts.newAvailable} label="New, not yet seen" hint={`${counts.newRemaining} allowed today`} />
      </div>

      {/* Tier breakdown */}
      <section className="mt-6">
        <div className="kicker mb-2">Words learned by level</div>
        {counts.learned === 0 ? (
          <p className="text-sm text-muted">Review a few cards and your level mix will appear here.</p>
        ) : (
          <div className="space-y-2.5 rounded-2xl border border-line bg-card p-4">
            {TIERS.map((t: Tier) => (
              <div key={t} className="flex items-center gap-3">
                <span className="w-7 text-sm font-semibold text-ink-soft">{t}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-500"
                    style={{ width: `${(byTier[t] / tierMax) * 100}%` }}
                  />
                </div>
                <span className="tabular w-7 text-right text-sm text-muted">{byTier[t]}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Topic breakdown */}
      {byTopic.length > 0 ? (
        <section className="mt-6">
          <div className="kicker mb-2">Words learned by topic</div>
          <div className="space-y-2.5 rounded-2xl border border-line bg-card p-4">
            {byTopic.map((t) => (
              <div key={t.key} className="flex items-center gap-3">
                <span className="w-20 truncate text-sm text-ink-soft">{t.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                  <div
                    className="h-full rounded-full bg-ink-soft transition-[width] duration-500"
                    style={{ width: `${(t.count / topicMax) * 100}%` }}
                  />
                </div>
                <span className="tabular w-7 text-right text-sm text-muted">{t.count}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </Screen>
  )
}
