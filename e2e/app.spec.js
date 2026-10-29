import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { lessons } from "../src/curriculum.js";

const first = lessons[0];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Reproducible fallback: headless voices differ by Windows installation.
    if ("speechSynthesis" in window)
      window.speechSynthesis.getVoices = () => [];
  });
});

async function nav(page, id) {
  await page.locator(`button[data-view="${id}"]:visible`).first().click();
}

async function study(page) {
  await page
    .getByRole("button", { name: "Empezar mi primera lección" })
    .click();
  for (let index = 0; index < first.cards.length; index++) {
    await expect(page.locator(".flashcard h1")).toHaveText(
      first.cards[index].de,
    );
    await page.locator("#next-card").click();
  }
}

async function answer(page, exercise, value = exercise.answer) {
  await expect(page.locator(".exercise-stage h1")).toHaveText(exercise.prompt);
  if (exercise.type === "choice" || exercise.type === "listen") {
    await page.locator("[data-option]").filter({ hasText: value }).click();
  } else if (exercise.type === "write") {
    await page
      .getByRole("textbox", { name: "Tu respuesta en alemán" })
      .fill(value);
  } else {
    for (const token of exercise.tokens) {
      await page
        .locator(".token-bank")
        .getByRole("button", { name: token, exact: true })
        .click();
    }
  }
  await page.getByRole("button", { name: "Comprobar", exact: true }).click();
}

test("home and lesson render on desktop and mobile, without horizontal overflow", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Tu alemán empieza con un Hallo." }),
  ).toBeVisible();
  await expect(page.locator(".lesson-row")).toHaveCount(8);
  await mkdir(".qa", { recursive: true });
  await page.screenshot({
    path: `.qa/${testInfo.project.name}.png`,
    fullPage: true,
  });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `overflow at ${width}px`,
    ).toBe(true);
  }
  await page.setViewportSize(testInfo.project.use.viewport);
  await page
    .getByRole("button", { name: "Empezar mi primera lección" })
    .click();
  if (testInfo.project.name === "mobile")
    await page.screenshot({ path: ".qa/lesson.png", fullPage: true });
  await expect(page.locator("#prev-card")).toBeDisabled();
  await page.getByRole("button", { name: "Escuchar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Añade una voz alemana");
  expect(errors).toEqual([]);
});

test("complete a lesson, correct a mistake, preserve progress and schedule reviews", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await study(page);
  await page.getByRole("button", { name: "Comprobar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Elige o escribe");
  await answer(page, first.exercises[0], "Gute Nacht!");
  await expect(page.locator(".answer-feedback")).toContainText(
    "Vamos a aprender de esta.",
  );
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  for (const exercise of first.exercises.slice(1)) {
    if (exercise.type === "listen") {
      await page.getByText("Ver transcripción si no puedo escuchar").click();
      await expect(page.locator(".transcript p")).toHaveText(exercise.de);
    }
    await answer(page, exercise);
    await expect(page.locator(".answer-feedback")).toContainText(
      "¡Bien! Sehr gut.",
    );
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
  }
  await expect(page.locator(".exercise-kind")).toContainText("SEGUNDA VUELTA");
  await answer(page, first.exercises[0]);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".session-finish")).toContainText(
    "Acertaste 5 de 6",
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("wort-progress")),
  );
  expect(saved.completed).toEqual(["saludos"]);
  expect(Object.keys(saved.reviews)).toHaveLength(8);
  expect(
    Object.values(saved.reviews).every(
      (r) => r.due > Date.now() + 23 * 60 * 60 * 1000,
    ),
  ).toBe(true);
  expect(
    Object.values(saved.activity).reduce(
      (sum, entry) => sum + entry.answers,
      0,
    ),
  ).toBe(7);
  await page.reload();
  await expect(page.locator(".route-total")).toHaveText("1 de 8 completadas");
  await nav(page, "review");
  await expect(
    page.getByRole("heading", { name: "Vas al día. Sehr gut!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Practicar mis palabras" }).click();
  await expect(
    page.getByRole("button", { name: "Ver respuesta" }),
  ).toBeVisible();
  await expect(page.locator(".review-grades")).toHaveCount(0);
  await page.getByRole("button", { name: "Ver respuesta" }).click();
  await page.locator('[data-grade="again"]').click();
  const reviewed = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("wort-progress")),
  );
  const again = Object.values(reviewed.reviews).find(
    (r) => r.repetitions === 0,
  );
  expect(again.due - Date.now()).toBeGreaterThan(290000);
  expect(again.due - Date.now()).toBeLessThanOrEqual(300000);
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  await nav(page, "progress");
  await expect(page.locator(".stats-strip")).toContainText("8");
  expect(errors).toEqual([]);
});

