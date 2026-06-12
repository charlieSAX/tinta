import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getEngagement } from '../lib/db'
import { getDueCounts } from '../lib/queue'
import { State } from '../lib/fsrs'
import { deletePack } from '../lib/packs'
import { pullFeed } from '../lib/feed'
import { packMatchesFilters, packTopics, TOPICS } from '../lib/topics'
import { prettyDate } from '../lib/format'
import { rollingScore } from '../lib/engagement'
import { TIERS, type StoredCard, type StoredPack, type Tier } from '../types'
import { useNav } from '../nav'
import { useToast } from '../components/Toast'
import { Screen, PageHeader } from '../components/layout'
import { EngagementDots } from '../components/EngagementDots'
import { Button, Chip, ConfirmDialog, IconButton, Spinner } from '../components/ui'
import { Icon } from '../components/Icon'

export function Library() {
  const { go } = useNav()
  const toast = useToast()
  const now = useMemo(() => new Date(), [])

  const packs = useLiveQuery(() => db.packs.orderBy('imported_at').reverse().toArray(), [])
  const cards = useLiveQuery(() => db.cards.toArray(), [])
  const counts = useLiveQuery(() => getDueCounts(), [])
  const engagement = useLiveQuery(() => getEngagement(), [])

  const [activeTopics, setActiveTopics] = useState<Set<string>>(new Set())
  const [activeTiers, setActiveTiers] = useState<Set<Tier>>(new Set())
  const [toDelete, setToDelete] = useState<StoredPack | null>(null)
  const [pulling, setPulling] = useState(false)

  const cardsByPack = useMemo(() => {
    const map = new Map<string, StoredCard[]>()
    for (const c of cards ?? []) {
      for (const src of c.sources) {
        const arr = map.get(src) ?? []
        arr.push(c)
        map.set(src, arr)
      }
    }
    return map
  }, [cards])

  const filtersActive = activeTopics.size > 0 || activeTiers.size > 0
  const filteredPacks = useMemo(
    () => (packs ?? []).filter((p) => packMatchesFilters(p, activeTopics, activeTiers)),
    [packs, activeTopics, activeTiers],
  )

  function toggleTopic(key: string) {
    setActiveTopics((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }
  function toggleTier(t: Tier) {
    setActiveTiers((prev) => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
  }

  const due = counts?.actionable ?? 0
  const learned = counts?.learned ?? 0
  const score = engagement ? rollingScore(engagement.sessionDays) : 0

  async function confirmDelete() {
    if (!toDelete) return
    const title = toDelete.meta.title
    await deletePack(toDelete.pack_id)
    setToDelete(null)
    toast.push(`Removed "${title}".`, 'default')
  }

  async function handlePull() {
    setPulling(true)
    try {
      const r = await pullFeed()
      if (!r.reachedFeed) {
        toast.push('No feed reachable yet. Deploy the app first, or set a feed URL in Settings.', 'default')
      } else if (r.added > 0 || r.updated > 0) {
        const parts = []
        if (r.added > 0) parts.push(`${r.added} new article${r.added === 1 ? '' : 's'}`)
        if (r.updated > 0) parts.push(`${r.updated} updated`)
        toast.push(`${parts.join(', ')}${r.cards ? ` · ${r.cards} new cards` : ''}.`, 'success')
      } else {
        toast.push('No new articles right now. You are up to date.', 'default')
      }
    } finally {
      setPulling(false)
    }
  }

  return (
    <Screen>
      <PageHeader
        title="Tinta"
        kicker="Biblioteca · Spanish reading & review"
        right={<IconButton icon="plus" label="Import a study pack" onClick={() => go({ name: 'import' })} />}
      />

      {/* Top strip: due · learned · engagement */}
      <section className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-soft">
        <div>
          <div className="tabular font-reading text-3xl leading-none text-accent">{due}</div>
          <div className="mt-1 text-[0.75rem] font-medium text-ink-soft">Due today</div>
        </div>
        <div>
          <div className="tabular font-reading text-3xl leading-none text-ink">{learned}</div>
          <div className="mt-1 text-[0.75rem] font-medium text-ink-soft">Words learned</div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <EngagementDots sessionDays={engagement?.sessionDays ?? []} />
          <div className="text-[0.6875rem] text-muted">{score}/7 days</div>
        </div>
      </section>

      {/* Primary action */}
      <div className="mt-3 space-y-2">
        <Button variant={due > 0 ? 'primary' : 'secondary'} block onClick={() => go({ name: 'review' })} className="py-3 text-base">
          <Icon name="review" size={19} />
          {due > 0 ? `Review due (${due})` : 'Study (nothing due)'}
        </Button>
        <Button variant="ghost" block onClick={handlePull} disabled={pulling}>
          <Icon name="sparkle" size={18} />
          {pulling ? 'Checking for new articles…' : 'Get new articles'}
        </Button>
      </div>

      {/* Filters */}
      {(packs?.length ?? 0) > 0 ? (
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="kicker">Filter</span>
            {filtersActive ? (
              <button
                type="button"
                onClick={() => {
                  setActiveTopics(new Set())
                  setActiveTiers(new Set())
                }}
                className="text-xs font-medium text-accent"
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TOPICS.map((t) => (
              <Chip key={t.key} active={activeTopics.has(t.key)} onClick={() => toggleTopic(t.key)}>
                {t.label}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2">
            {TIERS.map((t) => (
              <Chip key={t} active={activeTiers.has(t)} onClick={() => toggleTier(t)}>
                {t}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      {/* Pack list */}
      <div className="mt-5 space-y-2.5">
        {packs === undefined ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : packs.length === 0 ? (
          <EmptyLibrary onImport={() => go({ name: 'import' })} onGetNew={handlePull} pulling={pulling} />
        ) : filteredPacks.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No articles match these filters.</p>
        ) : (
          filteredPacks.map((p, i) => (
            <PackRow
              key={p.pack_id}
              index={i}
              pack={p}
              cards={cardsByPack.get(p.pack_id) ?? []}
              now={now}
              onOpen={() => go({ name: 'reader', packId: p.pack_id })}
              onDelete={() => setToDelete(p)}
            />
          ))
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Remove this article?"
        body={
          <>
            This removes “{toDelete?.meta.title}” and any flashcards that came only from it. Cards shared
            with other articles are kept. Review history is unaffected.
          </>
        }
        confirmLabel="Remove"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Screen>
  )
}

function PackRow({
  pack,
  cards,
  now,
  index = 0,
  onOpen,
  onDelete,
}: {
  pack: StoredPack
  cards: StoredCard[]
  now: Date
  index?: number
  onOpen: () => void
  onDelete: () => void
}) {
  const t = now.getTime()
  const dueCount = cards.filter((c) => c.state !== State.New && c.due.getTime() <= t).length
  const topics = packTopics(pack)
  const kicker = [pack.meta.source, prettyDate(pack.meta.date_published)].filter(Boolean).join(' · ')

  return (
    <div
      className="group pressable animate-fade-up relative rounded-2xl border border-line bg-card transition-colors hover:border-ink-soft hover:shadow-soft"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <button type="button" onClick={onOpen} className="block w-full px-4 py-3.5 text-left">
        {kicker ? <div className="kicker mb-1">{kicker}</div> : null}
        <div className="flex items-start gap-3">
          <h2 className="min-w-0 flex-1 font-reading text-[1.0625rem] leading-snug text-ink">
            {pack.meta.title}
          </h2>
          <Icon name="right" size={18} className="mt-0.5 shrink-0 text-muted" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
          <span>{cards.length} cards</span>
          {dueCount > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span className="font-semibold text-accent">{dueCount} due</span>
            </>
          ) : null}
          {pack.meta.level ? (
            <>
              <span aria-hidden>·</span>
              <span className="rounded border border-line px-1.5 py-0.5 font-medium text-ink-soft">{pack.meta.level}</span>
            </>
          ) : null}
          {topics.slice(0, 2).map((key) => (
            <span key={key} className="capitalize text-muted">
              {TOPICS.find((x) => x.key === key)?.label}
            </span>
          ))}
          {pack.is_sample ? <span className="text-muted">· sample</span> : null}
        </div>
      </button>
      <div className="absolute bottom-2 right-2">
        <IconButton icon="trash" label={`Remove ${pack.meta.title}`} size={16} onClick={onDelete} className="h-9 w-9 opacity-50 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 sm:opacity-0" />
      </div>
    </div>
  )
}

function EmptyLibrary({
  onImport,
  onGetNew,
  pulling,
}: {
  onImport: () => void
  onGetNew: () => void
  pulling: boolean
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon name="inbox" size={24} />
      </div>
      <h2 className="font-reading text-xl text-ink">Your library is empty</h2>
      <p className="mx-auto mt-2 max-w-[34ch] text-sm leading-relaxed text-ink-soft">
        Tinta turns Spanish articles into spaced-repetition study. Pull in a fresh batch, or import a
        study pack you already have.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button variant="primary" icon="sparkle" onClick={onGetNew} disabled={pulling}>
          {pulling ? 'Checking…' : 'Get new articles'}
        </Button>
        <Button variant="ghost" icon="plus" onClick={onImport}>
          Import a pack
        </Button>
      </div>
    </div>
  )
}
