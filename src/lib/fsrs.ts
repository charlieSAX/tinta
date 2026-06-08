import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type Grade,
} from 'ts-fsrs'
import type { FsrsState, StoredCard } from '../types'

// One scheduler for the whole app. Fuzz keeps intervals from clumping; the
// short-term steps give "Again" a sensible same-session return.
const scheduler = fsrs(
  generatorParameters({ enable_fuzz: true, enable_short_term: true }),
)

export { Rating, State }
export type { Grade }

export const GRADES: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]

export const GRADE_LABEL: Record<Grade, string> = {
  [Rating.Again]: 'Again',
  [Rating.Hard]: 'Hard',
  [Rating.Good]: 'Good',
  [Rating.Easy]: 'Easy',
}

/** A fresh FSRS "new" state for a just-added card. */
export function emptyState(now: Date = new Date()): FsrsState {
  return pickState(createEmptyCard(now))
}

function pickState(c: FsrsCard): FsrsState {
  return {
    due: c.due,
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review,
  }
}

export interface GradeOutcome {
  next: FsrsState
  scheduled_days: number
  state: State
  due: Date
}

/** Apply a grade and return the next persisted state (does not write to DB). */
export function applyGrade(
  card: StoredCard,
  rating: Grade,
  now: Date = new Date(),
): GradeOutcome {
  const item = scheduler.next(card, now, rating)
  return {
    next: pickState(item.card),
    scheduled_days: item.card.scheduled_days,
    state: item.card.state,
    due: item.card.due,
  }
}

/** The projected due date for every grade — drives the next-interval hints. */
export function intervalPreview(
  card: StoredCard,
  now: Date = new Date(),
): Record<Grade, Date> {
  const p = scheduler.repeat(card, now)
  return {
    [Rating.Again]: p[Rating.Again].card.due,
    [Rating.Hard]: p[Rating.Hard].card.due,
    [Rating.Good]: p[Rating.Good].card.due,
    [Rating.Easy]: p[Rating.Easy].card.due,
  } as Record<Grade, Date>
}

export function isNewState(state: State): boolean {
  return state === State.New
}
