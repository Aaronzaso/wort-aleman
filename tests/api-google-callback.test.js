import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createAuthCallbackHandler } from "../api/auth-callback.js";

const verifier = "opaque-verifier-not-an-oauth-code";
const challenge = "__Secure-neon-auth.session_challenge=test-challenge";
const configuration = () => ({
  baseUrl: "https://auth.example/neondb/auth",
  cookieSecret: "test-cookie-secret-not-used-outside-this-unit-test",
});

function request(
  url = `/api/auth-callback?neon_auth_session_verifier=${verifier}`,
  extra = {},
) {
  const req = Readable.from([]);
  Object.assign(req, {
    method: "GET",
    url,
    socket: {},
    headers: {
      host: "wort.example",
      "x-forwarded-proto": "https",
      cookie: challenge,
      referer: "https://accounts.google.com/",
      ...extra,
    },
  });
  return req;
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(value) {
      this.body = value?.toString() || "";
    },
  };
}

async function call(handler, req) {
  const res = response();
  await handler(req, res);
  return res;
}

test("Google callback exchanges the verifier with its challenge and preserves separate cookies", async () => {
  const cookies = [
    "__Secure-neon-auth.session_token=one; Path=/; HttpOnly; Secure; SameSite=Lax",
    "__Secure-neon-auth.session_challenge=; Expires=Wed, 01 Jan 2031 00:00:00 GMT; Path=/; HttpOnly; Secure",
  ];
  let seen;
  const handler = createAuthCallbackHandler({
    configuration,
    process: async (value) => {
      seen = value;
      return {
        action: "redirect_oauth",
        redirectUrl: new URL("https://wort.example/api/auth-callback"),
        cookies,
      };
    },
  });
  const res = await call(handler, request());
  assert.equal(seen.pathname, "/api/auth-callback");
  assert.deepEqual(seen.skipRoutes, ["/api/auth-callback"]);
  assert.equal(seen.loginUrl, "/sign-in");
  assert.equal(seen.sameSite, "lax");
  assert.equal(
    new URL(seen.request.url).searchParams.get("neon_auth_session_verifier"),
    verifier,
  );
  assert.equal(seen.request.headers.get("cookie"), challenge);
  assert.equal(seen.request.headers.get("origin"), "https://wort.example");
  assert.equal(seen.request.headers.get("referer"), null);
  assert.equal(res.statusCode, 303);
  assert.equal(res.headers.location, "/#account");
  assert.deepEqual(res.headers["set-cookie"], cookies);
  assert.match(res.headers["set-cookie"][1], /Expires=Wed, 01 Jan/);
  assert.equal(res.headers["referrer-policy"], "no-referrer");
  assert.match(res.headers["cache-control"], /no-store/);
});

test("callback never uses a raw OAuth code as a session or forwards arbitrary redirect URLs", async () => {
  let invoked = false;
  const handler = createAuthCallbackHandler({
    configuration,
    process: async () => {
      invoked = true;
      assert.fail("a code cannot authenticate");
    },
  });
  const res = await call(
    handler,
    request(
      "/api/auth-callback?code=secret-oauth-code&next=https://attacker.example",
    ),
  );
  assert.equal(invoked, false);
  assert.equal(res.headers.location, "/?authError=google#account");
  assert.equal(res.body, "");
  assert.ok(!JSON.stringify(res).includes("secret-oauth-code"));
});

test("OAuth callback strips extra query parameters and ignores upstream redirect targets", async () => {
  const handler = createAuthCallbackHandler({
    configuration,
    process: async ({ request }) => {
      assert.deepEqual(
        [...new URL(request.url).searchParams.keys()],
        ["neon_auth_session_verifier"],
      );
      return {
        action: "redirect_oauth",
        redirectUrl: new URL("https://attacker.example/"),
        cookies: [],
        headers: {
          location: "https://attacker.example/",
          "x-neon-auth-middleware": "true",
        },
      };
    },
  });
  const res = await call(
    handler,
    request(
      `/api/auth-callback?next=https://attacker.example&neon_auth_session_verifier=${verifier}&code=unused`,
    ),
  );
  assert.equal(res.headers.location, "/#account");
  assert.equal(res.headers["x-neon-auth-middleware"], "true");
});

test("missing challenge, duplicate verifier and malformed verifier redirect to a fixed error", async () => {
  const handler = createAuthCallbackHandler({
    configuration,
    process: async () => {
      assert.fail("invalid callbacks must not reach Neon");
    },
  });
  const missingCookie = request();
  delete missingCookie.headers.cookie;
  for (const req of [
    request("/api/auth-callback"),
    request("/api/auth-callback?neon_auth_session_verifier="),
    request(
      "/api/auth-callback?neon_auth_session_verifier=one&neon_auth_session_verifier=two",
    ),
    request("/api/auth-callback?neon_auth_session_verifier=with%0Anewline"),
    request(
      `/api/auth-callback?neon_auth_session_verifier=${"x".repeat(8193)}`,
    ),
    missingCookie,
  ]) {
    const res = await call(handler, req);
    assert.equal(res.statusCode, 303);
    assert.equal(res.headers.location, "/?authError=google#account");
    assert.equal(res.headers["set-cookie"], undefined);
  }
});

test("allow and login redirects do not falsely imply a successful OAuth exchange", async () => {
  for (const result of [
    { action: "allow" },
    {
      action: "redirect_login",
      redirectUrl: new URL("https://attacker.example"),
    },
  ]) {
    const handler = createAuthCallbackHandler({
      configuration,
      process: async () => result,
    });
    const res = await call(handler, request());
    assert.equal(res.headers.location, "/?authError=google#account");
  }
});

test("callback errors hide token details and unsupported methods cannot mutate auth", async () => {
  const handler = createAuthCallbackHandler({
    configuration,
    process: async () => {
      throw Error("upstream failed with verifier=do-not-leak");
    },
  });
  const failed = await call(handler, request());
  assert.equal(failed.headers.location, "/?authError=google#account");
  assert.ok(!JSON.stringify(failed).includes("do-not-leak"));
  const req = request();
  req.method = "POST";
  const rejected = await call(handler, req);
  assert.equal(rejected.statusCode, 405);
  assert.equal(rejected.headers.allow, "GET");
  assert.equal(rejected.headers["referrer-policy"], "no-referrer");
});
