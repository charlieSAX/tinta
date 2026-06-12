import { useEffect, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { stop as stopSpeech } from '../lib/speech'
import { prettyDate } from '../lib/format'
import { packTopics, TOPICS } from '../lib/topics'
import { useNav } from '../nav'
import { Screen } from '../components/layout'
import { IconButton, Spinner } from '../components/ui'
import { Icon } from '../components/Icon'
import { SpeakButton } from '../components/SpeakButton'
import type { StoredPack } from '../types'

export function Reader({ packId }: { packId: string }) {
  const { back } = useNav()
  const pack = useLiveQuery(() => db.packs.get(packId), [packId])

  // Leaving the article always silences it.
  useEffect(() => () => stopSpeech(), [packId])

  // Remember when this article was read; new flashcards from recently read
  // articles are introduced first.
  useEffect(() => {
    void db.packs.update(packId, { last_opened_at: Date.now() })
  }, [packId])

  if (pack === undefined) {
    return (
      <Screen>
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      </Screen>
    )
  }
  if (pack === null) {
    return (
      <Screen>
        <ReaderBar onBack={back} url={undefined} />
        <p className="py-20 text-center text-sm text-muted">That article is no longer in your library.</p>
      </Screen>
    )
  }

  return (
    <Screen>
      <ReaderBar onBack={back} url={pack.meta.url} />
      <ArticleBody pack={pack} />
    </Screen>
  )
}

function ReaderBar({ onBack, url }: { onBack: () => void; url?: string }) {
  return (
    <header
      className="sticky top-0 z-30 -mx-5 mb-4 flex items-center justify-between border-b border-line bg-paper px-3 py-2"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.25rem)' }}
    >
      <IconButton icon="back" label="Back to library" onClick={onBack} />
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open the original article"
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-soft hover:text-ink"
        >
          Original <Icon name="external" size={16} />
        </a>
      ) : (
        <span />
      )}
    </header>
  )
}

