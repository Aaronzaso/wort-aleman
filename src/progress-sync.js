import { hydrateState, initialState } from "./learning.js";

/**
 * A progress document is an account-scoped CRDT, not a second learning state.
 * Counters grow independently per device; reviews/settings use last-writer wins.
 * A newer epoch represents an explicit replacement and wins over old devices.
 */
const MAX = Number.MAX_SAFE_INTEGER;
const INITIAL_STAMP = Object.freeze({ at: 0, id: "initial" });
const RESERVED = new Set([
  ...Object.getOwnPropertyNames(Object.prototype),
  "prototype",
]);
const own = (object, key) => Object.hasOwn(object, key);
const record = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const count = (value) =>
  finite(value) ? Math.min(MAX, Math.max(0, Math.floor(value))) : 0;
const validId = (value) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= 200 &&
  !/[\u0000-\u001f\u007f]/u.test(value) &&
  !RESERVED.has(value);
const validTime = (value) =>
  Number.isSafeInteger(value) && value >= 0 && value <= MAX;
const entries = (value) =>
  record(value) ? Object.entries(value).filter(([key]) => validId(key)) : [];
const sortedMap = (pairs) =>
  Object.fromEntries(pairs.sort(([a], [b]) => compareText(a, b)));
const sortedIds = (values) =>
  [...new Set(values.filter(validId))].sort(compareText);
const copyStamp = (stamp) => ({ at: stamp.at, id: stamp.id });

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function cleanStamp(value) {
  return record(value) &&
    own(value, "at") &&
    own(value, "id") &&
    validTime(value.at) &&
    validId(value.id)
    ? { at: value.at, id: value.id }
    : null;
}

function compareStamp(a, b) {
  return a.at === b.at ? compareText(a.id, b.id) : a.at < b.at ? -1 : 1;
}

function validDay(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(key)) return false;
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function emptyDocument() {
  const defaults = initialState().settings;
  return {
    version: 1,
    epoch: copyStamp(INITIAL_STAMP),
    completed: [],
    activity: {},
    xp: {},
    reviews: {},
    settings: {
      goal: { value: defaults.goal, stamp: copyStamp(INITIAL_STAMP) },
      voiceRate: { value: defaults.voiceRate, stamp: copyStamp(INITIAL_STAMP) },
    },
  };
}

function cleanReview(value) {
  if (
    !record(value) ||
    !own(value, "due") ||
    !finite(value.due) ||
    value.due < 0
  )
    return null;
  const state = hydrateState({ reviews: { card: value } });
  return own(state.reviews, "card") ? state.reviews.card : null;
}

/** Treat network and stored data as untrusted; always return a detached value. */
export function normalizeProgressDocument(raw) {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return emptyDocument();
    }
  }
  const epoch = record(value) ? cleanStamp(value.epoch) : null;
  if (
    !record(value) ||
    !own(value, "version") ||
    value.version !== 1 ||
    !own(value, "epoch") ||
    !epoch
  )
    return emptyDocument();

  const result = emptyDocument();
  result.epoch = epoch;
  result.completed = sortedIds(
    Array.isArray(value.completed) ? value.completed : [],
  );
  result.xp = sortedMap(
    entries(value.xp).flatMap(([actor, total]) => {
      const amount = count(total);
      return amount ? [[actor, amount]] : [];
    }),
  );
  result.activity = sortedMap(
    entries(value.activity).flatMap(([day, actors]) => {
      if (!validDay(day)) return [];
      const dayActors = sortedMap(
        entries(actors).flatMap(([actor, counters]) => {
          if (!record(counters)) return [];
          const xp = count(counters.xp);
          const answers = count(counters.answers);
          return xp || answers ? [[actor, { xp, answers }]] : [];
        }),
      );
      return Object.keys(dayActors).length ? [[day, dayActors]] : [];
    }),
  );
  result.reviews = sortedMap(
    entries(value.reviews).flatMap(([card, item]) => {
      const review = record(item) ? cleanReview(item.value) : null;
      const stamp = record(item) ? cleanStamp(item.stamp) : null;
      return review && stamp ? [[card, { value: review, stamp }]] : [];
    }),
  );
  for (const key of ["goal", "voiceRate"]) {
    const item =
      record(value.settings) && own(value.settings, key)
        ? value.settings[key]
        : null;
    const stamp = record(item) ? cleanStamp(item.stamp) : null;
    if (!stamp || !finite(item.value)) continue;
    const clean = hydrateState({ settings: { [key]: item.value } });
    result.settings[key] = { value: clean.settings[key], stamp };
  }
  return result;
}

