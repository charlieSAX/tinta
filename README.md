# Tinta

Turn the Spanish articles you read into spaced-repetition study. Tinta is a
personal, offline-first, installable web app (PWA) for a B1→B2 learner who reads
broadly in Spanish — news, politics, culture, history, society, science, tech and
crime. It imports a **study pack** (JSON produced by your content pipeline), then
owns reading, review and progress. Everything is stored on-device; nothing is
sent to a server.

The whole of v1 is one loop: **import a study pack → read → review → see progress.**

- **Spaced repetition** is built in, using [FSRS](https://github.com/open-spaced-repetition/ts-fsrs) (`ts-fsrs`). All card state lives in IndexedDB. No Anki, no server.
- **The app consumes; the pipeline produces.** A separate tool (your “ArtículoFlash” flow) turns a Spanish article into a study-pack JSON; Tinta imports it. No API keys in the client.
- **Lightweight by design.** Vite + React + TypeScript + Tailwind, a single static SPA, installable and offline-first, hosted on GitHub Pages.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173/tinta/
```

Build and preview the production bundle:

```bash
npm run build
npm run preview    # http://localhost:4173/tinta/
```

> The dev/preview URLs include the `/tinta/` sub-path on purpose — it mirrors how
> GitHub Pages serves the app, so what you test is what you ship.

---

## Deploy to GitHub Pages

GitHub Pages serves a project site from a sub-path:
`https://<username>.github.io/<repo>/`. Tinta is configured for a repo named
**`tinta`**.

1. **If your repository has a different name, change one line** in
   [`vite.config.ts`](./vite.config.ts):

   ```ts
   const REPO = 'tinta' // ← your GitHub repository name
   ```

   This single constant drives the Vite `base`, the PWA manifest `scope` /
   `start_url`, and the service-worker scope. (Deploying at a domain root?
   Set `REPO = ''`.)

2. Push the project to a GitHub repo of that name.

3. Publish:

   ```bash
   npm run deploy
   ```

   This builds and pushes `dist/` to the `gh-pages` branch via the `gh-pages`
   package.

4. In the repo: **Settings → Pages → Build and deployment → Source: `gh-pages` branch**.

Your app is live at `https://<username>.github.io/<repo>/`. Open it on iOS Safari
and **Share → Add to Home Screen** to install it. After the first load it works
in airplane mode (the app shell, fonts and your data are all cached locally).

---

## Using Tinta

**Import a study pack.** Library → **＋** (top right). Paste the pack JSON, choose a
`.json` file, or load it from a URL. New vocabulary is added to your deck; words
you already have are skipped (deduplicated by lemma). The article’s reading
content is stored for the reader.

**Read.** Tap an article to open the reader: English summary, Spanish *resumen*
(your comprehension anchor), glossary, collapsible grammar highlights, idioms,
comprehension questions and the writing prompt. Any section the pack omits is
simply not shown.

**Review.** One unified FSRS queue across every pack. Due reviews come before new
cards; the daily new-card cap (default 10, in Settings) limits how many new words
you meet per day. Grade **Again / Hard / Good / Easy**; scheduling is computed
locally and saved immediately. *Again* brings a card back later in the same
session; the others schedule it forward.

**Progress.** Due today, reviewed today, words learned, a forgiving rolling 7-day
engagement score (one point per day you study, max 7 — missing a day never
punishes you), lifetime sessions, and a breakdown of learned words by level
(B1–C2) and topic.

**Your data.** Settings → **Export backup** writes the entire database to a JSON
file; **Restore** reads it back exactly. This is the only backup, and it is
lossless — keep one if your data matters to you.

---

## Article feed (the "inbox")

Tinta can pull articles in for you instead of you importing them by hand.

- **Get new articles** (button on the Library, and the empty state) fetches the feed and imports anything new. Everything you've pulled before stays put; you never get the same article twice (dedupe by `pack_id`).
- **Auto-pull** (Settings → Articles, on by default) does the same automatically each time the app opens.
- **Feed URL** (Settings) is blank by default, which uses the built-in feed published with the app at `<base>feed/index.json`. Point it anywhere (e.g. a Gist raw URL) to follow a feed that updates without redeploying the app.

A feed is one small JSON file:

```jsonc
{
  "generated_at": "2026-06-09T07:00:00Z",
  "packs": [
    {
      "pack_id": "feed-2026-05-30-cafe-economia",
      "title": "…", "source": "BBC Mundo", "date": "2026-05-30", "level": "B2",
      "topics": ["politics", "society"],
      "pack": { /* a full study pack, inline (preferred) */ }
      // …or "file": "feed-2026-05-30-cafe-economia.json" to reference a separate pack file
    }
  ]
}
```

The repo ships a real starter feed in [`public/feed/index.json`](./public/feed/index.json) (three current BBC Mundo pieces — economy, science, politics), so the button works the moment you deploy.

### The daily generator (auto-pull source)

A scheduled job keeps the feed fresh: each morning it reads free Spanish-language RSS
(BBC Mundo, El País, RFI en Español, elDiario), picks ~5 articles across topics, builds a
study pack for each, and appends them to the feed.

Two practical notes:

- **Source text.** News *article pages* aren't fetchable server-side, but the RSS feeds (title + summary) are, so packs are built from those and link to the original for full reading. For deep full-text analysis of a specific article, run the manual ArtículoFlash (browser-based) on it.
- **Hosting the live feed.** So the feed updates without you redeploying, host it where the generator can write each day (a GitHub Gist or a tiny `tinta-feed` repo) and set **Settings → Feed URL** to that raw URL. The generator commits the new `feed.json` there daily.

---

## The study-pack format (the contract)

Tinta imports this shape. Only `meta` (with a `title`) and a non-empty `vocab`
array are required; everything else is optional and renders gracefully when
absent.

```jsonc
{
  "pack_id": "2026-06-08-elecciones-y-aranceles",
  "meta": {
    "title": "El nuevo pulso entre Bruselas y Washington",
    "source": "NYT en Español",
    "url": "https://…",
    "date_published": "2026-06-05",
    "date_processed": "2026-06-08",
    "tags": ["politica", "economia"],
    "length_words": 920,
    "level": "B2"
  },
  "summary_en": "Three neutral English sentences.",
  "resumen_es": "Tres frases en español al nivel objetivo.",
  "article_text": "(optional) full Spanish text",
  "vocab": [
    { "id": "encabezar", "front": "encabezar", "pos": "verb",
      "back": "to head / lead (a list, movement, poll)",
      "example": "La candidata encabeza todas las encuestas.",
      "tier": "B2", "tags": ["politica"] }
  ],
  "grammar":       [{ "sentence": "…", "point": "…", "explanation": "…", "why_tricky": "…" }],
  "idioms":        [{ "phrase": "poner sobre la mesa", "meaning": "…", "example": "…" }],
  "comprehension": [{ "q": "¿…?", "type": "factual" }],
  "opinion_prompt": "¿…? Escribe ~100 palabras."
}
```

Two verified sample packs ship with the app (a B2 politics/economics piece and a
C1 science/history piece) so first run is never empty. They’re marked as samples
and can be deleted from the Library.

### Vocabulary calibration

Packs should be **generous (≈15–25 items)** and span **B1 through C2** across a
broad topic mix. Include not only rare or article-specific terms but the common,
high-utility connectives and collocations intermediate learners under-use and
want to own actively (e.g. *ambos lados*, *a su vez*, *en cambio*, *a raíz de*,
*pese a*, *llevar a cabo*, *dar lugar a*). The selection test:

> *“Is this a word, phrase or collocation a literate Spanish adult uses across
> articles, that the learner would benefit from owning actively?”*

Tier every item honestly (B1/B2/C1/C2); skip only the truly basic A1/A2 words.
Vary the grammar focus across packs — not subjunctive every time.

---

## Architecture

```
src/
  lib/         data + logic (no React)
    db.ts        Dexie schema (packs, cards, reviews, meta) + settings/engagement
    types.ts     the study-pack + stored shapes
    packs.ts     pack validation + import/merge (dedupe by lemma)
    fsrs.ts      ts-fsrs wrapper (grade, interval preview)
    queue.ts     unified review queue + due counts + daily cap
    engagement.ts rolling 7-day window + lifetime sessions
    backup.ts    lossless export / restore / reset
    seed.ts      the two sample packs
    topics.ts    topic taxonomy + tier/topic breakdown
    format.ts    date + interval helpers
  components/  Icon, BottomNav, EngagementDots, layout, ui, Toast
  screens/     Library, Import, Reader, Review, Progress, Settings
  nav.tsx      tiny state-based navigation (no router → no SPA-routing issues on Pages)
  App.tsx      shell, first-run seed, screen switch
```

- **Storage:** IndexedDB via Dexie. Cards are keyed by lemma and deduplicated across packs.
- **Scheduling:** `ts-fsrs` v5; the full FSRS card state is persisted per card and the review log is appended on every grade.
- **PWA:** `vite-plugin-pwa` (Workbox). The app shell is precached; Google Fonts are runtime-cached so the reader’s typography survives offline.
- **No** backend, accounts, router, or analytics.

---

## Later phases (documented, not built in v1)

- **Profesora** — a Spanish-only tutor that corrects your writing and keeps a recurring-error log. Needs AI/a small backend; for now the tutor loop stays in the content pipeline.
- **Brújula** — a scored skills map (subjunctive, preterite vs imperfect, por/para, political/economic lexicon) that weights which packs and grammar get emphasised. v1 already logs every review, so the data is there.
- **El Ritmo** — gentle daily reminders via PWA notifications. No streaks, no guilt — rolling engagement only.
