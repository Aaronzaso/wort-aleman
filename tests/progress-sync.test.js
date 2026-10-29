import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  recordActivity,
  scheduleReview,
} from "../src/learning.js";
import {
  createProgressDocument,
  normalizeProgressDocument,
  progressFromDocument,
  updateProgressDocument,
  mergeProgressDocuments,
  replaceProgressDocument,
} from "../src/progress-sync.js";

const when = new Date(2026, 9, 28, 12);
const fixture = () => {
  const state = recordActivity(initialState(), {
    xp: 10,
    date: when,
    lessonId: "saludos",
  });
  state.reviews["saludos-01"] = scheduleReview(undefined, "good", 10000);
  state.settings.goal = 15;
  return state;
};
const merge = mergeProgressDocuments;

test("baseline round trip preserves the complete learning state without shared objects", () => {
  const state = fixture();
  const original = structuredClone(state);
  const doc = createProgressDocument(state, "phone", 100);
  assert.deepEqual(progressFromDocument(doc), state);
  doc.completed.push("changed");
  doc.reviews["saludos-01"].value.due = 1;
  assert.deepEqual(state, original);
});

test("empty devices do not overwrite another device's settings", () => {
  const existing = createProgressDocument(fixture(), "phone", 100);
  const fresh = createProgressDocument(initialState(), "laptop", 1000);
  assert.equal(progressFromDocument(merge(existing, fresh)).settings.goal, 15);
});

test("deliberate initial settings outrank untouched defaults even with a zero clock", () => {
  const custom = fixture();
  const a = createProgressDocument(custom, "a", 0);
  const b = createProgressDocument(initialState(), "b", 0);
  assert.equal(progressFromDocument(merge(a, b)).settings.goal, 15);
});

test("two offline devices contribute distinct answers, while retries do not double count", () => {
  const base = createProgressDocument(initialState(), "phone", 100);
  const previous = progressFromDocument(base);
  const phoneState = recordActivity(previous, {
    xp: 10,
    date: when,
    lessonId: "saludos",
  });
  const laptopState = recordActivity(previous, {
    xp: 3,
    date: when,
    lessonId: "cafe",
  });
  const phone = updateProgressDocument(
    base,
    previous,
    phoneState,
    "phone",
    200,
  );
  const laptop = updateProgressDocument(
    base,
    previous,
    laptopState,
    "laptop",
    201,
  );
  const combined = merge(phone, laptop);
  const state = progressFromDocument(combined);
  assert.equal(state.xp, 13);
  assert.deepEqual(state.completed, ["cafe", "saludos"]);
  assert.deepEqual(state.activity["2026-10-28"], { xp: 13, answers: 2 });
  assert.deepEqual(merge(combined, phone), combined);
  assert.deepEqual(merge(combined, laptop), combined);
  assert.deepEqual(merge(combined, combined), combined);
});

test("after a remote merge only the new local increment belongs to this actor", () => {
  const phone = createProgressDocument(fixture(), "phone", 100);
  const before = progressFromDocument(phone);
  const next = recordActivity(before, { xp: 5, date: when });
  const laptop = updateProgressDocument(phone, before, next, "laptop", 200);
  assert.deepEqual(laptop.xp, { laptop: 5, phone: 10 });
  assert.equal(progressFromDocument(merge(phone, laptop)).xp, 15);
  assert.deepEqual(laptop.activity["2026-10-28"], {
    laptop: { xp: 5, answers: 1 },
    phone: { xp: 10, answers: 1 },
  });
});

test("same actor snapshots merge by maximum instead of summing repeated history", () => {
  const first = createProgressDocument(fixture(), "phone", 100);
  const oldState = progressFromDocument(first);
  const next = recordActivity(oldState, { xp: 10, date: when });
  const second = updateProgressDocument(first, oldState, next, "phone", 200);
  assert.equal(progressFromDocument(merge(first, second)).xp, 20);
  assert.equal(
    progressFromDocument(merge(first, second)).activity["2026-10-28"].answers,
    2,
  );
});

