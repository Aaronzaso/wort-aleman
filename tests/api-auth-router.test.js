import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { routedAuthUrl, createAuthRouterHandler } from "../api/auth-router.js";
import { createAuthHandler } from "../api/auth/[...path].js";

function request(
  url,
  { query, body = "", origin = "https://wort.example" } = {},
) {
  return Object.assign(Readable.from(body ? [Buffer.from(body)] : []), {
    method: body ? "POST" : "GET",
    url,
    query,
    socket: {},
    headers: {
      host: "wort.example",
      "x-forwarded-proto": "https",
      origin,
      "content-type": "application/json",
    },
  });
}
function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(body) {
      this.body = body?.toString() || "";
    },
  };
}

test("auth router keeps original multi-segment paths and their query intact", () => {
  const url =
    "/api/auth/sign-in/email?callbackURL=https%3A%2F%2Fwort.example%2F&disableRedirect=true";
  assert.equal(
    routedAuthUrl(request(url, { query: { authPath: "sign-in/email" } })),
    url,
  );
});

test("rewritten router URL restores multi-segment path and removes only its control query", () => {
  const url = routedAuthUrl(
    request(
      "/api/auth-router?authPath=sign-in%2Femail&nonce=one%2Btwo&disableRedirect=true",
    ),
  );
  const parsed = new URL(url, "https://wort.example");
  assert.equal(parsed.pathname, "/api/auth/sign-in/email");
  assert.equal(parsed.searchParams.has("authPath"), false);
  assert.equal(parsed.searchParams.get("nonce"), "one+two");
  assert.equal(parsed.searchParams.get("disableRedirect"), "true");
});

test("router also accepts Vercel's parsed route query when absent from req.url", () => {
  assert.equal(
    routedAuthUrl(
      request("/api/auth-router?nonce=test", {
        query: { authPath: "sign-in/social" },
      }),
    ),
    "/api/auth/sign-in/social?nonce=test",
  );
});

test("router rejects absent, duplicate, array and contradictory routing metadata", () => {
  for (const req of [
    request("/api/auth-router"),
    request("/api/auth-router?authPath="),
    request("/api/auth-router?authPath=token&authPath=get-session"),
    request("/api/auth-router", { query: { authPath: ["sign-in", "email"] } }),
    request("/api/auth-router?authPath=token", {
      query: { authPath: "get-session" },
    }),
  ])
    assert.throws(() => routedAuthUrl(req), { status: 400 });
});

test("router rejects traversal, absolute URLs and double decoding before URL normalization", () => {
  for (const path of [
    "../token",
    "sign-in/../token",
    "https://attacker.example",
    "/get-session",
    "//attacker.example",
    "token%2fother",
    ".well-known/jwks.json",
    "get-session?other=1",
    "get-session#token",
    "sign-in\\email",
    "sign-in//email",
  ]) {
    assert.throws(
      () =>
        routedAuthUrl(
          request(`/api/auth-router?authPath=${encodeURIComponent(path)}`),
        ),
      { status: 400 },
    );
  }
  assert.throws(() => routedAuthUrl(request("/api/auth/../token")), {
    status: 400,
  });
  assert.throws(() => routedAuthUrl(request("/api/other?authPath=token")), {
    status: 404,
  });
});

test("rewritten POST reaches the existing Neon proxy with its original body and same-origin protection", async () => {
  let seen;
  const realHandler = createAuthHandler({
    configuration: () => ({
      baseUrl: "https://auth.example/neondb/auth",
      cookieSecret: "test-secret-that-is-at-least-thirty-two-characters",
    }),
    proxy: async (value) => {
      seen = value;
      assert.deepEqual(await value.request.json(), {
        email: "test@example.test",
      });
      return Response.json({ accepted: true });
    },
  });
  const router = createAuthRouterHandler({ handle: realHandler });
  const original = "/api/auth-router?authPath=sign-in%2Femail&nonce=ok";
  const req = request(original, { body: '{"email":"test@example.test"}' });
  const res = response();
  await router(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(seen.path, "sign-in/email");
  assert.equal(new URL(seen.request.url).pathname, "/api/auth/sign-in/email");
  assert.equal(new URL(seen.request.url).searchParams.has("authPath"), false);
  assert.equal(req.url, original);
  assert.match(res.headers["cache-control"], /no-store/);

  const denied = response();
  await router(
    request(original, { body: "{}", origin: "https://attacker.example" }),
    denied,
  );
  assert.equal(denied.statusCode, 403);
});

test("invalid router requests never call the proxy and never expose their path in errors", async () => {
  const router = createAuthRouterHandler({
    handle: async () => assert.fail("invalid routes must not call Neon"),
  });
  const req = request(
    "/api/auth-router?authPath=https%3A%2F%2Fdo-not-leak.example",
  );
  const res = response();
  await router(req, res);
  assert.equal(res.statusCode, 400);
  assert.ok(!res.body.includes("do-not-leak"));
  assert.equal(
    req.url,
    "/api/auth-router?authPath=https%3A%2F%2Fdo-not-leak.example",
  );
});