test("consult lesson words during the quiz without losing answers or counting them twice", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await study(page);
  const captureReference = process.env.WORT_REFERENCE_SCREENSHOTS === "1";
  if (captureReference) {
    await mkdir(".qa", { recursive: true });
    await page.screenshot({ path: `.qa/quiz-reference-${testInfo.project.name}.png`, fullPage: false });
  }
  const reference = page.getByRole("dialog", { name: "Palabras de la lección" });
  const consult = page.locator("#consult-words");
  const progressSnapshot = () => page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem("wort-progress") || "{}");
    return {
      xp: progress.xp || 0,
      answers: Object.values(progress.activity || {}).reduce(
        (sum, day) => sum + day.answers, 0,
      ),
    };
  });

  // Looking up a word must not clear a choice or submit it on the learner's behalf.
  const selected = page.locator("[data-option]").filter({ hasText: "Gute Nacht!" });
  await selected.click();
  const beforeConsult = await progressSnapshot();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    "quiz has no horizontal overflow at 320px").toBe(true);
  await consult.click();
  await expect(reference).toBeVisible();
  expect(await reference.evaluate(dialog => {
    const bounds = dialog.getBoundingClientRect();
    return dialog.scrollWidth <= dialog.clientWidth && bounds.left >= 0 && bounds.right <= window.innerWidth;
  }), "word consultation fits at 320px").toBe(true);
  await expect(reference.locator(".reference-word")).toHaveCount(first.cards.length);
  for (const card of first.cards) {
    await expect(reference).toContainText(card.de);
    await expect(reference).toContainText(card.es);
    await expect(reference).toContainText(card.note);
  }
  await page.setViewportSize(testInfo.project.use.viewport);
  if (captureReference)
    await page.screenshot({ path: `.qa/quiz-consult-${testInfo.project.name}.png`, fullPage: false });
  await reference.getByRole("button", { name: `Escuchar ${first.cards[0].de}`, exact: true }).click();
  await expect(reference.locator(".reference-audio-status")).toBeVisible();
  await expect(reference.locator(".reference-audio-status")).toContainText("Añade una voz alemana");
  await reference.getByRole("button", { name: "Volver al quiz", exact: true }).click();
  await expect(reference).not.toBeVisible();
  await expect(consult).toBeFocused();
  await expect(selected).toHaveClass(/selected/);
  await expect(page.locator(".exercise-stage h1")).toHaveText(first.exercises[0].prompt);
  expect(await progressSnapshot()).toEqual(beforeConsult);
  await consult.click();
  await expect(reference).toBeVisible();
  await expect(reference.locator(".reference-audio-status")).toBeEmpty();
  await page.keyboard.press("Escape");
  await expect(reference).not.toBeVisible();

  await page.getByRole("button", { name: "Comprobar", exact: true }).click();
  await expect(page.locator(".answer-feedback")).toContainText("Vamos a aprender de esta.");
  const afterAnswer = await progressSnapshot();
  await consult.click();
  await expect(reference).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(reference).not.toBeVisible();
  await expect(consult).toBeFocused();
  await expect(selected).toBeDisabled();
  await expect(page.locator(".answer-feedback")).toContainText("Vamos a aprender de esta.");
  expect(await progressSnapshot()).toEqual(afterAnswer);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await answer(page, first.exercises[1]);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();

  // Preserve a draft, including special characters, when the consultation is dismissed.
  const written = page.getByRole("textbox", { name: "Tu respuesta en alemán" });
  await written.fill("Mir geht es gü");
  await consult.click();
  await expect(reference).toBeVisible();
  await reference.getByRole("button", { name: "Cerrar consulta", exact: true }).click();
  await expect(written).toHaveValue("Mir geht es gü");
  await expect(page.locator(".exercise-stage h1")).toHaveText(first.exercises[2].prompt);
  await answer(page, first.exercises[2]);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();

  const order = first.exercises[3];
  for (const token of order.tokens.slice(0, 2))
    await page.locator(".token-bank").getByRole("button", { name: token, exact: true }).click();
  const partialSentence = await page.locator(".sentence-output").innerText();
  await consult.click();
  await expect(reference).toBeVisible();
  await reference.getByRole("button", { name: "Volver al quiz", exact: true }).click();
  await expect(page.locator(".sentence-output")).toHaveText(partialSentence, { useInnerText: true });
  for (const token of order.tokens.slice(0, 2))
    await expect(page.locator(".token-bank").getByRole("button", { name: token, exact: true, includeHidden: true })).toBeDisabled();
  for (const token of order.tokens.slice(2))
    await page.locator(".token-bank").getByRole("button", { name: token, exact: true }).click();
  await page.getByRole("button", { name: "Comprobar", exact: true }).click();
  await expect(page.locator(".answer-feedback")).toContainText("¡Bien! Sehr gut.");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  for (const exercise of first.exercises.slice(4)) {
    await answer(page, exercise);
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
  }

  // The one mistake still appears exactly once in the second round.
  await expect(page.locator(".exercise-kind")).toContainText("SEGUNDA VUELTA");
  await answer(page, first.exercises[0]);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".session-finish")).toContainText("Acertaste 5 de 6");
  expect(await progressSnapshot()).toEqual({ xp: 63, answers: 7 });
  expect(errors).toEqual([]);
});

