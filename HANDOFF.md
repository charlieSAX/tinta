# Handoff / migration brief — Tinta (Spanish) + Naomilingo (Italian)

This document lets a fresh Cowork session pick up both apps with zero prior
context. Read it first, then open the two project folders.

---

## 1. What these are

Two personal language-learning PWAs sharing one codebase/design:

- **Tinta** — Spanish, for **Charlie** (level B1→B2).
- **Naomilingo** — Italian, for **Naomi** (beginner, A2–B1). A rebranded clone of Tinta.

Each turns news articles into spaced-repetition study. One loop: **import/pull a
study pack → read → review (FSRS) → see progress**. Offline-first, installable,
no backend, all data on-device.

## 2. Status & live URLs

| App | Repo | Base | Live URL | State |
|-----|------|------|----------|-------|
| Tinta | `charlieSAX/tinta` | `/tinta/` | https://charliesax.github.io/tinta/ | **Deployed & working.** Feed has 9 Spanish (BBC Mundo) packs. |
| Naomilingo | `charlieSAX/Naomilingo` (capital N) | `/Naomilingo/` | https://charliesax.github.io/Naomilingo/ | Built + verified. Base was just fixed to capital `Naomilingo` to match the repo; **re-run `npm run deploy`** to publish. Feed has 6 Italian (ANSA) packs. |

Folders on Charlie's Mac:
- `/Users/crosser/Documents/Claude/Projects/SPANISH APP` (Tinta)
- `/Users/crosser/Documents/Claude/Projects/NAOMILINGO`

## 3. Stack & architecture (both apps, identical)

Vite + React + TypeScript + Tailwind · Dexie (IndexedDB) · `ts-fsrs` v5 ·
`vite-plugin-pwa` (Workbox). State-based navigation (no router). No backend, no
accounts, no API keys. Deliberately **dropped** `framer-motion` (CSS motion) and
`lucide-react` (hand-rolled inline SVG icons in `src/components/Icon.tsx`).

```
src/
  lib/   db.ts (Dexie schema) · types.ts · packs.ts (validate+import/merge, dedupe by lemma)
         fsrs.ts (ts-fsrs wrapper) · queue.ts (review queue + daily cap) · engagement.ts
         backup.ts (lossless export/restore/reset) · seed.ts (sample packs)
         topics.ts (topic taxonomy) · format.ts · feed.ts (the article feed / inbox)
  components/  Icon, BottomNav, EngagementDots, layout, ui, Toast
  screens/     Library, Import, Reader, Review, Progress, Settings
  nav.tsx · App.tsx · theme.tsx · main.tsx · index.css (design tokens)
```

### Critical per-app differences (DO NOT let these collide)
Both apps live on the **same origin** `charliesax.github.io`, so localStorage and
IndexedDB are shared across the origin. They are kept separate by:
- **IndexedDB name** — `db.ts` `super('tinta')` vs `super('naomilingo')`.
- **localStorage theme key** — `useTheme.ts` `'tinta-theme'` vs `'naomilingo-theme'`.
- **Base path** — `vite.config.ts` `const REPO` (`'tinta'` vs `'Naomilingo'`).

### Other key facts
- **Base path = repo name and is CASE-SENSITIVE** on GitHub Pages. Mismatch → blank page (HTML loads, assets 404). Tinta works because repo + base are both lowercase `tinta`. Naomilingo repo is `Naomilingo`, so base must be `/Naomilingo/`.
- Tiers: **B1, B2, C1, C2** (both). Palette: Tinta = masthead red; Naomilingo = greens (`--accent` etc. in `index.css`).
- Fonts: Newsreader (reading) + Hanken Grotesk (UI), Google Fonts, runtime-cached for offline.

## 4. The article feed (inbox) + daily generator

- App pulls packs from a feed JSON at `<base>feed/index.json` (same-origin, shipped in `public/feed/`). **"Get new articles"** button + **auto-pull on open** (Settings → Articles toggle). Dedupe by `pack_id`; previously pulled packs are kept. Feed entries can embed the pack **inline** (preferred) or reference a `file`.
- Pack contract is documented in each app's `README.md`. NOTE: the field `resumen_es` holds the **target-language summary** (Italian app reuses this field name; the UI labels it "Riassunto").
- Starter feeds were authored by hand from real RSS headlines (Tinta: 9 BBC Mundo; Naomilingo: 6 ANSA), pitched to each learner's level.