test("reviews and settings use the latest logical timestamp rather than a due-date maximum", () => {
  const base = createProgressDocument(fixture(), "phone", 100);
  const before = progressFromDocument(base);
  const goodState = structuredClone(before);
  goodState.reviews["saludos-01"] = scheduleReview(
    before.reviews["saludos-01"],
    "good",
    20000,
  );
  goodState.settings.voiceRate = 1;
  const good = updateProgressDocument(base, before, goodState, "phone", 200);
  const againState = structuredClone(before);
  againState.reviews["saludos-01"] = scheduleReview(
    before.reviews["saludos-01"],
    "again",
    21000,
  );
  againState.settings.voiceRate = 0.65;
  const again = updateProgressDocument(base, before, againState, "laptop", 300);
  const state = progressFromDocument(merge(good, again));
  assert.equal(state.settings.voiceRate, 0.65);
  assert.deepEqual(
    state.reviews["saludos-01"],
    againState.reviews["saludos-01"],
  );
});

test("local edits advance their logical timestamp even if the physical clock moves backward", () => {
  const base = createProgressDocument(fixture(), "phone", 1000);
  const before = progressFromDocument(base);
  const next = structuredClone(before);
  next.settings.goal = 20;
  const updated = updateProgressDocument(base, before, next, "phone", 1);
  assert.equal(updated.settings.goal.stamp.at, 1001);
  assert.equal(progressFromDocument(merge(base, updated)).settings.goal, 20);
});

test("equal timestamps break ties by actor, then canonically by payload", () => {
  const base = createProgressDocument(initialState(), "phone", 0);
  const before = progressFromDocument(base);
  const aState = structuredClone(before);
  aState.settings.goal = 5;
  const bState = structuredClone(before);
  bState.settings.goal = 20;
  const a = updateProgressDocument(base, before, aState, "a", 100);
  const b = updateProgressDocument(base, before, bState, "b", 100);
  assert.deepEqual(merge(a, b), merge(b, a));
  assert.equal(progressFromDocument(merge(a, b)).settings.goal, 20);
  const sameActor = updateProgressDocument(base, before, bState, "a", 100);
  assert.deepEqual(merge(a, sameActor), merge(sameActor, a));
});

test("merges are associative, commutative and idempotent across independent edits", () => {
  const base = createProgressDocument(initialState(), "phone", 0);
  const before = progressFromDocument(base);
  const docs = ["a", "b", "c"].map((actor, index) => {
    const next = recordActivity(before, {
      xp: index + 1,
      date: when,
      lessonId: actor,
    });
    next.settings.goal = 5 + index;
    return updateProgressDocument(base, before, next, actor, 100 + index);
  });
  const [a, b, c] = docs;
  assert.deepEqual(merge(merge(a, b), c), merge(a, merge(b, c)));
  assert.deepEqual(merge(a, b), merge(b, a));
  assert.deepEqual(merge(a, a), a);
});

test("explicit reset supersedes old offline progress without resurrecting it", () => {
  const old = createProgressDocument(fixture(), "phone", 100);
  const before = progressFromDocument(old);
  const offlineState = recordActivity(before, {
    xp: 10,
    date: when,
    lessonId: "cafe",
  });
  const offline = updateProgressDocument(
    old,
    before,
    offlineState,
    "laptop",
    500,
  );
  const reset = replaceProgressDocument(initialState(), "phone", old, 200);
  assert.deepEqual(progressFromDocument(merge(reset, offline)), initialState());
  assert.deepEqual(merge(reset, offline), merge(offline, reset));
  const after = recordActivity(initialState(), {
    xp: 3,
    date: when,
    lessonId: "new",
  });
  const resumed = updateProgressDocument(
    reset,
    initialState(),
    after,
    "phone",
    600,
  );
  assert.equal(progressFromDocument(merge(resumed, offline)).xp, 3);
});

test("replacement imports intentionally smaller totals and default settings", () => {
  const old = createProgressDocument(fixture(), "phone", 1000);
  const imported = initialState();
  imported.completed = ["cafe"];
  const replacement = replaceProgressDocument(imported, "laptop", old, 1);
  assert.ok(replacement.epoch.at > old.settings.goal.stamp.at);
  assert.deepEqual(progressFromDocument(merge(old, replacement)), imported);
});

test("concurrent resets converge deterministically and subsequent reset stays newer", () => {
  const old = createProgressDocument(fixture(), "phone", 100);
  const a = replaceProgressDocument(initialState(), "a", old, 200);
  const imported = initialState();
  imported.completed = ["cafe"];
  const b = replaceProgressDocument(imported, "b", old, 200);
  assert.deepEqual(merge(a, b), merge(b, a));
  assert.deepEqual(progressFromDocument(merge(a, b)), imported);
  const later = replaceProgressDocument(initialState(), "a", merge(a, b), 1);
  assert.deepEqual(progressFromDocument(merge(later, b)), initialState());
});

