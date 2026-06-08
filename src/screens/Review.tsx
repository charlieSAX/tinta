import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { buildQueue } from '../lib/queue'
import { applyGrade, GRADE_LABEL, GRADES, intervalPreview, Rating, State, type Grade } from '../lib/fsrs'
import { recordSessionComplete } from '../lib/engagement'
import { intervalLabel, relativeDue } from '../lib/format'
import type { StoredCard } from '../types'
import { useNav } from '../nav'
import { useToast } from '../components/Toast'
import { Screen } from '../components/layout'
import { Button, IconButton, Spinner } from '../components/ui'
import { Icon } from '../components/Icon'

type Phase = 'loading' | 'studying' | 'caughtup' | 'done'

const GRADE_COLOR: Record<Grade, string> = {
  [Rating.Again]: 'var(--again)',
  [Rating.Hard]: 'var(--hard)',
  [Rating.Good]: 'var(--good)',
  [Rating.Easy]: 'var(--easy)',
}

export function Review() {
  const { root } = useNav()
  const toast = useToast()

  const [phase, setPhase] = useState<Phase>('loading')
  const [queue, setQueue] = useState<StoredCard[]>([])
  const [revealed, setRevealed] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const [nextDue, setNextDue] = useState<Date | null>(null)
  const startedRef = useRef(false)

  const packTitles =
    useLiveQuery(async () => {
      const ps = await db.packs.toArray()
      const m: Record<string, string> = {}
      for (const p of ps) m[p.pack_id] = p.meta.title
      return m
    }, []) ?? {}

  // Build the session queue once.
  useEffect(() => {
    let alive = true
    buildQueue().then((q) => {
      if (!alive) return
      if (q.length === 0) {
        setPhase('caughtup')
      } else {
        startedRef.current = true
        setQueue(q)
        setPhase('studying')
      }
    })
    return () => {
      alive = false
    }
  }, [])

  const current = queue[0] as StoredCard | undefined
  const previews = useMemo(
    () => (current && revealed ? intervalPreview(current) : null),
    [current, revealed],
  )

  async function finish() {
    const all = await db.cards.toArray()
    const now = Date.now()
    const upcoming = all.map((c) => c.due.getTime()).filter((t) => t > now)
    setNextDue(upcoming.length ? new Date(Math.min(...upcoming)) : null)
    await recordSessionComplete()
    setPhase('done')
  }

  function grade(rating: Grade) {
    if (!current || !revealed) return
    const now = new Date()
    const wasNew = current.state === State.New
    const out = applyGrade(current, rating, now)
    const firstReviewedAt = current.first_reviewed_at ?? (wasNew ? now.getTime() : undefined)
    const updated: StoredCard = { ...current, ...out.next, first_reviewed_at: firstReviewedAt }

    // Persist FSRS state + the review log (background; ordered by IndexedDB).
    const writes = (async () => {
      await db.cards.update(current.front, { ...out.next, first_reviewed_at: firstReviewedAt })
      await db.reviews.add({
        cardId: current.front,
        ts: now.getTime(),
        rating,
        state: out.state,
        scheduled_days: out.scheduled_days,
        is_new: wasNew,
      })
    })().catch((e) => toast.push(`Couldn't save that review — ${(e as Error).message}`, 'error'))

    setReviewed((r) => r + 1)
    setRevealed(false)

    const rest = queue.slice(1)
    if (rating === Rating.Again) {
      // Bring the card back later this session.
      const pos = Math.min(rest.length, 2)
      setQueue([...rest.slice(0, pos), updated, ...rest.slice(pos)])
    } else if (rest.length === 0) {
      void writes.then(finish)
    } else {
      setQueue(rest)
    }
  }

  // Keyboard: space/enter reveals, 1–4 grade.
  useEffect(() => {
    if (phase !== 'studying') return
    const onKey = (e: KeyboardEvent) => {
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        setRevealed(true)
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        grade(GRADES[Number(e.key) - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, revealed, queue])

  if (phase === 'loading') {
    return (
      <Screen>
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      </Screen>
    )
  }

  if (phase === 'caughtup' || phase === 'done') {
    return (
      <Screen>
        <ReviewBar reviewed={reviewed} left={0} onClose={() => root({ name: 'library' })} />
        <Completion
          done={phase === 'done'}
          reviewed={reviewed}
          nextDue={nextDue}
          onLibrary={() => root({ name: 'library' })}
          onProgress={() => root({ name: 'progress' })}
        />
      </Screen>
    )
  }

  return (
    <Screen>
      <ReviewBar reviewed={reviewed} left={queue.length} onClose={() => root({ name: 'library' })} />
      {current ? (
        <CardView
          card={current}
          revealed={revealed}
          previews={previews}
          packTitle={packTitles[current.sources[0]] ?? ''}
          onReveal={() => setRevealed(true)}
          onGrade={grade}
        />
      ) : null}
    </Screen>
  )
}

function ReviewBar({ reviewed, left, onClose }: { reviewed: number; left: number; onClose: () => void }) {
  return (
    <header
      className="sticky top-0 z-30 -mx-5 mb-2 flex items-center justify-between border-b border-line bg-paper px-3 py-2"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.25rem)' }}
    >
      <IconButton icon="x" label="End session" onClick={onClose} />
      <div className="tabular text-xs font-medium text-muted">
        {reviewed} reviewed{left > 0 ? ` · ${left} left` : ''}
      </div>
      <span className="w-11" />
    </header>
  )
}

function CardView({
  card,
  revealed,
  previews,
  packTitle,
  onReveal,
  onGrade,
}: {
  card: StoredCard
  revealed: boolean
  previews: Record<Grade, Date> | null
  packTitle: string
  onReveal: () => void
  onGrade: (g: Grade) => void
}) {
  const now = new Date()
  return (
    <div className="flex min-h-[68vh] flex-col">
      {/* The card */}
      <div
        className="flex flex-1 items-center justify-center"
        onClick={() => {
          if (!revealed) onReveal()
        }}
        role={revealed ? undefined : 'button'}
        aria-label={revealed ? undefined : 'Reveal the answer'}
      >
        <div key={card.front + String(revealed)} className="animate-fade-in w-full text-center">
          <div className="font-reading text-[2.5rem] font-medium leading-tight text-ink">{card.front}</div>
          {card.pos ? <div className="mt-2 text-xs uppercase tracking-wide text-muted">{card.pos}</div> : null}

          {revealed ? (
            <div className="mx-auto mt-6 max-w-[46ch] animate-fade-up">
              <hr className="hr mx-auto mb-5 w-10" />
              <p className="text-[1.0625rem] leading-relaxed text-ink-soft">{card.back}</p>
              {card.example ? (
                <p className="mt-3 font-reading text-[1.0625rem] italic leading-relaxed text-muted">{card.example}</p>
              ) : null}
              <div className="mt-5 flex items-center justify-center gap-2 text-[0.6875rem] text-muted">
                <span className="rounded border border-line px-1.5 py-0.5 font-semibold">{card.tier}</span>
                {packTitle ? <span className="max-w-[28ch] truncate">{packTitle}</span> : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Action area */}
      <div className="pt-4">
        {!revealed ? (
          <Button variant="primary" block onClick={onReveal} className="py-3 text-base">
            Show answer
          </Button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGrade(g)}
                className="flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-xl border bg-card py-2 transition-colors active:scale-[0.98]"
                style={{ borderColor: GRADE_COLOR[g] }}
              >
                <span className="text-sm font-bold" style={{ color: GRADE_COLOR[g] }}>
                  {GRADE_LABEL[g]}
                </span>
                {previews ? (
                  <span className="tabular text-[0.6875rem] text-muted">{intervalLabel(now, previews[g])}</span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Completion({
  done,
  reviewed,
  nextDue,
  onLibrary,
  onProgress,
}: {
  done: boolean
  reviewed: number
  nextDue: Date | null
  onLibrary: () => void
  onProgress: () => void
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-good">
        <Icon name="check" size={28} />
      </div>
      <h1 className="font-reading text-2xl text-ink">{done ? 'Session complete' : 'You’re all caught up'}</h1>
      <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-ink-soft">
        {done ? (
          <>
            You reviewed <span className="font-semibold text-ink">{reviewed}</span> card
            {reviewed === 1 ? '' : 's'}.{' '}
            {nextDue ? `Next review ${relativeDue(nextDue)}.` : 'Nothing else is scheduled yet.'}
          </>
        ) : (
          'No reviews are due right now. Import an article or come back later.'
        )}
      </p>
      <div className="mt-6 flex gap-2">
        <Button variant="primary" icon="library" onClick={onLibrary}>
          Library
        </Button>
        <Button variant="secondary" icon="progress" onClick={onProgress}>
          Progress
        </Button>
      </div>
    </div>
  )
}
