import { State } from 'ts-fsrs'

// ── The study pack: the contract between the content pipeline and the app ────
// All fields except `meta` and `vocab` are optional and must render gracefully
// when absent.

export type Tier = 'B1' | 'B2' | 'C1' | 'C2'
export const TIERS: Tier[] = ['B1', 'B2', 'C1', 'C2']

export interface PackMeta {
  title: string
  source?: string
  url?: string
  date_published?: string
  date_processed?: string
  tags?: string[]
  length_words?: number
  level?: string
}

export interface VocabItem {
  id?: string
  front: string
  pos?: string
  back: string
  example?: string
  tier?: string
  tags?: string[]
}

export interface GrammarItem {
  sentence: string
  point: string
  explanation?: string
  why_tricky?: string
}

export interface IdiomItem {
  phrase: string
  meaning?: string
  example?: string
}

export interface ComprehensionItem {
  q: string
  type?: string
}

export interface StudyPack {
  pack_id: string
  meta: PackMeta
  summary_en?: string
  resumen_es?: string
  article_text?: string
  vocab: VocabItem[]
  grammar?: GrammarItem[]
  idioms?: IdiomItem[]
  comprehension?: ComprehensionItem[]
  opinion_prompt?: string
}

// ── Stored shapes (IndexedDB) ────────────────────────────────────────────────

/** The whole reading payload, keyed by pack_id, with import metadata. */
export interface StoredPack extends StudyPack {
  imported_at: number
  is_sample?: boolean
}

/** FSRS scheduler state we persist (mirrors ts-fsrs Card; dates kept as Date). */
export interface FsrsState {
  due: Date
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: State
  last_review?: Date
}

/** Canonical card store, keyed by lemma (front), deduplicated across packs. */
export interface StoredCard extends FsrsState {
  front: string
  back: string
  example?: string
  pos?: string
  tier: Tier
  tags: string[]
  sources: string[] // pack_ids that contributed this lemma
  created_at: number
  first_reviewed_at?: number
}

/** Append-only review log (powers progress + future Brújula diagnostics). */
export interface ReviewLogEntry {
  id?: number
  cardId: string // front
  ts: number
  rating: number // 1..4 (Again/Hard/Good/Easy)
  state: number // resulting State
  scheduled_days: number // resulting interval, in days
  is_new: boolean // was this the card's first-ever review (its introduction)
}

export interface Settings {
  dailyNewCap: number
  theme: 'light' | 'dark'
  /** Article feed (inbox). Empty string = use the built-in same-origin feed. */
  feedUrl: string
  /** Pull new articles from the feed automatically when the app opens. */
  autoPull: boolean
  /** Preferred speech voice (SpeechSynthesisVoice.voiceURI). Empty = best available. */
  voiceURI: string
}

export interface Engagement {
  sessionDays: string[] // ISO yyyy-mm-dd of days on which a session was completed
  lifetimeSessions: number
}
