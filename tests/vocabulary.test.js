import test from "node:test";
import assert from "node:assert/strict";
import { lessons } from "../src/curriculum.js";
import {
  vocabularyCategories,
  extraVocabulary,
  getVocabularyCards,
} from "../src/vocabulary.js";

test("every original card belongs to exactly one folder and preserves its stable ID", () => {
  const original = lessons.flatMap((lesson) => lesson.cards);
  const all = getVocabularyCards();
  const categories = new Set(vocabularyCategories.map((category) => category.id));
  assert.equal(original.length, 64);
  assert.equal(all.length, 80);
  assert.equal(new Set(all.map((card) => card.id)).size, all.length);
  const memberships = vocabularyCategories.flatMap((category) => category.cardIds);
  assert.equal(new Set(memberships).size, memberships.length);
  assert.deepEqual([...memberships].sort(), all.map((card) => card.id).sort());
  for (const card of original) {
    const enriched = all.find((item) => item.id === card.id);
    assert.ok(enriched);
    assert.equal(enriched.de, card.de);
    assert.equal(enriched.es, card.es);
    assert.ok(categories.has(enriched.categoryId));
    assert.equal(memberships.filter((id) => id === card.id).length, 1);
  }
  const greetings = vocabularyCategories.find((category) => category.id === "saludos");
  assert.ok(greetings.cardIds.includes("saludos-01"));
  assert.ok(greetings.cardIds.includes("saludos-02"));
});

test("fruit and food folders add useful new vocabulary with article and learning notes", () => {
  for (const category of ["frutas", "comida"]) {
    const additions = extraVocabulary.filter((card) => card.categoryId === category);
    assert.equal(additions.length, 8);
    for (const card of additions) {
      assert.match(card.de, /^(Der|Die|Das) /);
      assert.ok(card.es && card.note);
      assert.equal(card.lessonId, null);
      assert.ok(card.lessonTitle);
    }
  }
  const normal = (text) => text.normalize("NFC").toLocaleLowerCase("de");
  const existingWords = new Set(lessons.flatMap((lesson) => lesson.cards.map((card) => normal(card.de))));
  const newWords = extraVocabulary.map((card) => normal(card.de));
  assert.equal(new Set(newWords).size, newWords.length);
  assert.ok(newWords.every((word) => !existingWords.has(word)));
});

test("combining folders produces a unique union and returned cards do not mutate source data", () => {
  const before = JSON.stringify({ lessons, extraVocabulary });
  const all = getVocabularyCards(lessons);
  const selected = new Set(["frutas", "comida"]);
  const combined = all.filter((card) => selected.has(card.categoryId));
  assert.equal(combined.length, 21);
  assert.equal(new Set(combined.map((card) => card.id)).size, combined.length);
  assert.ok(combined.some((card) => card.id === "frutas-01"));
  assert.ok(combined.some((card) => card.id === "comida-01"));
  all[0].de = "changed";
  all.at(-1).note = "changed";
  assert.equal(JSON.stringify({ lessons, extraVocabulary }), before);
  assert.notEqual(getVocabularyCards()[0].de, "changed");
});
