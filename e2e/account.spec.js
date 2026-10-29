import { test, expect } from "@playwright/test";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { lessons } from "../src/curriculum.js";

// Opt in explicitly: these tests create two disposable real Neon Auth accounts.
// They never send password-reset/verification mail or complete Google consent.
const baseURL = process.env.WORT_TEST_BASE_URL || "http://localhost:4173";
const captureScreenshots = process.env.WORT_ACCOUNT_SCREENSHOTS === "1";
test.use({ baseURL, trace: "off", screenshot: "off", video: "off" });

const enabled = process.env.WORT_LIVE_AUTH_TESTS === "1";

async function navigate(page, view) {
  await page.locator(`button[data-view="${view}"]:visible`).first().click();
}

async function accountPage(page) {
  await navigate(page, "account");
  await expect(page.locator(".account-checking")).toHaveCount(0, {
    timeout: 20000,
  });
}

async function waitSaved(page) {
  await accountPage(page);
  const dot = page.locator(".account-sync-state .sync-dot");
  await expect(dot).toHaveClass(/saved|error|offline/, { timeout: 30000 });
  await expect(
    dot,
    "Online account sync must finish without a terminal error",
  ).toHaveClass(/saved/, { timeout: 1000 });
}

async function signIn(page, fixture) {
  await accountPage(page);
  await page.getByRole("tab", { name: "Entrar", exact: true }).click();
  await page.getByLabel("Correo electrónico").fill(fixture.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(fixture.password);
  await page
    .getByRole("button", { name: "Entrar a Wort", exact: true })
    .click();
  await expect(page.locator("#sign-out")).toBeVisible({ timeout: 20000 });
  await waitSaved(page);
}

async function signUp(page, fixture) {
  await accountPage(page);
  await page.getByRole("tab", { name: "Crear cuenta", exact: true }).click();
  await page.getByLabel("Cómo quieres que te llamemos").fill(fixture.name);
  await page.getByLabel("Correo electrónico").fill(fixture.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(fixture.password);
  const registration = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/sign-up/email") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Crear mi cuenta", exact: true })
    .click();
  const response = await registration;
  // Retain only the fixture's user ID; never log response bodies or cookies.
  const data = await response.json().catch(() => null);
  fixture.id = data?.user?.id || null;
  const confirmation = page
    .locator(".account-message")
    .filter({ hasText: /confirmar|confirma|correo para confirmar/i });
  if (await confirmation.count())
    throw new Error(
      "STOP: Neon requested email verification. No mail flow was continued.",
    );
  expect(response.status(), "Signup HTTP status").toBe(200);
  await expect(page.locator("#sign-out")).toBeVisible({ timeout: 20000 });
  fixture.id ||= await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("wort-last-user") || "null")?.id || null,
  );
  expect(typeof fixture.id, "Created fixture has an ID").toBe("string");
  await appendFile(
    ".qa/account-fixtures.jsonl",
    JSON.stringify({ id: fixture.id, email: fixture.email }) + "\n",
  );
  await waitSaved(page);
}

async function completeFirstLesson(page) {
  const lesson = lessons[0];
  await navigate(page, "learn");
  await page
    .getByRole("button", { name: "Empezar mi primera lección" })
    .click();
  for (let index = 0; index < lesson.cards.length; index++)
    await page.locator("#next-card").click();
  for (const exercise of lesson.exercises) {
    await expect(page.locator(".exercise-stage h1")).toHaveText(
      exercise.prompt,
    );
    if (exercise.type === "choice" || exercise.type === "listen") {
      await page
        .locator("[data-option]")
        .filter({ hasText: exercise.answer })
        .click();
    } else if (exercise.type === "write") {
      await page
        .getByRole("textbox", { name: "Tu respuesta en alemán" })
        .fill(exercise.answer);
    } else {
      for (const word of exercise.tokens)
        await page
          .locator(".token-bank")
          .getByRole("button", { name: word, exact: true })
          .click();
    }
    await page.getByRole("button", { name: "Comprobar", exact: true }).click();
    await expect(page.locator(".answer-feedback")).toContainText("¡Bien!");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
  }
  await expect(page.locator(".session-finish")).toContainText(
    "Acertaste 6 de 6",
  );
  await page.getByRole("button", { name: "Volver a mi ruta" }).click();
  await waitSaved(page);
}

