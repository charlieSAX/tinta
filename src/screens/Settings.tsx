import { useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings, setSettings } from '../lib/db'
import { exportAll, importAll, resetDeck } from '../lib/backup'
import { defaultFeedUrl, pullFeed } from '../lib/feed'
import { isoDate } from '../lib/format'
import { Screen, PageHeader } from '../components/layout'
import { Button, ConfirmDialog, Divider } from '../components/ui'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { useThemeCtx } from '../theme'

const CAP_MIN = 0
const CAP_MAX = 100

export function Settings() {
  const toast = useToast()
  const { theme, setTheme } = useThemeCtx()
  const settings = useLiveQuery(() => getSettings(), [])
  const fileRef = useRef<HTMLInputElement>(null)

  const [pendingRestore, setPendingRestore] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [busy, setBusy] = useState(false)

  const cap = settings?.dailyNewCap ?? 10
  const autoPull = settings?.autoPull ?? true
  const feedUrl = settings?.feedUrl ?? ''

  function setCap(next: number) {
    const v = Math.max(CAP_MIN, Math.min(CAP_MAX, next))
    void setSettings({ dailyNewCap: v })
  }

  async function onPullNow() {
    setBusy(true)
    try {
      const r = await pullFeed()
      if (!r.reachedFeed) {
        toast.push('No feed reachable — deploy the app first, or set a feed URL below.', 'default')
      } else if (r.added > 0) {
        toast.push(`Added ${r.added} new article${r.added === 1 ? '' : 's'}.`, 'success')
      } else {
        toast.push('No new articles — you’re up to date.', 'default')
      }
    } finally {
      setBusy(false)
    }
  }

  async function onExport() {
    try {
      const json = await exportAll()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tinta-backup-${isoDate()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.push('Backup downloaded.', 'success')
    } catch (e) {
      toast.push(`Export failed — ${(e as Error).message}`, 'error')
    }
  }

  async function onRestoreConfirmed() {
    if (pendingRestore === null) return
    setBusy(true)
    try {
      const res = await importAll(pendingRestore)
      toast.push(`Restored ${res.cards} cards across ${res.packs} articles.`, 'success')
    } catch (e) {
      toast.push(`Restore failed — ${(e as Error).message}`, 'error')
    } finally {
      setBusy(false)
      setPendingRestore(null)
    }
  }

  async function onResetConfirmed() {
    setBusy(true)
    try {
      await resetDeck()
      toast.push('Deck reset — scheduling starts fresh.', 'success')
    } catch (e) {
      toast.push(`Reset failed — ${(e as Error).message}`, 'error')
    } finally {
      setBusy(false)
      setConfirmReset(false)
    }
  }

  return (
    <Screen>
      <PageHeader title="Settings" kicker="Ajustes" />

      {/* Reading mode */}
      <Group label="Reading mode">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-ink-soft">Theme</span>
          <div className="flex rounded-lg border border-line p-0.5">
            <SegBtn active={theme === 'light'} onClick={() => setTheme('light')} icon="sun" label="Light" />
            <SegBtn active={theme === 'dark'} onClick={() => setTheme('dark')} icon="moon" label="Dark" />
          </div>
        </div>
      </Group>

      {/* Study */}
      <Group label="Study">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm text-ink">New cards per day</div>
            <div className="mt-0.5 text-xs text-muted">Due reviews are always shown; this caps new introductions.</div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Fewer new cards"
              onClick={() => setCap(cap - 5)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-soft hover:border-ink-soft"
            >
              <Icon name="down" size={16} />
            </button>
            <span className="tabular w-10 text-center font-reading text-xl text-ink">{cap}</span>
            <button
              type="button"
              aria-label="More new cards"
              onClick={() => setCap(cap + 5)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-soft hover:border-ink-soft"
            >
              <Icon name="up" size={16} />
            </button>
          </div>
        </div>
      </Group>

      {/* Articles */}
      <Group label="Articles">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="pr-4">
            <div className="text-sm text-ink">Pull new articles automatically</div>
            <div className="mt-0.5 text-xs text-muted">When Tinta opens, fetch any new articles from your feed.</div>
          </div>
          <Switch checked={autoPull} onChange={() => setSettings({ autoPull: !autoPull })} label="Pull articles automatically" />
        </div>
        <Divider />
        <div className="px-4 py-3.5">
          <label htmlFor="feed-url" className="text-sm text-ink">
            Feed URL
          </label>
          <div className="mt-0.5 text-xs text-muted">Leave blank to use the built-in feed published with the app.</div>
          <div className="mt-2 flex gap-2">
            <input
              id="feed-url"
              type="url"
              inputMode="url"
              value={feedUrl}
              onChange={(e) => setSettings({ feedUrl: e.target.value })}
              placeholder={defaultFeedUrl()}
              className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-ink-soft"
            />
            <Button variant="secondary" icon="sparkle" disabled={busy} onClick={onPullNow}>
              Pull now
            </Button>
          </div>
        </div>
      </Group>

      {/* Data */}
      <Group label="Your data">
        <div className="px-4 py-3.5">
          <p className="text-sm leading-relaxed text-ink-soft">
            Everything lives on this device. Back up to a file so losing the phone never loses your
            progress — the backup restores exactly.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" icon="download" onClick={onExport}>
              Export backup
            </Button>
            <Button variant="secondary" icon="upload" onClick={() => fileRef.current?.click()}>
              Restore
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) setPendingRestore(await f.text())
                e.target.value = ''
              }}
            />
          </div>
        </div>
        <Divider />
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="pr-4">
            <div className="text-sm text-ink">Reset deck</div>
            <div className="mt-0.5 text-xs text-muted">Clears all cards and review history, then rebuilds from your articles with fresh scheduling.</div>
          </div>
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Reset
          </Button>
        </div>
      </Group>

      <p className="mt-6 text-center text-xs text-muted">
        Tinta · offline-first · {settings ? 'data stored on this device' : ''}
      </p>

      <ConfirmDialog
        open={pendingRestore !== null}
        title="Restore from backup?"
        body="This replaces everything currently in Tinta — all articles, cards, review history and settings — with the contents of the backup file. This cannot be undone."
        confirmLabel={busy ? 'Restoring…' : 'Replace & restore'}
        danger
        onConfirm={onRestoreConfirmed}
        onCancel={() => setPendingRestore(null)}
      />
      <ConfirmDialog
        open={confirmReset}
        title="Reset the deck?"
        body="All flashcards and review history are cleared, then the deck is rebuilt from your imported articles with fresh scheduling. Your articles stay; your progress resets."
        confirmLabel={busy ? 'Resetting…' : 'Reset deck'}
        danger
        onConfirm={onResetConfirmed}
        onCancel={() => setConfirmReset(false)}
      />
    </Screen>
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <div className="kicker mb-2">{label}</div>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">{children}</div>
    </section>
  )
}

function SegBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: 'sun' | 'moon'
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink-soft'
      }`}
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  )
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-accent' : 'bg-line'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
