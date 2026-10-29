import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  normalizeAnswer,
  checkAnswer,
  dateKey,
  recordActivity,
  getStreak,
  scheduleReview,
  dueCards,
  hydrateState,
} from "../src/learning.js";

const DAY = 86400000;
const local = (year, month, day, hour = 12) =>
  new Date(year, month - 1, day, hour);

test("initial states never share mutable collections", () => {
  const first = initialState();
  first.completed.push("saludos");
  first.settings.goal = 20;
  assert.deepEqual(initialState(), {
    version: 1,
    completed: [],
    reviews: {},
    activity: {},
    settings: { goal: 10, voiceRate: 0.85 },
    xp: 0,
  });
});

test("normalizes case, surrounding whitespace, punctuation and apostrophes", () => {
  assert.equal(normalizeAnswer("  GUTEN   Morgen !  "), "guten morgen");
  assert.equal(normalizeAnswer("Wie geht’s?"), "wie geht's");
  assert.equal(normalizeAnswer("  Wie geht ’ s ?!  "), "wie geht's");
  assert.equal(normalizeAnswer(null), "");
});

test("normalization preserves German umlauts, eszett and interior punctuation", () => {
  assert.equal(normalizeAnswer("GRÜẞE."), "grüße");
  assert.equal(normalizeAnswer("Schön, danke!"), "schön, danke");
  assert.equal(normalizeAnswer("gru\u0308n"), "grün");
});

test("noun capitalization and terminal punctuation do not reject correct answers", () => {
  assert.deepEqual(checkAnswer("  ein KAFFEE! ", "Ein Kaffee."), {
    correct: true,
    accentOnly: false,
  });
});

test("missing umlauts are explained but never silently accepted", () => {
  assert.deepEqual(checkAnswer("fur", "für"), {
    correct: false,
    accentOnly: true,
  });
  assert.deepEqual(checkAnswer("schon", "schön"), {
    correct: false,
    accentOnly: true,
  });
  assert.deepEqual(checkAnswer("Mutter", "Mütter"), {
    correct: false,
    accentOnly: true,
  });
});

test("eszett is not automatically equivalent to ss; empty answers do not count as accent issues", () => {
  assert.deepEqual(checkAnswer("Strasse", "Straße"), {
    correct: false,
    accentOnly: false,
  });
  assert.deepEqual(checkAnswer("", "für"), {
    correct: false,
    accentOnly: false,
  });
  assert.deepEqual(checkAnswer("Guten Abend", "Guten Morgen"), {
    correct: false,
    accentOnly: false,
  });
});

test("dateKey uses local date around midnight and year boundaries", () => {
  assert.equal(dateKey(local(2026, 12, 31, 23)), "2026-12-31");
  assert.equal(dateKey(local(2027, 1, 1, 0)), "2027-01-01");
  assert.throws(() => dateKey(new Date("invalid")), RangeError);
});

test("activity awards points, counts answers, and completes lessons only once", () => {
  const day = local(2026, 10, 28);
  let state = recordActivity(initialState(), {
    xp: 10,
    date: day,
    lessonId: "saludos",
  });
  state = recordActivity(state, { xp: 5, date: day, lessonId: "saludos" });
  assert.equal(state.xp, 15);
  assert.deepEqual(state.activity["2026-10-28"], { xp: 15, answers: 2 });
  assert.deepEqual(state.completed, ["saludos"]);
});

test("recordActivity does not mutate state, including nested records", () => {
  const original = recordActivity(initialState(), {
    xp: 10,
    date: local(2026, 10, 28),
  });
  original.reviews.card = scheduleReview(null, "good", 1000);
  const frozenCopy = JSON.parse(JSON.stringify(original));
  const next = recordActivity(original, {
    xp: 5,
    date: local(2026, 10, 28),
    lessonId: "uno",
  });
  next.reviews.card.ease = 1.3;
  assert.deepEqual(original, frozenCopy);
});

test("negative or non-finite XP cannot corrupt totals", () => {
  const state = recordActivity(initialState(), {
    xp: -3,
    date: local(2026, 10, 28),
  });
  assert.equal(state.xp, 0);
  assert.equal(state.activity["2026-10-28"].answers, 1);
  assert.equal(recordActivity(state, { xp: Infinity }).xp, 0);
});

test("streak spans a year boundary and is preserved until the next local day ends", () => {
  let state = initialState();
  for (const date of [
    local(2026, 12, 30),
    local(2026, 12, 31),
    local(2027, 1, 1),
  ]) {
    state = recordActivity(state, { date });
  }
  assert.equal(getStreak(state, local(2027, 1, 1)), 3);
  assert.equal(getStreak(state, local(2027, 1, 2, 23)), 3);
  assert.equal(getStreak(state, local(2027, 1, 3)), 0);
});

