import test from "node:test";
import assert from "node:assert/strict";
import { lessons, pronunciationTips } from "../src/curriculum.js";
test("each lesson has study material and four kinds of active practice", () => {
  assert.equal(lessons.length, 8);
  const ids = new Set();
  for (const lesson of lessons) {
    assert.ok(lesson.title && lesson.tip && lesson.cards.length >= 6);
    assert.deepEqual([...new Set(lesson.exercises.map((e) => e.type))].sort(), [
      "choice",
      "listen",
      "order",
      "write",
    ]);
    for (const item of [...lesson.cards, ...lesson.exercises]) {
      assert.ok(
        item.id && !ids.has(item.id),
        "IDs must stay unique for saved progress",
      );
      ids.add(item.id);
    }
    for (const card of lesson.cards) assert.ok(card.de && card.es && card.note);
    for (const e of lesson.exercises) {
      assert.ok(e.answer && e.explanation);
      if (e.options)
        assert.ok(
          e.options.includes(e.answer),
          "correct response must be selectable",
        );
      if (e.tokens)
        assert.equal(
          e.tokens.join(" "),
          e.answer,
          "sentence must be constructible",
        );
      if (e.type === "listen")
        assert.ok(e.de, "German audio must not read the Spanish answer");
    }
  }
  assert.equal(pronunciationTips.length, 5);
});