function checkActor(actor) {
  if (!validId(actor))
    throw new TypeError("Identificador de dispositivo no válido.");
}

function checkClock(now) {
  if (!validTime(now))
    throw new RangeError("Momento de sincronización no válido.");
}

function latestTime(document) {
  return [
    ...Object.values(document.settings),
    ...Object.values(document.reviews),
  ].reduce(
    (latest, item) => Math.max(latest, item.stamp.at),
    document.epoch.at,
  );
}

function nextStamp(document, actor, now) {
  checkActor(actor);
  checkClock(now);
  const latest = latestTime(document);
  if (latest >= MAX)
    throw new RangeError("El reloj del progreso no puede avanzar.");
  return { at: Math.max(now, latest + 1), id: actor };
}

/**
 * Import a local baseline once. An empty device's default settings have no edit
 * timestamp, so they cannot overwrite choices already made on another device.
 */
export function createProgressDocument(state, actor, now = Date.now()) {
  checkActor(actor);
  checkClock(now);
  const clean = hydrateState(state);
  const result = emptyDocument();
  result.completed = clean.completed;
  result.xp = clean.xp ? { [actor]: clean.xp } : {};
  result.activity = Object.fromEntries(
    Object.entries(clean.activity).map(([day, counters]) => [
      day,
      { [actor]: { ...counters } },
    ]),
  );
  const stamp = { at: Math.max(1, now), id: actor };
  result.reviews = Object.fromEntries(
    Object.entries(clean.reviews).map(([id, review]) => [
      id,
      { value: review, stamp: copyStamp(stamp) },
    ]),
  );
  const defaults = initialState().settings;
  for (const key of ["goal", "voiceRate"]) {
    if (clean.settings[key] !== defaults[key]) {
      result.settings[key] = {
        value: clean.settings[key],
        stamp: copyStamp(stamp),
      };
    }
  }
  return normalizeProgressDocument(result);
}

function sumCounters(values) {
  return values.reduce((total, value) => Math.min(MAX, total + value), 0);
}

/** Convert account metadata into the schema consumed by the learning UI. */
export function progressFromDocument(document) {
  const clean = normalizeProgressDocument(document);
  return hydrateState({
    version: 1,
    completed: clean.completed,
    xp: sumCounters(Object.values(clean.xp)),
    activity: Object.fromEntries(
      Object.entries(clean.activity).map(([day, actors]) => [
        day,
        {
          xp: sumCounters(Object.values(actors).map((item) => item.xp)),
          answers: sumCounters(
            Object.values(actors).map((item) => item.answers),
          ),
        },
      ]),
    ),
    reviews: Object.fromEntries(
      Object.entries(clean.reviews).map(([id, item]) => [id, item.value]),
    ),
    settings: {
      goal: clean.settings.goal.value,
      voiceRate: clean.settings.voiceRate.value,
    },
  });
}

/**
 * Record only a local edit: previousState must be the UI state before that edit,
 * never a stale state from before applying a remote merge. Decreases/deletions
 * require replaceProgressDocument(), rather than subtracting shared counters.
 */
