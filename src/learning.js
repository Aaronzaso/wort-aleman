/** Pure learning helpers. Review intervals are stored in days; timestamps in milliseconds. */
const DAY = 24 * 60 * 60 * 1000;
const MAX_COUNTER = Number.MAX_SAFE_INTEGER;

export function initialState() {
  return {
    version: 1,
    completed: [],
    reviews: {},
    activity: {},
    settings: { goal: 10, voiceRate: 0.85 },
    xp: 0,
  };
}

/** Umlauts and ß remain significant. Punctuation at the end does not affect an answer. */
export function normalizeAnswer(value) {
  return String(value ?? "")
    .normalize("NFC")
    .toLocaleLowerCase("de")
    .replace(/[\u2018\u2019\u02bc\uff07]/gu, "'")
    .replace(/\s*'\s*/gu, "'")
    .replace(/\s+/gu, " ")
    .replace(/[\s.!?…;:,]+$/gu, "")
    .trim();
}

export function checkAnswer(input, expected) {
  const actual = normalizeAnswer(input);
  const target = normalizeAnswer(expected);
  const correct = actual === target;
  const withoutMarks = (value) => value.normalize("NFD").replace(/\p{M}/gu, "");
  return {
    correct,
    accentOnly:
      !correct &&
      actual.length > 0 &&
      withoutMarks(actual) === withoutMarks(target),
  };
}

/** Uses the device's calendar date, rather than UTC, including around midnight. */
export function dateKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(value.getTime()))
    throw new RangeError("Fecha no válida.");
  return [
    String(value.getFullYear()).padStart(4, "0"),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const counter = (value) =>
  finite(value) ? Math.min(MAX_COUNTER, Math.max(0, Math.floor(value))) : 0;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const validId = (id) =>
  typeof id === "string" && id.length > 0 && id.length <= 200;

function validDateKey(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(key)) return false;
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return dateKey(date) === key;
}

function cleanReview(value) {
  if (!isObject(value) || !finite(value.due) || value.due < 0) return null;
  return {
    due: value.due,
    interval:
      finite(value.interval) && value.interval > 0
        ? Math.min(value.interval, 36500)
        : 1,
    repetitions: counter(value.repetitions),
    ease: finite(value.ease) ? clamp(value.ease, 1.3, 3.5) : 2.5,
  };
}

/** Accepts parsed state or a localStorage string. Corrupt data falls back safely. */
export function hydrateState(raw) {
  let candidate = raw;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return initialState();
    }
  }
  if (!isObject(candidate)) return initialState();
  // Future formats need an explicit migration instead of accidental interpretation.
  if (candidate.version !== undefined && candidate.version !== 1)
    return initialState();

  const state = initialState();
  state.completed = Array.isArray(candidate.completed)
    ? [...new Set(candidate.completed.filter(validId))]
    : [];
  state.xp = counter(candidate.xp);
  if (isObject(candidate.settings)) {
    const { goal, voiceRate } = candidate.settings;
    if (finite(goal)) state.settings.goal = clamp(Math.round(goal), 1, 120);
    if (finite(voiceRate))
      state.settings.voiceRate = clamp(voiceRate, 0.5, 1.5);
  }
  if (isObject(candidate.reviews)) {
    state.reviews = Object.fromEntries(
      Object.entries(candidate.reviews).flatMap(([id, value]) => {
        const review = cleanReview(value);
        return validId(id) && review ? [[id, review]] : [];
      }),
    );
  }
  if (isObject(candidate.activity)) {
    state.activity = Object.fromEntries(
      Object.entries(candidate.activity).flatMap(([key, value]) =>
        validDateKey(key) && isObject(value)
          ? [[key, { xp: counter(value.xp), answers: counter(value.answers) }]]
          : [],
      ),
    );
  }
  return state;
}

/** Records one answered item. Completing a lesson is optional and idempotent. */
export function recordActivity(
  state,
  { xp = 0, date = new Date(), lessonId } = {},
) {
  const next = hydrateState(state);
  const key = dateKey(date);
  const previous = next.activity[key] ?? { xp: 0, answers: 0 };
  const earned = counter(xp);
  next.xp = counter(next.xp + earned);
  next.activity[key] = {
    xp: counter(previous.xp + earned),
    answers: counter(previous.answers + 1),
  };
  if (validId(lessonId) && !next.completed.includes(lessonId))
    next.completed.push(lessonId);
  return next;
}

export function getStreak(state, today = new Date()) {
  const activity = isObject(state?.activity) ? state.activity : {};
  const date = new Date(today);
  dateKey(date); // Validate before arithmetic.
  date.setHours(12, 0, 0, 0);
  const active = () => {
    const day = activity[dateKey(date)];
    return isObject(day) && (counter(day.answers) > 0 || counter(day.xp) > 0);
  };
  if (!active()) date.setDate(date.getDate() - 1);
  let streak = 0;
  while (active()) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

/** Simple transparent schedule: good → 1, 3, 7 days, then interval × ease. */
export function scheduleReview(previous, grade, now = Date.now()) {
  if (!["again", "hard", "good"].includes(grade))
    throw new RangeError("Calificación no válida.");
  if (!finite(now) || now < 0)
    throw new RangeError("Momento de repaso no válido.");
  const prior = cleanReview(previous) ?? {
    due: now,
    interval: 0,
    repetitions: 0,
    ease: 2.5,
  };
  let { interval, repetitions, ease } = prior;
  if (grade === "again") {
    interval = 5 / (24 * 60);
    repetitions = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else if (grade === "hard") {
    interval = Math.max(1, Math.round(interval * 0.7));
    ease = Math.max(1.3, ease - 0.15);
  } else {
    repetitions += 1;
    interval =
      repetitions === 1
        ? 1
        : repetitions === 2
          ? 3
          : repetitions === 3
            ? 7
            : Math.max(1, Math.round(interval * ease));
  }
  interval = Math.min(interval, 36500);
  return { due: now + interval * DAY, interval, repetitions, ease };
}

/** Presence of a valid review entry means a card has been studied. New cards stay out. */
export function dueCards(state, allCards, now = Date.now()) {
  if (!Array.isArray(allCards) || !finite(now)) return [];
  const reviews = isObject(state?.reviews) ? state.reviews : {};
  const seen = new Set();
  return allCards
    .filter((card) => {
      if (!isObject(card) || !validId(card.id) || seen.has(card.id))
        return false;
      seen.add(card.id);
      const review = cleanReview(
        Object.hasOwn(reviews, card.id) ? reviews[card.id] : null,
      );
      return review !== null && review.due <= now;
    })
    .sort(
      (a, b) =>
        reviews[a.id].due - reviews[b.id].due || a.id.localeCompare(b.id),
    );
}
