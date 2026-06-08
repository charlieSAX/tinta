import type { StoredCard, StoredPack, Tier } from '../types'
import { TIERS } from '../types'

// ── Topic taxonomy ───────────────────────────────────────────────────────────
// Charlie reads broadly. Packs and vocab carry free-form (mostly Spanish) tags;
// we fold them into eight canonical topics for the Library filter and the
// Progress breakdown. A tag may belong to one topic; "conector" is a vocab
// category, not a topic, so it is deliberately not listed.

export interface Topic {
  key: string
  label: string
  tags: string[]
}

export const TOPICS: Topic[] = [
  { key: 'news', label: 'News', tags: ['news', 'actualidad', 'noticias', 'internacional'] },
  {
    key: 'politics',
    label: 'Politics',
    tags: ['politica', 'política', 'diplomacia', 'economia', 'economía', 'elecciones', 'gobierno', 'geopolitica', 'geopolítica'],
  },
  { key: 'culture', label: 'Culture', tags: ['cultura', 'arte', 'musica', 'música', 'cine', 'literatura', 'gastronomia', 'gastronomía'] },
  { key: 'history', label: 'History', tags: ['historia', 'arqueologia', 'arqueología'] },
  { key: 'society', label: 'Society', tags: ['sociedad', 'salud', 'educacion', 'educación', 'migracion', 'migración', 'religion', 'religión', 'trabajo'] },
  { key: 'science', label: 'Science', tags: ['ciencia', 'medioambiente', 'clima', 'naturaleza', 'espacio', 'biologia', 'biología'] },
  { key: 'tech', label: 'Tech', tags: ['tecnologia', 'tecnología', 'tech', 'internet', 'ia', 'inteligencia-artificial'] },
  { key: 'crime', label: 'Crime', tags: ['crimen', 'sucesos', 'justicia', 'narcotrafico', 'narcotráfico', 'corrupcion', 'corrupción'] },
]

const TAG_TO_TOPIC = new Map<string, string>()
for (const t of TOPICS) for (const tag of t.tags) TAG_TO_TOPIC.set(tag.toLowerCase(), t.key)

function norm(tag: string): string {
  return tag.trim().toLowerCase()
}

/** The set of canonical topic keys a list of tags maps to. */
export function topicsForTags(tags: string[] | undefined): string[] {
  const out = new Set<string>()
  for (const tag of tags ?? []) {
    const key = TAG_TO_TOPIC.get(norm(tag))
    if (key) out.add(key)
  }
  return [...out]
}

/** The single best-fit topic for a card (for a non-double-counting breakdown). */
export function primaryTopic(tags: string[] | undefined): string {
  const matched = topicsForTags(tags)
  return matched[0] ?? 'other'
}

export function packTopics(pack: StoredPack): string[] {
  return topicsForTags(pack.meta.tags)
}

/** Does a pack satisfy the active topic + tier filters? Empty filter = pass. */
export function packMatchesFilters(
  pack: StoredPack,
  activeTopics: Set<string>,
  activeTiers: Set<Tier>,
): boolean {
  if (activeTopics.size > 0) {
    const topics = packTopics(pack)
    if (!topics.some((t) => activeTopics.has(t))) return false
  }
  if (activeTiers.size > 0) {
    const level = (pack.meta.level ?? '').toUpperCase() as Tier
    if (!activeTiers.has(level)) return false
  }
  return true
}

/** Count learned cards by tier and by topic (single best-fit topic each). */
export function breakdown(cards: StoredCard[]): {
  byTier: Record<Tier, number>
  byTopic: { key: string; label: string; count: number }[]
} {
  const byTier = { B1: 0, B2: 0, C1: 0, C2: 0 } as Record<Tier, number>
  const topicCounts = new Map<string, number>()
  for (const c of cards) {
    if (TIERS.includes(c.tier)) byTier[c.tier] += 1
    const key = primaryTopic(c.tags)
    topicCounts.set(key, (topicCounts.get(key) ?? 0) + 1)
  }
  const labelFor = (k: string) => TOPICS.find((t) => t.key === k)?.label ?? 'Other'
  const byTopic = [...topicCounts.entries()]
    .map(([key, count]) => ({ key, label: labelFor(key), count }))
    .sort((a, b) => b.count - a.count)
  return { byTier, byTopic }
}