async function cleanup(fixtures) {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url)
    throw new Error(
      "Cleanup requires the private test database configuration.",
    );
  const sql = neon(url);
  for (const fixture of fixtures) {
    if (!fixture.id) {
      // A failed post-signup session may still have created this exact fixture.
      const rows = await sql.query(
        'SELECT id FROM neon_auth."user" WHERE email = $1',
        [fixture.email],
      );
      fixture.id = rows[0]?.id;
    }
    if (!fixture.id) continue;
    if (!/^wort-qa-[a-z0-9-]+@example\.invalid$/.test(fixture.email))
      throw new Error("Refusing an unexpected cleanup identity.");
    // Exact fixture ID plus reserved email prevents removal of unrelated users.
    await sql.query(
      'DELETE FROM public.wort_progress WHERE user_id = $1 AND EXISTS (SELECT 1 FROM neon_auth."user" WHERE id::text = $1 AND email = $2)',
      [fixture.id, fixture.email],
    );
    await sql.query(
      'DELETE FROM neon_auth."user" WHERE id::text = $1 AND email = $2',
      [fixture.id, fixture.email],
    );
  }
}

test("real Neon signup, sessions, cross-device sync, offline outbox and account isolation", async ({
  browser,
  page,
}, testInfo) => {
  test.skip(
    !enabled || testInfo.project.name !== "desktop",
    "Set WORT_LIVE_AUTH_TESTS=1 and run the desktop project to create exactly two test users.",
  );
  test.setTimeout(180000);
  const fixtures = ["A", "B"].map((label) => ({
    name: `Aprendiz de prueba ${label}`,
    email: `wort-qa-${randomUUID()}@example.invalid`,
    password: `Wort!${randomBytes(18).toString("base64url")}`,
    id: null,
  }));
  const mobile = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const second = await mobile.newPage();
  const errors = [];
  const apiStatuses = [];
  const tokenClaims = [];
  let primaryFailure;
  page.on("pageerror", (error) => errors.push(error.message));
  second.on("pageerror", (error) => errors.push(error.message));
  for (const target of [page, second])
    target.on("request", (request) => {
      if (new URL(request.url()).pathname !== "/api/progress") return;
      try {
        const token = (request.headers().authorization || "").replace(
          /^Bearer /,
          "",
        );
        const claims = JSON.parse(
          Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
        );
        tokenClaims.push({
          source: "progress-authorization",
          iss: claims.iss,
          aud: claims.aud,
          role: claims.role,
          iat: claims.iat,
          exp: claims.exp,
          subLooksUuid: /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(
            claims.sub || "",
          ),
        });
      } catch {
        tokenClaims.push({
          source: "progress-authorization",
          jwtLooksValid: false,
        });
      }
    });
  for (const target of [page, second])
    target.on("response", async (response) => {
      const path = new URL(response.url()).pathname;
      if (path.startsWith("/api/"))
        apiStatuses.push({ path, status: response.status() });
      if (path === "/api/auth/token" && response.status() === 200)
        try {
          const data = await response.json();
          const token = data?.token || data?.data?.token;
          if (typeof token === "string") {
            const claims = JSON.parse(
              Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
            );
            tokenClaims.push({
              iss: claims.iss,
              aud: claims.aud,
              role: claims.role,
              iat: claims.iat,
              exp: claims.exp,
              subLooksUuid:
                /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(
                  claims.sub || "",
                ),
            });
          }
        } catch {}
    });
  try {
    await mkdir(".qa", { recursive: true });
    await page.goto("/#account");
    await expect(page.locator(".account-checking")).toHaveCount(0, {
      timeout: 20000,
    });
    await expect(
      page.getByRole("button", { name: "Continuar con Google" }),
    ).toBeEnabled();
    if (captureScreenshots)
      await page.screenshot({
        path: ".qa/account-desktop.png",
        fullPage: true,
      });
    await second.goto("/#account");
    await expect(second.locator(".account-checking")).toHaveCount(0, {
      timeout: 20000,
    });
    if (captureScreenshots)
      await second.screenshot({
        path: ".qa/account-mobile.png",
        fullPage: true,
      });

    await signUp(page, fixtures[0]);
    await navigate(page, "settings");
    await page.getByLabel("Meta de respuestas al día").selectOption("15");
    await completeFirstLesson(page);
    await page.reload();
    await expect(page.locator("#sign-out")).toBeVisible({ timeout: 20000 });
    await waitSaved(page);

    await signIn(second, fixtures[0]);
    if (captureScreenshots)
      await second.screenshot({
        path: ".qa/account-signedin.png",
        fullPage: true,
      });
    await navigate(second, "learn");
    await expect(second.locator(".route-total")).toHaveText(
      "1 de 8 completadas",
    );
    await navigate(second, "settings");
    await expect(second.getByLabel("Meta de respuestas al día")).toHaveValue(
      "15",
    );
    await second.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await mobile.setOffline(true);
    await second.getByLabel("Meta de respuestas al día").selectOption("20");
    await accountPage(second);
    await expect(second.locator(".account-sync-state .sync-dot")).toHaveClass(
      /offline/,
      { timeout: 15000 },
    );
    const pending = await second.evaluate(() =>
      Object.keys(localStorage).some(
        (key) => key.startsWith("wort-account:") && key.includes(":outbox:"),
      ),
    );
    expect(pending, "Offline writes remain in a durable account outbox").toBe(
      true,
    );
    await mobile.setOffline(false);
    await expect(second.locator(".account-sync-state .sync-dot")).toHaveClass(
      /saved/,
      { timeout: 30000 },
    );
    await page.locator("#sync-now").click();
    await expect(page.locator(".account-sync-state .sync-dot")).toHaveClass(
      /saved/,
      { timeout: 30000 },
    );
    await navigate(page, "settings");
    await expect(page.getByLabel("Meta de respuestas al día")).toHaveValue(
      "20",
    );

    await accountPage(second);
    await second.locator("#sign-out").click();
    await expect(second.locator("#account-form")).toBeVisible({
      timeout: 20000,
    });
    await navigate(second, "learn");
    await expect(second.locator(".route-total")).toHaveText(
      "0 de 8 completadas",
    );
    await signUp(second, fixtures[1]);
    expect(
      fixtures[1].id === fixtures[0].id,
      "Accounts have distinct identities",
    ).toBe(false);
    await navigate(second, "learn");
    await expect(second.locator(".route-total")).toHaveText(
      "0 de 8 completadas",
    );
    await navigate(second, "settings");
    await expect(second.getByLabel("Meta de respuestas al día")).toHaveValue(
      "10",
    );
    await second.reload();
    await expect(second.getByLabel("Meta de respuestas al día")).toHaveValue(
      "10",
    );
    await accountPage(second);
    await second.locator("#sign-out").click();
    await expect(second.locator("#account-form")).toBeVisible({
      timeout: 20000,
    });
    await signIn(second, fixtures[0]);
    await navigate(second, "learn");
    await expect(second.locator(".route-total")).toHaveText(
      "1 de 8 completadas",
    );
    await accountPage(second);
    await second.locator("#sign-out").click();
    await expect(second.locator("#account-form")).toBeVisible({
      timeout: 20000,
    });

    // Inspect only Google's redirect URL; do not open login or consent pages.
    await second.route("https://accounts.google.com/**", (route) =>
      route.abort(),
    );
    const googleDestination = second
      .waitForRequest(
        (request) => new URL(request.url()).hostname === "accounts.google.com",
      )
      .catch(() => null);
    const social = second.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/sign-in/social") &&
        response.request().method() === "POST",
    );
    await second.getByRole("button", { name: "Continuar con Google" }).click();
    const response = await social;
    expect(response.status(), "Google OAuth initiation HTTP status").toBe(200);
    const destination = await googleDestination;
    expect(
      destination,
      "Google OAuth initiates a provider navigation",
    ).not.toBeNull();
    expect(
      new URL(destination.url()).hostname,
      "OAuth provider destination",
    ).toBe("accounts.google.com");
    expect(errors).toEqual([]);
  } catch (error) {
    primaryFailure = error;
    console.log(
      "Auth/sync HTTP diagnostics (no bodies or credentials): " +
        JSON.stringify(apiStatuses),
    );
    if (
      apiStatuses.some(
        (item) => item.path === "/api/progress" && item.status === 401,
      )
    )
      console.log(
        "Selected JWT claim diagnostics: " + JSON.stringify(tokenClaims),
      );
    throw error;
  } finally {
    await mobile.close();
    try {
      await cleanup(fixtures);
    } catch {
      if (primaryFailure)
        console.warn(
          "Disposable Neon user cleanup failed; private details suppressed.",
        );
      else
        throw new Error(
          "Disposable Neon user cleanup failed; private error details were suppressed.",
        );
    }
  }
});

test("Google OAuth initiation reaches the configured provider without opening consent", async ({page}, testInfo) => {
  test.skip(process.env.WORT_GOOGLE_AUTH_TESTS !== "1" || testInfo.project.name !== "desktop", "Opt in with WORT_GOOGLE_AUTH_TESTS=1; no users are created.");
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  // Abort at the provider boundary before Google loads personal login or consent.
  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.goto("/#account");
  await expect(page.getByRole("button", {name: "Continuar con Google"})).toBeEnabled({timeout: 20000});
  const destination = page.waitForRequest(request => new URL(request.url()).hostname === "accounts.google.com").catch(() => null);
  const social = page.waitForResponse(response => response.url().endsWith("/api/auth/sign-in/social") && response.request().method() === "POST");
  await page.getByRole("button", {name: "Continuar con Google"}).click();
  const response = await social;
  expect(response.status(), "Configured Google OAuth initiation HTTP status").toBe(200);
  const target = await destination;
  expect(target, "Google provider navigation is initiated").not.toBeNull();
  expect(new URL(target.url()).hostname).toBe("accounts.google.com");
  expect(errors).toEqual([]);
});