test("grammar help explains unfamiliar words without interrupting study or the quiz", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const captureHelp = process.env.WORT_HELP_SCREENSHOTS === "1";
  await page.goto("/");
  await page.getByRole("button", { name: "Empezar mi primera lección" }).click();
  await expect(page.locator(".lesson-tip")).not.toContainText(/dativo/i);
  if (captureHelp) {
    await mkdir(".qa", { recursive: true });
    await page.screenshot({ path: `.qa/grammar-tip-${testInfo.project.name}.png`, fullPage: true });
  }

  const help = page.locator("#tip-help");
  const studyHelp = page.locator('.lesson-tip [data-tip-help="trato"]');
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    "study tip fits at 320px").toBe(true);
  await studyHelp.click();
  await expect(help).toBeVisible();
  await expect(help.getByRole("heading", { name: "¿Cuándo uso du o Sie?", exact: true })).toBeVisible();
  await expect(help).toContainText("Wie heißt du?");
  await expect(help).toContainText("Wie heißen Sie?");
  await expect(help).toContainText("¿Cómo te llamas?");
  await expect(help).toContainText("¿Cómo se llama usted?");
  expect(await help.evaluate(dialog => {
    const bounds = dialog.getBoundingClientRect();
    return dialog.scrollWidth <= dialog.clientWidth && bounds.left >= 0 && bounds.right <= window.innerWidth;
  }), "grammar popup fits at 320px").toBe(true);
  await page.keyboard.press("Escape");
  await expect(help).not.toBeVisible();
  await expect(studyHelp).toBeFocused();
  await expect(page.locator(".flashcard h1")).toHaveText(first.cards[0].de);
  await expect(page.locator("#prev-card")).toBeDisabled();
  await page.setViewportSize(testInfo.project.use.viewport);

  for (let index = 0; index < first.cards.length; index++)
    await page.locator("#next-card").click();
  const question = page.locator(".exercise-stage h1");
  await expect(question).toHaveText(first.exercises[0].prompt);
  const selected = page.locator("[data-option]").filter({ hasText: first.exercises[0].answer });
  await selected.click();
  const progressSnapshot = () => page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem("wort-progress") || "{}");
    return {
      xp: progress.xp || 0,
      answers: Object.values(progress.activity || {}).reduce((sum, day) => sum + day.answers, 0),
    };
  });
  const beforeHelp = await progressSnapshot();
  await page.locator("#consult-words").click();
  const reference = page.locator("#lesson-reference");
  const referenceHelp = reference.locator('[data-tip-help="formas"]');
  await referenceHelp.click();
  await expect(help).toBeVisible();
  await expect(help.getByRole("heading", { name: "¿Por qué aparecen dir e Ihnen?", exact: true })).toBeVisible();
  for (const phrase of ["Wie geht es dir?", "Wie geht es Ihnen?", "Und dir?", "Und Ihnen?"])
    await expect(help).toContainText(phrase);
  if (captureHelp)
    await page.screenshot({ path: `.qa/grammar-help-${testInfo.project.name}.png`, fullPage: false });

  // Closing the top popup must leave the word consultation and quiz untouched.
  await help.getByRole("button", { name: "Cerrar explicación", exact: true }).click();
  await expect(help).not.toBeVisible();
  await expect(reference).toHaveAttribute("open", "");
  await expect(referenceHelp).toBeFocused();
  await referenceHelp.click();
  await help.getByRole("button", { name: "Cerrar ayuda", exact: true }).click();
  await expect(reference).toHaveAttribute("open", "");
  await expect(referenceHelp).toBeFocused();
  await reference.getByRole("button", { name: "Volver al quiz", exact: true }).click();
  await expect(question).toHaveText(first.exercises[0].prompt);
  await expect(selected).toHaveClass(/selected/);
  await expect(page.getByRole("button", { name: "Comprobar", exact: true })).toBeEnabled();
  expect(await progressSnapshot()).toEqual(beforeHelp);
  expect(errors).toEqual([]);
});