export function updateProgressDocument(
  document,
  previousState,
  nextState,
  actor,
  now = Date.now(),
) {
  const result = normalizeProgressDocument(document);
  const stamp = nextStamp(result, actor, now);
  const previous = hydrateState(previousState);
  const next = hydrateState(nextState);
  result.completed = sortedIds([...result.completed, ...next.completed]);

  const earned = Math.max(0, next.xp - previous.xp);
  if (earned) result.xp[actor] = count((result.xp[actor] ?? 0) + earned);
  for (const [day, totals] of Object.entries(next.activity)) {
    const before = previous.activity[day] ?? { xp: 0, answers: 0 };
    const delta = {
      xp: Math.max(0, totals.xp - before.xp),
      answers: Math.max(0, totals.answers - before.answers),
    };
    if (!delta.xp && !delta.answers) continue;
    const actors = result.activity[day] ?? {};
    const old = actors[actor] ?? { xp: 0, answers: 0 };
    actors[actor] = {
      xp: count(old.xp + delta.xp),
      answers: count(old.answers + delta.answers),
    };
    result.activity[day] = actors;
  }
  for (const [card, review] of Object.entries(next.reviews)) {
    if (JSON.stringify(previous.reviews[card]) !== JSON.stringify(review)) {
      result.reviews[card] = { value: review, stamp: copyStamp(stamp) };
    }
  }
  for (const key of ["goal", "voiceRate"]) {
    if (previous.settings[key] !== next.settings[key]) {
      result.settings[key] = {
        value: next.settings[key],
        stamp: copyStamp(stamp),
      };
    }
  }
  return normalizeProgressDocument(result);
}

function mergeCounterMaps(a, b) {
  return sortedMap(
    sortedIds([...Object.keys(a), ...Object.keys(b)]).map((actor) => [
      actor,
      Math.max(a[actor] ?? 0, b[actor] ?? 0),
    ]),
  );
}

function winningRegister(a, b) {
  if (!a) return b;
  if (!b) return a;
  const order = compareStamp(a.stamp, b.stamp);
  if (order !== 0) return order > 0 ? a : b;
  // Two tabs sharing an actor can edit in the same millisecond. Even then, the
  // payload tie-break keeps merge commutative, associative, and deterministic.
  return compareText(JSON.stringify(a.value), JSON.stringify(b.value)) >= 0
    ? a
    : b;
}

/** Idempotent, associative, commutative merge suitable for fetch/CAS retries. */
export function mergeProgressDocuments(left, right) {
  const a = normalizeProgressDocument(left);
  const b = normalizeProgressDocument(right);
  const epochOrder = compareStamp(a.epoch, b.epoch);
  if (epochOrder !== 0) return epochOrder > 0 ? a : b;

  const result = emptyDocument();
  result.epoch = copyStamp(a.epoch);
  result.completed = sortedIds([...a.completed, ...b.completed]);
  result.xp = mergeCounterMaps(a.xp, b.xp);
  result.activity = sortedMap(
    sortedIds([...Object.keys(a.activity), ...Object.keys(b.activity)]).map(
      (day) => {
        const dayA = a.activity[day] ?? {};
        const dayB = b.activity[day] ?? {};
        return [
          day,
          sortedMap(
            sortedIds([...Object.keys(dayA), ...Object.keys(dayB)]).map(
              (actor) => [
                actor,
                {
                  xp: Math.max(dayA[actor]?.xp ?? 0, dayB[actor]?.xp ?? 0),
                  answers: Math.max(
                    dayA[actor]?.answers ?? 0,
                    dayB[actor]?.answers ?? 0,
                  ),
                },
              ],
            ),
          ),
        ];
      },
    ),
  );
  result.reviews = sortedMap(
    sortedIds([...Object.keys(a.reviews), ...Object.keys(b.reviews)]).map(
      (card) => [card, winningRegister(a.reviews[card], b.reviews[card])],
    ),
  );
  for (const key of ["goal", "voiceRate"])
    result.settings[key] = winningRegister(a.settings[key], b.settings[key]);
  return normalizeProgressDocument(result);
}

/** Explicit import/reset: supersede old snapshots, including offline devices. */
export function replaceProgressDocument(
  state,
  actor,
  previousDocument,
  now = Date.now(),
) {
  const previous = normalizeProgressDocument(previousDocument);
  const stamp = nextStamp(previous, actor, now);
  const result = createProgressDocument(state, actor, stamp.at);
  result.epoch = copyStamp(stamp);
  // Defaults are deliberate choices in a replacement, unlike an empty device.
  for (const key of ["goal", "voiceRate"])
    result.settings[key].stamp = copyStamp(stamp);
  return normalizeProgressDocument(result);
}