test("streak stops at a gap and ignores empty day entries", () => {
  const state = initialState();
  state.activity = {
    "2026-10-28": { xp: 10, answers: 1 },
    "2026-10-27": { xp: 0, answers: 0 },
    "2026-10-26": { xp: 20, answers: 2 },
  };
  assert.equal(getStreak(state, local(2026, 10, 28)), 1);
  assert.equal(getStreak(initialState(), local(2026, 10, 28)), 0);
});

test("good reviews progress through 1, 3, 7 days and then multiply the interval", () => {
  let previous = null;
  const now = 100000;
  for (const interval of [1, 3, 7, 18]) {
    previous = scheduleReview(previous, "good", now);
    assert.equal(previous.interval, interval);
    assert.equal(previous.due, now + interval * DAY);
  }
  assert.equal(previous.repetitions, 4);
});

test("again schedules five minutes and resets repetitions without mutating the previous entry", () => {
  const previous = scheduleReview(null, "good", 1000);
  const copy = { ...previous };
  const next = scheduleReview(previous, "again", 2000);
  assert.equal(next.due, 302000);
  assert.equal(next.repetitions, 0);
  assert.ok(next.ease < previous.ease);
  assert.deepEqual(previous, copy);
  assert.equal(scheduleReview(next, "good", 3000).interval, 1);
});

test("hard shortens an established interval and uses one day for a new card", () => {
  assert.equal(scheduleReview(null, "hard", 1000).interval, 1);
  const prior = { due: 0, interval: 7, repetitions: 3, ease: 2.5 };
  const hard = scheduleReview(prior, "hard", 1000);
  assert.equal(hard.interval, 5);
  assert.equal(hard.repetitions, 3);
  assert.ok(hard.ease >= 1.3);
  assert.throws(() => scheduleReview(prior, "unknown"), RangeError);
});

test("dueCards excludes unseen, future, corrupt and duplicate cards; orders oldest first", () => {
  const state = initialState();
  state.reviews = {
    due: { due: 20, interval: 1, repetitions: 1, ease: 2.5 },
    old: { due: 10, interval: 1, repetitions: 1, ease: 2.5 },
    future: { due: 101, interval: 1, repetitions: 1, ease: 2.5 },
    corrupt: { due: "0" },
  };
  const cards = ["unseen", "due", "future", "old", "corrupt", "due"].map(
    (id) => ({ id }),
  );
  assert.deepEqual(
    dueCards(state, cards, 100).map((card) => card.id),
    ["old", "due"],
  );
  assert.equal(cards[0].id, "unseen");
});

test("dueCards includes the exact due time", () => {
  const state = initialState();
  state.reviews.a = { due: 1000, interval: 1, ease: 2.5, repetitions: 1 };
  assert.equal(dueCards(state, [{ id: "a" }], 999).length, 0);
  assert.equal(dueCards(state, [{ id: "a" }], 1000).length, 1);
});

test("hydrateState recovers from corrupt strings, null and unsupported versions", () => {
  for (const invalid of [
    "{broken",
    "null",
    "[]",
    null,
    undefined,
    { version: 2 },
  ]) {
    assert.deepEqual(hydrateState(invalid), initialState());
  }
});

test("hydrateState cleans nested data and accepts serialized valid state", () => {
  const clean = hydrateState(
    JSON.stringify({
      version: 1,
      xp: -2,
      completed: ["uno", "uno", null],
      settings: { goal: 900, voiceRate: -3 },
      activity: {
        "2026-10-28": { xp: 7.9, answers: 2.8 },
        "2026-02-31": { xp: 9, answers: 9 },
      },
      reviews: {
        bad: { due: -1 },
        valid: { due: 100, interval: -1, repetitions: -1, ease: 999 },
      },
    }),
  );
  assert.equal(clean.xp, 0);
  assert.deepEqual(clean.completed, ["uno"]);
  assert.deepEqual(clean.settings, { goal: 120, voiceRate: 0.5 });
  assert.deepEqual(clean.activity, { "2026-10-28": { xp: 7, answers: 2 } });
  assert.deepEqual(clean.reviews, {
    valid: { due: 100, interval: 1, repetitions: 0, ease: 3.5 },
  });
});

test("hydrateState never pollutes object prototypes from saved JSON", () => {
  const state = hydrateState('{"reviews":{"__proto__":{"due":1}}}');
  assert.equal({}.due, undefined);
  assert.equal(Object.getPrototypeOf(state.reviews), Object.prototype);
  assert.equal(Object.hasOwn(state.reviews, "__proto__"), true);
});
