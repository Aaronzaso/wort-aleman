import test from "node:test";
import assert from "node:assert/strict";
import {
  hydrateState,
  initialState,
  recordActivity,
  recordRecall,
  reviewInsight,
  scheduleReview,
} from "../src/learning.js";
import {
  createProgressDocument,
  mergeProgressDocuments,
  progressFromDocument,
  updateProgressDocument,
} from "../src/progress-sync.js";

test("enrolling old or new words does not invent recall evidence", () => {
  const enrolled = scheduleReview(null, "good", 1000);
  assert.equal(Object.hasOwn(enrolled, "recall"), false);
  const old = hydrateState({ reviews: { hello: enrolled } }).reviews.hello;
  assert.deepEqual(reviewInsight(old, old.due), {
    status: "unmeasured",
    due: true,
    attempts: 0,
    counts: { again: 0, hard: 0, good: 0 },
    lastGrade: null,
    reviewedAt: null,
  });
  assert.equal(reviewInsight(undefined, 1000).due, false);
});

test("real answers update recall counts and the latest recommendation without mutation", () => {
  const first = recordRecall(null, "again", 1000);
  const original = structuredClone(first);
  const hard = recordRecall(first, "hard", 2000);
  const good = recordRecall(hard, "good", 3000);
  assert.deepEqual(first, original);
  assert.equal(first.due, 301000);
  assert.deepEqual(good.recall, {
    again: 1, hard: 1, good: 1, lastGrade: "good", at: 3000,
  });
  assert.equal(reviewInsight(first, 1000).status, "needs-work");
  assert.equal(reviewInsight(hard, 2000).status, "needs-work");
  assert.equal(reviewInsight(good, 3000).status, "remembered");
  assert.equal(reviewInsight(good, 3000).attempts, 3);
  assert.equal(reviewInsight(good, good.due - 1).due, false);
  assert.equal(reviewInsight(good, good.due).due, true);
});

test("a later difficult answer reopens attention even after several successful recalls", () => {
  let review;
  for (let index = 0; index < 3; index++)
    review = recordRecall(review, "good", 1000 + index);
  assert.equal(reviewInsight(review, 2000).status, "remembered");
  review = recordRecall(review, "again", 2000);
  const insight = reviewInsight(review, 2000);
  assert.equal(insight.status, "needs-work");
  assert.deepEqual(insight.counts, { again: 1, hard: 0, good: 3 });
  assert.equal(insight.attempts, 4);
});

test("recall metadata survives local JSON, normal activity writes and account document round trips", () => {
  const original = initialState();
  original.reviews.hello = recordRecall(null, "hard", 1000);
  const local = hydrateState(JSON.stringify(original));
  const withActivity = recordActivity(local, { xp: 5 });
  const remote = progressFromDocument(
    createProgressDocument(withActivity, "phone", 2000),
  );
  assert.deepEqual(remote.reviews.hello, original.reviews.hello);
  remote.reviews.hello.recall.hard = 9;
  assert.equal(original.reviews.hello.recall.hard, 1);
});

test("new review evidence is kept by normal account updates and retry merges", () => {
  const before = initialState();
  before.reviews.hello = scheduleReview(null, "good", 1000);
  const baseline = createProgressDocument(before, "phone", 1000);
  const edited = hydrateState(before);
  edited.reviews.hello = recordRecall(edited.reviews.hello, "again", 2000);
  const updated = updateProgressDocument(baseline, before, edited, "phone", 2000);
  const merged = mergeProgressDocuments(updated, baseline);
  assert.deepEqual(
    progressFromDocument(merged).reviews.hello.recall,
    edited.reviews.hello.recall,
  );
  assert.deepEqual(mergeProgressDocuments(merged, updated), merged);
});

test("malformed optional evidence is ignored without discarding a valid schedule", () => {
  const review = scheduleReview(null, "good", 1000);
  for (const recall of [
    null,
    [],
    { again: 1, lastGrade: "wrong", at: 2000 },
    { good: 0, lastGrade: "good", at: 2000 },
    { good: 1, lastGrade: "good", at: -1 },
    { good: 1, lastGrade: "good", at: Infinity },
    { good: 1, lastGrade: "good", at: "2000" },
    { good: 1, lastGrade: "good", at: Number.MAX_VALUE },
    Object.create({ good: 1, lastGrade: "good", at: 2000 }),
  ]) {
    const clean = hydrateState({ reviews: { hello: { ...review, recall } } });
    assert.deepEqual(clean.reviews.hello, review);
    assert.equal(reviewInsight(clean.reviews.hello, 2000).status, "unmeasured");
  }
});

test("evidence sanitizes counters and reports detached bounded totals", () => {
  const max = Number.MAX_SAFE_INTEGER;
  const state = hydrateState({ reviews: { hello: {
    ...scheduleReview(null, "good", 1000),
    recall: { again: -3, hard: 2.9, good: max, lastGrade: "good", at: 2000 },
  } } });
  const next = recordRecall(state.reviews.hello, "good", 3000);
  assert.deepEqual(next.recall, {
    again: 0, hard: 2, good: max, lastGrade: "good", at: 3000,
  });
  const insight = reviewInsight(next, 3000);
  assert.equal(insight.attempts, max);
  insight.counts.good = 0;
  assert.equal(next.recall.good, max);
});

test("recall and insights reject invalid times and grades", () => {
  assert.throws(() => recordRecall(null, "other", 1000), RangeError);
  for (const now of [-1, Infinity, NaN]) {
    assert.throws(() => recordRecall(null, "good", now), RangeError);
    assert.throws(() => reviewInsight(null, now), RangeError);
  }
  assert.throws(() => recordRecall(null, "good", Number.MAX_VALUE), RangeError);
});