test("ordinary deltas cannot delete shared counters or completed lessons", () => {
  const doc = createProgressDocument(fixture(), "phone", 100);
  const reduced = updateProgressDocument(
    doc,
    fixture(),
    initialState(),
    "phone",
    200,
  );
  assert.equal(progressFromDocument(reduced).xp, 10);
  assert.deepEqual(progressFromDocument(reduced).completed, ["saludos"]);
});

test("malformed documents are safely empty and do not erase healthy progress", () => {
  const good = createProgressDocument(fixture(), "phone", 100);
  for (const value of [
    null,
    [],
    "broken",
    "null",
    { version: 99 },
    { version: 1, epoch: { at: NaN, id: "x" } },
  ]) {
    assert.deepEqual(progressFromDocument(value), initialState());
    assert.deepEqual(merge(good, value), good);
  }
});

test("untrusted maps filter reserved keys, invalid dates and corrupted fields", () => {
  const raw = JSON.parse(
    '{"version":1,"epoch":{"at":0,"id":"initial"},"completed":["saludos","saludos","__proto__",4],"xp":{"phone":12,"__proto__":99,"negative":-5,"bad":"22"},"activity":{"2026-02-30":{"phone":{"answers":9}},"2026-10-28":{"phone":{"xp":12,"answers":1},"constructor":{"answers":99}}},"reviews":{"card":{"value":{"due":20,"interval":1,"repetitions":2,"ease":2.5},"stamp":{"at":10,"id":"phone"}},"__proto__":{"value":{"due":20},"stamp":{"at":10,"id":"phone"}}},"settings":{"goal":{"value":"bad","stamp":{"at":999,"id":"phone"}}}}',
  );
  const normalized = normalizeProgressDocument(raw);
  assert.deepEqual(normalized.completed, ["saludos"]);
  assert.deepEqual(normalized.xp, { phone: 12 });
  assert.deepEqual(Object.keys(normalized.activity), ["2026-10-28"]);
  assert.deepEqual(Object.keys(normalized.activity["2026-10-28"]), ["phone"]);
  assert.deepEqual(Object.keys(normalized.reviews), ["card"]);
  assert.equal(normalized.settings.goal.value, 10);
  assert.equal(normalized.settings.goal.stamp.at, 0);
  assert.equal({}.polluted, undefined);
});

test("network normalization and merge never mutate their inputs", () => {
  const left = createProgressDocument(fixture(), "phone", 100);
  const right = createProgressDocument(initialState(), "laptop", 200);
  const leftBefore = structuredClone(left);
  const rightBefore = structuredClone(right);
  const merged = merge(left, right);
  merged.settings.goal.value = 99;
  merged.reviews["saludos-01"].value.due = 1;
  assert.deepEqual(left, leftBefore);
  assert.deepEqual(right, rightBefore);
  assert.deepEqual(normalizeProgressDocument(JSON.stringify(left)), left);
});

test("counter totals saturate safely and invalid caller identity/clock is rejected", () => {
  const doc = createProgressDocument(initialState(), "phone", 0);
  doc.xp = { a: Number.MAX_SAFE_INTEGER, b: Number.MAX_SAFE_INTEGER };
  assert.equal(progressFromDocument(doc).xp, Number.MAX_SAFE_INTEGER);
  assert.throws(
    () => createProgressDocument(initialState(), "__proto__", 1),
    TypeError,
  );
  assert.throws(
    () => createProgressDocument(initialState(), "toString", 1),
    TypeError,
  );
  assert.throws(
    () =>
      updateProgressDocument(doc, initialState(), initialState(), "phone", -1),
    RangeError,
  );
  assert.throws(
    () => replaceProgressDocument(initialState(), "phone", doc, Infinity),
    RangeError,
  );
});

test("inherited envelope fields and custom prototypes are not accepted as network state", () => {
  const inherited = Object.create(
    createProgressDocument(fixture(), "phone", 100),
  );
  assert.deepEqual(progressFromDocument(inherited), initialState());
  const raw = createProgressDocument(initialState(), "phone", 100);
  raw.settings.goal = Object.create({ value: 99, stamp: { at: 999, id: "x" } });
  assert.equal(normalizeProgressDocument(raw).settings.goal.value, 10);
});
