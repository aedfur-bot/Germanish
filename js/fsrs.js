// FSRS-5 scheduler (Free Spaced Repetition Scheduler), dependency-free.
// Reference: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
//
// Simplifications vs. Anki's FSRS integration (flagged deliberately):
//  - No (re)learning steps. Every rating schedules in whole days. Cards rated
//    "Again" are re-shown later in the same 25-card batch by the review screen,
//    but those in-batch repeats don't touch the FSRS state.
//  - Same-day repeat reviews use FSRS-5's short-term stability formula.

export const Rating = { Again: 1, Hard: 2, Good: 3, Easy: 4 };
export const State = { New: 0, Review: 2, Relearning: 3 };

export const DEFAULT_W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192,
  1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];

const DECAY = -0.5;
const FACTOR = 19 / 81; // so that R(S, S) = 0.9
const DAY = 86400_000;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function newCardState() {
  return { state: State.New, stability: 0, difficulty: 0, reps: 0, lapses: 0, lastReview: null, scheduledDays: 0 };
}

export class FSRS {
  constructor({ w = DEFAULT_W, retention = 0.9, maxInterval = 36500 } = {}) {
    this.w = w;
    this.retention = retention;
    this.maxInterval = maxInterval;
  }

  retrievability(elapsedDays, s) {
    return Math.pow(1 + FACTOR * elapsedDays / s, DECAY);
  }

  interval(s) {
    const i = (s / FACTOR) * (Math.pow(this.retention, 1 / DECAY) - 1);
    return clamp(Math.round(i), 1, this.maxInterval);
  }

  initStability(g) { return Math.max(this.w[g - 1], 0.1); }

  initDifficulty(g) { return clamp(this.w[4] - Math.exp(this.w[5] * (g - 1)) + 1, 1, 10); }

  nextDifficulty(d, g) {
    const w = this.w;
    const delta = -w[6] * (g - 3);
    const damped = d + delta * (10 - d) / 9;              // linear damping
    const reverted = w[7] * this.initDifficulty(4) + (1 - w[7]) * damped; // mean reversion
    return clamp(reverted, 1, 10);
  }

  recallStability(d, s, r, g) {
    const w = this.w;
    const hard = g === Rating.Hard ? w[15] : 1;
    const easy = g === Rating.Easy ? w[16] : 1;
    return s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp(w[10] * (1 - r)) - 1) * hard * easy);
  }

  forgetStability(d, s, r) {
    const w = this.w;
    const sf = w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp(w[14] * (1 - r));
    return Math.min(sf, s);
  }

  shortTermStability(s, g) {
    return s * Math.exp(this.w[17] * (g - 3 + this.w[18]));
  }

  /**
   * Apply a rating. Returns { card, due, intervalDays } — card is a new object.
   * `card` holds the FSRS fields from newCardState().
   */
  review(card, g, now = Date.now()) {
    const c = { ...card };
    let s, d;
    if (c.state === State.New || !c.lastReview) {
      s = this.initStability(g);
      d = this.initDifficulty(g);
    } else {
      const elapsed = Math.max(0, (now - c.lastReview) / DAY);
      if (elapsed < 1 && Math.floor(now / DAY) === Math.floor(c.lastReview / DAY)) {
        s = this.shortTermStability(c.stability, g);
      } else {
        const r = this.retrievability(elapsed, c.stability);
        s = g === Rating.Again
          ? this.forgetStability(c.difficulty, c.stability, r)
          : this.recallStability(c.difficulty, c.stability, r, g);
      }
      d = this.nextDifficulty(c.difficulty, g);
    }
    s = Math.max(0.1, s);
    if (g === Rating.Again && c.state !== State.New) c.lapses += 1;
    c.state = g === Rating.Again && c.state !== State.New ? State.Relearning : State.Review;
    c.stability = s;
    c.difficulty = d;
    c.reps += 1;
    c.lastReview = now;
    const ivl = this.interval(s);
    c.scheduledDays = ivl;
    return { card: c, intervalDays: ivl };
  }

  /** Preview intervals for all four ratings (for button labels). */
  preview(card, now = Date.now()) {
    const out = {};
    for (const g of [1, 2, 3, 4]) out[g] = this.review(card, g, now).intervalDays;
    return out;
  }

  /** Current probability of recall (0..1), or null for new cards. */
  currentR(card, now = Date.now()) {
    if (!card.lastReview || card.state === State.New) return null;
    return this.retrievability((now - card.lastReview) / DAY, card.stability);
  }
}

export function fmtInterval(days) {
  if (days < 1) return '<1d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}