function ArticleBody({ pack }: { pack: StoredPack }) {
  const { meta } = pack
  const kicker = [meta.source, prettyDate(meta.date_published)].filter(Boolean).join(' · ')
  const topics = packTopics(pack)

  return (
    <article className="animate-fade-in pb-4">
      {kicker ? <div className="kicker">{kicker}</div> : null}
      <h1 className="mt-2 font-reading text-[1.875rem] font-medium leading-[1.18] text-ink">{meta.title}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
        {meta.level ? <span className="rounded border border-line px-1.5 py-0.5 font-medium text-ink-soft">{meta.level}</span> : null}
        {meta.length_words ? <span>{meta.length_words} words</span> : null}
        {topics.map((key) => (
          <span key={key}>{TOPICS.find((x) => x.key === key)?.label}</span>
        ))}
      </div>

      {pack.summary_en ? (
        <Section label="In English">
          <p className="font-reading text-[1.0625rem] leading-relaxed text-ink-soft">{pack.summary_en}</p>
        </Section>
      ) : null}

      {pack.resumen_es ? (
        <Section
          label="Resumen, read this to check yourself"
          action={<SpeakButton id={`resumen:${pack.pack_id}`} text={pack.resumen_es} label="the resumen" variant="block" />}
        >
          <div className="rounded-2xl border border-line bg-card p-4 shadow-soft" style={{ borderLeft: '3px solid var(--accent)' }}>
            {splitParagraphs(pack.resumen_es).map((p, i) => (
              <p key={i} className="reading">{p}</p>
            ))}
          </div>
        </Section>
      ) : null}

      {pack.vocab.length > 0 ? (
        <Section label="Glossary" count={pack.vocab.length}>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {pack.vocab.map((v, i) => (
              <li key={`${v.front}-${i}`} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-reading text-[1.0625rem] font-medium text-ink">{v.front}</span>
                  {v.pos ? <span className="text-[0.6875rem] uppercase tracking-wide text-muted">{v.pos}</span> : null}
                  <span className="ml-auto flex items-center gap-1.5">
                    {v.tier ? <span className="rounded border border-line px-1.5 py-0.5 text-[0.625rem] font-semibold text-muted">{v.tier}</span> : null}
                    <SpeakButton id={`vocab:${pack.pack_id}:${i}`} text={v.front} label={v.front} />
                  </span>
                </div>
                <div className="mt-0.5 text-[0.9375rem] text-ink-soft">{v.back}</div>
                {v.example ? (
                  <div className="mt-1 flex items-start gap-1.5">
                    <p className="flex-1 font-reading text-[0.9375rem] italic text-muted">{v.example}</p>
                    <SpeakButton id={`vocab-ex:${pack.pack_id}:${i}`} text={v.example} label={`example for ${v.front}`} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {pack.grammar && pack.grammar.length > 0 ? (
        <Section label="Grammar highlights" count={pack.grammar.length}>
          <div className="space-y-2">
            {pack.grammar.map((g, i) => (
              <details key={i} className="group overflow-hidden rounded-2xl border border-line bg-card">
                <summary className="flex cursor-pointer items-start gap-2 px-4 py-3">
                  <Icon name="down" size={16} className="mt-1 shrink-0 text-muted transition-transform group-open:rotate-180" />
                  <span className="font-reading text-[1.0625rem] italic leading-snug text-ink">{g.sentence || g.point}</span>
                </summary>
                <div className="space-y-2 px-4 pb-4 pl-10 text-sm leading-relaxed">
                  <p className="font-semibold text-ink">{g.point}</p>
                  {g.explanation ? <p className="text-ink-soft">{g.explanation}</p> : null}
                  {g.why_tricky ? (
                    <p className="text-muted">
                      <span className="kicker mr-1.5 inline">Why it’s tricky</span>
                      {g.why_tricky}
                    </p>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        </Section>
      ) : null}

      {pack.idioms && pack.idioms.length > 0 ? (
        <Section label="Idioms & collocations" count={pack.idioms.length}>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {pack.idioms.map((it, i) => (
              <li key={i} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-reading text-[1.0625rem] font-medium text-ink">{it.phrase}</span>
                  <span className="ml-auto">
                    <SpeakButton id={`idiom:${pack.pack_id}:${i}`} text={it.phrase} label={it.phrase} />
                  </span>
                </div>
                {it.meaning ? <div className="mt-0.5 text-[0.9375rem] text-ink-soft">{it.meaning}</div> : null}
                {it.example ? <p className="mt-1 font-reading text-[0.9375rem] italic text-muted">{it.example}</p> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {pack.comprehension && pack.comprehension.length > 0 ? (
        <Section label="Comprehension">
          <ol className="space-y-2.5">
            {pack.comprehension.map((c, i) => (
              <li key={i} className="flex gap-3">
                <span className="tabular mt-0.5 font-reading text-sm text-muted">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-reading text-[1.0625rem] leading-snug text-ink">{c.q}</p>
                  {c.type ? <span className="text-[0.6875rem] uppercase tracking-wide text-muted">{c.type}</span> : null}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {pack.opinion_prompt ? (
        <Section label="Write">
          <div className="rounded-2xl bg-accent-soft p-4">
            <p className="font-reading text-[1.0625rem] italic leading-relaxed text-ink">{pack.opinion_prompt}</p>
            <p className="mt-2 text-xs text-muted">Write your response wherever you keep your writing practice.</p>
          </div>
        </Section>
      ) : null}

      {pack.article_text ? (
        <details className="mt-7 border-t border-line pt-4">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-soft">
            <Icon name="book" size={17} /> Read the full article
          </summary>
          <div className="mt-3">
            <SpeakButton id={`article:${pack.pack_id}`} text={pack.article_text} label="the full article" variant="block" />
          </div>
          <div className="reading mt-4">
            {splitParagraphs(pack.article_text).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </details>
      ) : null}

      {meta.url ? <SourceCard url={meta.url} source={meta.source} /> : null}
    </article>
  )
}

/** A prominent, labelled route to the original article. */
function SourceCard({ url, source }: { url: string; source?: string }) {
  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    host = url
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group mt-8 flex items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-soft transition-colors hover:border-ink-soft"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon name="external" size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">Leer en la fuente</span>
        <span className="block truncate text-xs text-muted">
          {source ? `${source} · ` : ''}
          {host}
        </span>
      </span>
      <Icon name="right" size={18} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </a>
  )
}

function Section({
  label,
  count,
  action,
  children,
}: {
  label: string
  count?: number
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mt-7">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="kicker">{label}</span>
        {count ? <span className="text-[0.6875rem] text-muted">{count}</span> : null}
        {action ? <span className="ml-auto">{action}</span> : null}
      </div>
      {children}
    </section>
  )
}

function splitParagraphs(text: string): string[] {
  const parts = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return parts.length ? parts : [text.trim()]
}
