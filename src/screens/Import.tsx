import { useRef, useState } from 'react'
import { importPack, parseAndValidate, type ImportResult } from '../lib/packs'
import { useNav } from '../nav'
import { useToast } from '../components/Toast'
import { Screen, PageHeader } from '../components/layout'
import { Button } from '../components/ui'
import { Icon } from '../components/Icon'

const PLACEHOLDER = `{
  "pack_id": "2026-06-08-...",
  "meta": { "title": "…", "source": "NYT en Español", "date_published": "2026-06-05", "tags": ["politica"], "level": "B2" },
  "summary_en": "…",
  "resumen_es": "…",
  "vocab": [
    { "front": "arancel", "back": "tariff", "example": "…", "tier": "B2", "tags": ["economia"] }
  ]
}`

export function Import() {
  const { back, go } = useNav()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function runImport(raw: string) {
    setErrors([])
    setResult(null)
    const parsed = parseAndValidate(raw)
    if (!parsed.ok) {
      setErrors(parsed.errors)
      return
    }
    setBusy(true)
    try {
      const res = await importPack(parsed.pack)
      setResult(res)
      const skipped = res.skipped > 0 ? ` (${res.skipped} already known, skipped)` : ''
      toast.push(`Added ${res.added} new card${res.added === 1 ? '' : 's'} from “${res.title}”${skipped}.`, 'success')
    } catch (e) {
      setErrors([`Couldn't save the pack: ${(e as Error).message}`])
    } finally {
      setBusy(false)
    }
  }

  async function onFile(file: File) {
    try {
      const content = await file.text()
      setText(content)
      await runImport(content)
    } catch {
      setErrors(['Could not read that file.'])
    }
  }

  async function onFetchUrl() {
    if (!url.trim()) return
    setErrors([])
    setResult(null)
    setBusy(true)
    try {
      const res = await fetch(url.trim())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const content = await res.text()
      setText(content)
      await runImport(content)
    } catch (e) {
      setErrors([
        `Couldn't fetch that URL: ${(e as Error).message}.`,
        'Tip: the file must allow cross-origin requests (a raw Gist or GitHub raw URL works). Otherwise paste the JSON above.',
      ])
      setBusy(false)
    }
  }

  return (
    <Screen>
      <PageHeader title="Import a study pack" kicker="Add to library" onBack={back} />

      {result ? (
        <SuccessCard
          result={result}
          onReadIt={() => go({ name: 'reader', packId: result.pack_id })}
          onReview={() => go({ name: 'review' })}
          onAnother={() => {
            setResult(null)
            setText('')
          }}
        />
      ) : (
        <>
          <p className="text-sm leading-relaxed text-ink-soft">
            Paste a study pack’s JSON, or load it from a file. New vocabulary is added to your deck; words
            you already have are skipped. The article’s reading content is stored for the reader.
          </p>

          <label htmlFor="pack-json" className="kicker mt-5 block">
            Pack JSON
          </label>
          <textarea
            id="pack-json"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            placeholder={PLACEHOLDER}
            className="mt-2 h-56 w-full resize-y rounded-xl border border-line bg-card p-3 font-mono text-[0.8125rem] leading-relaxed text-ink outline-none placeholder:text-muted focus:border-ink-soft"
          />

          {errors.length > 0 ? (
            <div className="mt-3 rounded-xl border border-line bg-accent-soft p-3" style={{ borderLeft: '3px solid var(--again)' }}>
              <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-again">
                <Icon name="x" size={15} /> Couldn’t import this pack
              </div>
              <ul className="ml-1 space-y-0.5 text-[0.8125rem] text-ink-soft">
                {errors.map((e, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span aria-hidden className="text-muted">
                      •
                    </span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            <Button variant="primary" block icon="check" disabled={busy || !text.trim()} onClick={() => runImport(text)}>
              {busy ? 'Importing…' : 'Import pack'}
            </Button>
            <Button variant="secondary" icon="file" onClick={() => fileRef.current?.click()}>
              File
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onFile(f)
                e.target.value = ''
              }}
            />
          </div>

          <details className="mt-5 rounded-xl border border-line bg-card">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-ink-soft">
              <Icon name="link" size={16} /> Load from a URL
            </summary>
            <div className="flex gap-2 px-4 pb-4">
              <input
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…/pack.json"
                className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-ink-soft"
              />
              <Button variant="secondary" disabled={busy || !url.trim()} onClick={onFetchUrl}>
                Fetch
              </Button>
            </div>
          </details>
        </>
      )}
    </Screen>
  )
}

function SuccessCard({
  result,
  onReadIt,
  onReview,
  onAnother,
}: {
  result: ImportResult
  onReadIt: () => void
  onReview: () => void
  onAnother: () => void
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-good">
        <Icon name="check" size={22} />
      </div>
      <h2 className="font-reading text-xl text-ink">Added to your library</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        <span className="font-semibold text-ink">{result.added}</span> new card
        {result.added === 1 ? '' : 's'} from “{result.title}”
        {result.skipped > 0 ? (
          <>
            {' '}
            · <span className="text-muted">{result.skipped} already known, skipped</span>
          </>
        ) : null}
        .
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="primary" icon="book" onClick={onReadIt}>
          Read it
        </Button>
        <Button variant="secondary" icon="review" onClick={onReview}>
          Review now
        </Button>
        <Button variant="ghost" icon="plus" onClick={onAnother}>
          Import another
        </Button>
      </div>
    </div>
  )
}