test("dictionary, settings, backup import/export and reset use real persisted data", async ({
  page,
}) => {
  await page.goto("/");
  await nav(page, "words");
  await page
    .getByRole("searchbox", { name: "Buscar en alemán o español" })
    .fill("Hallo");
  await expect(page.locator(".word-row")).toHaveCount(1);
  await expect(page.locator(".word-row")).toContainText("¡Hola!");
  await page.getByRole("searchbox").fill("nonexistent-word-123");
  await expect(
    page.getByRole("heading", { name: "No encontramos esa palabra." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abrir ajustes" }).click();
  await page.getByLabel("Meta de respuestas al día").selectOption("15");
  await page.getByLabel("Velocidad del audio").selectOption("0.65");
  await page.reload();
  await expect(page.getByLabel("Meta de respuestas al día")).toHaveValue("15");
  await expect(page.getByLabel("Velocidad del audio")).toHaveValue("0.65");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar progreso" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(
    /^wort-progreso-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const path = await download.path();
  await page
    .getByRole("button", { name: "Borrar mi progreso", exact: true })
    .click();
  await page.getByRole("button", { name: "Conservar mi progreso" }).click();
  await expect(page.getByLabel("Meta de respuestas al día")).toHaveValue("15");
  await page
    .getByRole("button", { name: "Borrar mi progreso", exact: true })
    .click();
  await page.getByRole("button", { name: "Sí, borrar mi progreso" }).click();
  await expect(page.getByLabel("Meta de respuestas al día")).toHaveValue("10");
  await page.locator("#import-progress").setInputFiles(path);
  await page
    .getByRole("button", { name: "Sí, importar y reemplazar", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Progreso importado.");
  await expect(page.getByLabel("Meta de respuestas al día")).toHaveValue("15");
  await page.locator("#import-progress").setInputFiles({
    name: "corrupt.json",
    mimeType: "application/json",
    buffer: Buffer.from("{invalid}"),
  });
  await expect(page.getByRole("status")).toContainText("No se pudo importar.");
  await expect(page.getByLabel("Meta de respuestas al día")).toHaveValue("15");
});

test("service worker serves the app and lesson modules without a connection", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Empezar mi primera lección" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Empezar mi primera lección" })
    .click();
  await expect(page.locator(".flashcard h1")).toHaveText("Hallo!");
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  await nav(page, "words");
  await expect(page.locator(".word-row")).toHaveCount(64);
  await context.setOffline(false);
});
