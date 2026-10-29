import test from "node:test";
import assert from "node:assert/strict";
import { lessons } from "../src/curriculum.js";
import { getVocabularyCards } from "../src/vocabulary.js";
import {
  createPracticeStore,
  draftId,
  restorePractice,
  snapshotPractice,
} from "../src/practice-drafts.js";

const cards = getVocabularyCards();
const first = lessons[0];
function lessonSession(overrides = {}) {
  return {
    type: "lesson",
    lesson: first,
    stage: "exercise",
    index: first.cards.length - 1,
    exerciseIndex: 0,
    queue: first.exercises.map((exercise, key) => ({
      ...exercise,
      key,
      options: exercise.options ? [...exercise.options].reverse() : undefined,
      tokens: exercise.tokens ? [...exercise.tokens].reverse() : undefined,
    })),
    wrong: new Set(),
    correct: 0,
    selected: null,
    checked: false,
    tokens: [],
    written: "",
    ...overrides,
  };
}
const restore = (raw) => restorePractice(raw, lessons, cards);
function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("a paused card and quiz option preserve their exact position and shuffled order", () => {
  const studying = lessonSession({ stage: "study", index: 3 });
  const study = restore(JSON.parse(JSON.stringify(snapshotPractice(studying, 1000))));
  assert.equal(study.stage, "study");
  assert.equal(study.index, 3);
  assert.equal(study.lesson.cards[study.index].de, first.cards[3].de);
  const exercise = lessonSession({ selected: 1 });
  const restored = restore(snapshotPractice(exercise, 2000));
  assert.equal(restored.exerciseIndex, 0);
  assert.equal(restored.selected, 1);
  assert.deepEqual(restored.queue[0].options, exercise.queue[0].options);
  assert.notEqual(restored.queue[0].options, exercise.queue[0].options);
  assert.equal(draftId(restored), `lesson:${first.id}`);
});

test("a typed draft and partly ordered sentence survive serialization independently", () => {
  const written = lessonSession({ exerciseIndex: 2, written: "Mir geht es gü" });
  assert.equal(restore(snapshotPractice(written, 1000)).written, "Mir geht es gü");
  const ordered = lessonSession({ exerciseIndex: 3, tokens: [2, 0] });
  const restored = restore(JSON.parse(JSON.stringify(snapshotPractice(ordered, 2000))));
  assert.deepEqual(restored.tokens, [2, 0]);
  assert.deepEqual(restored.queue[3].tokens, ordered.queue[3].tokens);
  restored.tokens.push(1);
  assert.deepEqual(ordered.tokens, [2, 0]);
});

test("a checked error restores feedback and its one retry without grading it again", () => {
  const session = lessonSession({ checked: true, written: "Gute Nacht!" });
  session.selected = session.queue[0].options.indexOf("Gute Nacht!");
  session.wrong.add(0);
  session.queue.push({ ...session.queue[0] });
  const snapshot = snapshotPractice(session, 1000);
  const restored = restore(snapshot);
  assert.equal(restored.checked, true);
  assert.equal(restored.result.correct, false);
  assert.equal(restored.correct, 0);
  assert.deepEqual([...restored.wrong], [0]);
  assert.equal(restored.queue.length, first.exercises.length + 1);
  assert.equal(restored.queue.at(-1).key, 0);
  // Restoration is repeatable and neither appends another retry nor increments scores.
  assert.deepEqual(snapshotPractice(restore(snapshot), 1000), snapshot);
  assert.equal(Object.hasOwn(snapshot, "xp"), false);
});

test("review drafts preserve selected categories, card order, reveal state and completed drafts disappear", () => {
  const items = cards.filter((card) => ["frutas", "comida"].includes(card.categoryId));
  const session = { type: "review", items: [...items].reverse(), index: 4, revealed: true, categoryIds: ["frutas", "comida"] };
  const restored = restore(snapshotPractice(session, 1000));
  assert.equal(restored.index, 4);
  assert.equal(restored.revealed, true);
  assert.deepEqual(restored.items.map((card) => card.id), session.items.map((card) => card.id));
  assert.equal(draftId(restored), "review:comida,frutas");
  assert.equal(snapshotPractice({ ...session, index: items.length }, 2000), null);
  assert.equal(snapshotPractice(lessonSession({ stage: "done" }), 2000), null);
});

test("stored drafts are isolated by owner and finishing removes only that owner's matching practice", () => {
  const storage = memoryStorage();
  const store = createPracticeStore(storage, lessons, cards);
  store.save(null, lessonSession({ stage: "study", index: 2 }));
  store.save("aaron", lessonSession({ stage: "study", index: 5 }));
  store.save("rafa", lessonSession({ stage: "study", index: 1 }));
  assert.equal(store.load(null, `lesson:${first.id}`).index, 2);
  assert.equal(store.load("aaron", `lesson:${first.id}`).index, 5);
  assert.equal(store.load("rafa", `lesson:${first.id}`).index, 1);
  assert.deepEqual(store.list("someone-else"), []);
  store.save("aaron", lessonSession({ stage: "done" }));
  assert.deepEqual(store.list("aaron"), []);
  assert.equal(store.list(null).length, 1);
  assert.equal(store.list("rafa").length, 1);
  store.clear("rafa");
  assert.deepEqual(store.list("rafa"), []);
  assert.equal(store.list(null).length, 1);
});

test("corrupt storage, unknown authored IDs and invalid option/token permutations are rejected", () => {
  const storage = memoryStorage();
  const store = createPracticeStore(storage, lessons, cards);
  storage.setItem("wort-practices-v1:guest", "{broken");
  assert.deepEqual(store.list(null), []);
  const original = snapshotPractice(lessonSession(), 1000);
  const invalid = [
    null,
    { ...original, version: 9 },
    { ...original, lessonId: "nonexistent-lesson" },
    { ...original, index: first.cards.length },
    { ...original, queue: [] },
    { ...original, selected: 99 },
    { ...original, checked: true },
    { ...original, written: "a".repeat(5001) },
    { ...original, queue: original.queue.map((item, index) => index ? item : { ...item, options: ["spoofed"] }) },
    { ...original, exerciseIndex: 3, tokens: [0, 0] },
    { ...original, exerciseIndex: 3, tokens: [99] },
  ];
  for (const snapshot of invalid) assert.equal(restore(snapshot), null);
  const review = snapshotPractice({ type: "review", items: cards.slice(0, 2), index: 0, revealed: false }, 1000);
  assert.equal(restore({ ...review, itemIds: ["nonexistent-card"] }), null);
  assert.equal(restore({ ...review, itemIds: [cards[0].id, cards[0].id] }), null);
  storage.setItem("wort-practices-v1:guest", JSON.stringify([invalid[2], original]));
  assert.equal(store.list(null).length, 1);
});

test("an altered draft identity or unjustified retry cannot produce a resumable practice", () => {
  const original = snapshotPractice(lessonSession(), 1000);
  assert.equal(restore({ ...original, id: "lesson:unknown" }), null);
  assert.equal(restore({ ...original, queue: [...original.queue, original.queue[0]] }), null);
  const duplicateRetry = {
    ...original,
    wrong: [0],
    queue: [...original.queue, original.queue[0], original.queue[0]],
  };
  assert.equal(restore(duplicateRetry), null);
});