### PENDING — make articles refresh automatically every day (both apps)
Not yet wired. Requires:
1. **Connect GitHub in Cowork via the `/mcp` command** (the programmatic OAuth `authenticate` is NOT supported for this server — must be manual). One connection covers BOTH apps (same GitHub account).
2. A **scheduled task** (`mcp__scheduled-tasks__create_scheduled_task`, cron e.g. `0 7 * * *`) per app that: fetches the RSS feeds → builds ~5 packs (resumen, glossary, grammar, comprehension, opinion) at the learner's level → reads the current `feed/index.json` on the **`gh-pages` branch** → prepends new entries (cap ~40, dedupe by article URL) → commits it back via the GitHub MCP. The app's auto-pull then delivers them.

Constraints discovered (important):
- **News article *pages* are on the web_fetch blocklist; RSS feeds are NOT.** So the generator builds packs from RSS **title + description** (reliable, automatable) and links to the original. Deep full-text analysis of a single article needs the browser (Claude-in-Chrome), not the scheduled job.
- Scheduled tasks **run only while Cowork is open** on the Mac (they catch up on next launch) — not a true always-on cloud cron. Be honest about this with Charlie.
- Committing to `gh-pages` is overwritten by `npm run deploy`; that's fine because each phone keeps its pulled packs locally forever (the feed is only a delivery queue), and the next job run repopulates.

RSS sources that work:
- **Spanish:** BBC Mundo `https://feeds.bbci.co.uk/mundo/rss.xml` (verified), El País, RFI en Español, elDiario.
- **Italian:** ANSA `https://www.ansa.it/sito/ansait_rss.xml` (verified), Il Post `https://www.ilpost.it/feed/`, Rai News, Internazionale.

## 5. Content calibration
- **Tinta:** B1→B2, broad topics (news/politics/culture/history/society/science/tech/crime), generous vocab incl. common collocations + connectives.
- **Naomilingo:** beginner A2–B1, simpler register, high-frequency vocab + everyday phrases. Same topic taxonomy, Italian tags (see `topics.ts`).
- An updated **ArtículoFlash** skill (Charlie's Spanish article→pack tool, recalibrated to B1–C2 + collocations + emits the pack JSON) is at `SPANISH APP/_notes/ArticuloFlash-SKILL-v2.md`.

## 6. Deploy (each app, on Charlie's Mac — clean environment)
```bash
cd "<project folder>"
rm -rf node_modules && npm install     # sandbox node_modules is Linux/partial — reinstall
git init && git add . && git commit -m "v1"
git branch -M main
git remote add origin https://github.com/charlieSAX/<REPO>.git   # REPO case-sensitive!
git push -u origin main
npm run deploy                          # builds + pushes dist/ to gh-pages
# then GitHub → Settings → Pages → Source: gh-pages / (root)
```
Install: **Android** → Chrome ⋮ menu → *Install app*. **iOS** → Safari Share → *Add to Home Screen*. Works offline after first load.

## 7. How this was verified (reuse for changes)
`tsc -b` typecheck · `vite build` · a headless **feed-import test** (`fake-indexeddb`, checks import + dedupe + keep-history) · **SSR render** of all six screens · live HTTP smoke of the deployed URL. (In the Cowork sandbox, npm is flaky — cache EPERM, pruned native binaries; on a real Mac it's clean. Workaround used: borrow the Spanish project's working `node_modules` for verification.)

## 8. Immediate next steps for the new session
1. Confirm Naomilingo's redeploy fixed the blank page (`https://charliesax.github.io/Naomilingo/`).
2. Have Charlie connect GitHub via `/mcp`, then set up the **two daily generator scheduled tasks** (Spanish + Italian) per §4.
3. Optional: richer/larger starter feeds; later phases (Profesora tutor, Brújula skills-map, El Ritmo reminders) are documented in each README.

## 9. User preferences (Charlie)
Be concise and direct. Likes being asked clarifying questions during the work.
Uses an Obsidian "Brain" vault ("Learning Spanish") — wasn't connected this
session, so session logs were written to each project's `_notes/` folder for him
to file. Connect the vault in the new session and write logs there.
