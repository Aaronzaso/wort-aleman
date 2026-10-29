import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { lessons } from "../src/curriculum.js";
import { getVocabularyCards } from "../src/vocabulary.js";

const first = lessons[0];
const vocabulary = getVocabularyCards();
const capture = process.env.WORT_WORKSPACE_SCREENSHOTS === "1";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    if ("speechSynthesis" in window)
      window.speechSynthesis.getVoices = () => [];
  });
});

async function nav(page, view) {
  await page.locator(`button[data-view="${view}"]:visible`).first().click();
}

async function counts(page) {
  return page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem("wort-progress") || "{}");
    return {
      xp: progress.xp || 0,
      answers: Object.values(progress.activity || {}).reduce((sum, day) => sum + day.answers, 0),
    };
  });
}

async function screenshot(page, testInfo, name) {
  if (!capture) return;
  await mkdir(".qa", { recursive: true });
  await page.screenshot({ path: `.qa/workspace-${name}-${testInfo.project.name}.png`, fullPage: true, animations: "disabled" });
}

test("pause study and quiz, resume after reload, and change appearance without losing an answer", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Empezar mi primera lección", exact: true }).click();
  await page.locator("#next-card").click();
  await page.locator("#next-card").click();
  await expect(page.locator(".flashcard h1")).toHaveText(first.cards[2].de);
  // Ordinary navigation must save the same draft as the explicit exit control.
  await nav(page, "learn");
  await expect(page.locator(".resume-panel")).toBeVisible();
  await expect(page.locator(".practice-stage")).toHaveCount(0);
  await page.reload();
  const resume = page.locator('[data-resume="lesson:saludos"]').first();
  await expect(resume).toBeVisible();
  await resume.click();
  await expect(page.locator(".flashcard h1")).toHaveText(first.cards[2].de);
  for (let index = 2; index < first.cards.length; index++)
    await page.locator("#next-card").click();

  await page.locator("[data-option]").filter({ hasText: "Gute Nacht!" }).click();
  await page.getByRole("button", { name: "Comprobar", exact: true }).click();
  const checked = await counts(page);
  await expect(page.locator(".answer-feedback")).toContainText("Vamos a aprender de esta.");
  await page.locator("#toggle-theme").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#toggle-theme")).toHaveAttribute("aria-label", "Activar tema claro");
  await expect(page.locator(".answer-feedback")).toContainText("Vamos a aprender de esta.");
  await expect(page.locator("[data-option].selected")).toBeDisabled();
  expect(await counts(page)).toEqual(checked);
  await screenshot(page, testInfo, "dark");

  await expect(page.locator("#exit-session")).toHaveText("Guardar y volver al inicio");
  await page.locator("#exit-session").click();
  await expect(page.locator(".resume-panel")).toBeVisible();
  await screenshot(page, testInfo, "resume");
  await expect(page.locator(".practice-stage")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await resume.click();
  await expect(page.locator(".exercise-stage h1")).toHaveText(first.exercises[0].prompt);
  await expect(page.locator(".answer-feedback")).toContainText("Vamos a aprender de esta.");
  await expect(page.locator("#check-answer")).toHaveCount(0);
  expect(await counts(page)).toEqual(checked);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.locator("[data-option]").filter({ hasText: first.exercises[1].answer }).click();
  await page.getByRole("button", { name: "Comprobar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  const written = page.getByRole("textbox", { name: "Tu respuesta en alemán" });
  await written.fill("Mir geht es gü");
  await nav(page, "learn");
  await expect(page.locator(".resume-panel")).toBeVisible();
  await expect(page.locator(".practice-stage")).toHaveCount(0);
  await page.reload();
  await resume.click();
  await expect(written).toHaveValue("Mir geht es gü");
  await page.locator("#toggle-theme").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(written).toHaveValue("Mir geht es gü");
  await expect(page.locator("#toggle-theme")).toHaveAttribute("aria-label", "Activar tema oscuro");
  expect((await counts(page)).answers).toBe(2);
  await page.setViewportSize({ width: 320, height: 844 });
  for (const selector of [".avatar", "#toggle-theme"]) {
    const bounds = await page.locator(selector).boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("folders and combined categories show real recall needs for each word", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await nav(page, "words");
  await expect(page.locator('[data-folder="frutas"]')).toBeVisible();
  await screenshot(page, testInfo, "folders");
  await page.locator('[data-folder="frutas"]').click();
  await expect(page.locator(".word-row")).toHaveCount(8);
  await expect(page.locator(".word-row").first()).toContainText("Der Apfel");
  await page.locator("#all-folders").click();
  await expect(page.locator('[data-folder="frutas"]')).toBeVisible();
  await nav(page, "review");
  const fruitChart = page.locator('[data-category-chart="frutas"]');
  await expect(fruitChart).toHaveAttribute("data-needs-work", "0");
  await expect(fruitChart).toHaveAttribute("data-remembered", "0");
  await page.locator('[data-review-category][value="frutas"]').check();
  await page.locator('[data-review-category][value="comida"]').check();
  const start = page.locator("#start-category-review");
  await expect(start).toBeEnabled();
  await expect(page.locator(".review-picker-action")).toContainText("21");
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize(testInfo.project.use.viewport);
  await start.click();
  await expect(page.locator(".session-top > span").last()).toHaveText(/1\s*\/\s*21/);
  const expected = vocabulary.filter(card => ["frutas", "comida"].includes(card.categoryId));
  const seen = new Set();
  let difficultFruit = null;
  for (let index = 0; index < expected.length; index++) {
    await page.locator("#reveal-review").click();
    const text = await page.locator(".revealed-answer h2").innerText();
    const card = expected.find(item => item.de === text);
    expect(card, `the selected categories contain ${text}`).toBeTruthy();
    expect(seen.has(card.id), `no duplicate review for ${card.id}`).toBe(false);
    seen.add(card.id);
    const grade = !difficultFruit && card.categoryId === "frutas" ? "again" : "good";
    if (grade === "again") difficultFruit = card.id;
    await page.locator(`[data-grade="${grade}"]`).click();
  }
  expect([...seen].sort()).toEqual(expected.map(card => card.id).sort());
  await expect(page.locator(".session-finish")).toBeVisible();
  await page.locator("#finish-close").click();
  await nav(page, "review");
  await expect(fruitChart).toHaveAttribute("data-needs-work", "1");
  await expect(fruitChart).toHaveAttribute("data-remembered", "7");
  await expect(page.locator('[data-category-chart="comida"]')).toHaveAttribute("data-remembered", "13");
  expect((await counts(page)).answers).toBe(21);
  await screenshot(page, testInfo, "review");
  expect(errors).toEqual([]);
});
