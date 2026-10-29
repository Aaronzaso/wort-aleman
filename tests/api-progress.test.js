import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import {
  createProgressHandler,
  validateProgressWrite,
} from "../api/progress.js";
import { createAuthHandler, authPath } from "../api/auth/[...path].js";
import { HttpError } from "../server/http.js";
import { createProgressDocument } from "../src/progress-sync.js";
import { initialState } from "../src/learning.js";

const document = () => createProgressDocument(initialState(), "device-a", 1);
function request(method, payload, extra = {}) {
  const raw =
    payload === undefined
      ? ""
      : typeof payload === "string"
        ? payload
        : JSON.stringify(payload);
  const req = Readable.from(raw ? [Buffer.from(raw)] : []);
  Object.assign(req, {
    method,
    url: "/api/progress",
    socket: {},
    headers: {
      host: "wort.example",
      "x-forwarded-proto": "https",
      origin: "https://wort.example",
      "content-type": "application/json",
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
    end(data) {
      this.raw = Buffer.from(data || "").toString("utf8");
    },
    json() {
      return JSON.parse(this.raw);
    },
  };
}
async function call(handler, req) {
  const res = response();
  await handler(req, res);
  return res;
}

test("unauthenticated progress calls do not read or modify the database", async () => {
  const handler = createProgressHandler({
    identify: async () => {
      throw new HttpError(401, "Inicia sesión.");
    },
    store: {
      get() {
        assert.fail("database must not run");
      },
    },
  });
  const res = await call(handler, request("GET"));
  assert.equal(res.statusCode, 401);
  assert.match(res.headers["cache-control"], /no-store/);
});

test("progress ownership always comes from the verified session, never the body", async () => {
  let receivedId;
  const doc = document();
  const handler = createProgressHandler({
    identify: async () => "account-a",
    store: {
      async save(id, value, revision) {
        receivedId = id;
        assert.deepEqual(value, doc);
        assert.equal(revision, 0);
        return { saved: true, document: value, revision: 1 };
      },
    },
  });
  const res = await call(
    handler,
    request("PUT", { userId: "account-b", document: doc, expectedRevision: 0 }),
  );
  assert.equal(receivedId, "account-a");
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().revision, 1);
  assert.equal(Object.hasOwn(res.json(), "saved"), false);
});

test("conflicting revisions return 409 and the latest document for a safe client merge", async () => {
  const current = { document: document(), revision: 3 };
  const handler = createProgressHandler({
    identify: async () => "account-a",
    store: {
      async save() {
        return { saved: false, ...current };
      },
    },
  });
  const res = await call(
    handler,
    request("PUT", { document: document(), expectedRevision: 2 }),
  );
  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.json(), current);
});

test("concurrent writes with the same revision cannot both succeed", async () => {
  let revision = 0;
  let value = null;
  const handler = createProgressHandler({
    identify: async () => "account-a",
    store: {
      async save(_id, doc, expected) {
        const saved = expected === revision;
        if (saved) {
          value = doc;
          revision++;
        }
        return { saved, document: value, revision };
      },
    },
  });
  const payload = { document: document(), expectedRevision: 0 };
  const results = await Promise.all([
    call(handler, request("PUT", payload)),
    call(handler, request("PUT", payload)),
  ]);
  assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 409]);
  assert.equal(revision, 1);
});

test("progress rejects malformed documents, unsafe revisions, wrong content type and excessive bodies", async () => {
  const handler = createProgressHandler({
    identify: async () => "account-a",
    store: {
      save() {
        assert.fail("invalid data must not be saved");
      },
    },
  });
  for (const payload of [
    {},
    { document: document(), expectedRevision: -1 },
    { document: document(), expectedRevision: Number.MAX_SAFE_INTEGER + 1 },
    { document: { version: 1 }, expectedRevision: 0 },
    "{bad json",
  ]) {
    assert.equal(
      (await call(handler, request("PUT", payload))).statusCode,
      400,
    );
  }
  assert.equal(
    (await call(handler, request("PUT", {}, { "content-type": "text/plain" })))
      .statusCode,
    415,
  );
  assert.equal(
    (await call(handler, request("PUT", "x".repeat(512001)))).statusCode,
    413,
  );
});

test("cross-origin writes and unsupported methods are rejected before identity or database access", async () => {
  const handler = createProgressHandler({
    identify: async () => {
      assert.fail("identity should not be checked");
    },
  });
  assert.equal(
    (
      await call(
        handler,
        request("PUT", {}, { origin: "https://other.example" }),
      )
    ).statusCode,
    403,
  );
  const unsupported = await call(handler, request("DELETE"));
  assert.equal(unsupported.statusCode, 405);
  assert.equal(unsupported.headers.allow, "GET, PUT");
});

test("upstream failures never serialize credentials, SQL errors or stack traces", async () => {
  const handler = createProgressHandler({
    identify: async () => "account-a",
    store: {
      async get() {
        throw Error("database postgres://user:do-not-leak@example/database");
      },
    },
  });
  const res = await call(handler, request("GET"));
  assert.equal(res.statusCode, 503);
  assert.ok(!res.raw.includes("do-not-leak"));
  assert.deepEqual(Object.keys(res.json()), ["error"]);
});

test("canonical progress validation removes untrusted fields without retaining aliases", () => {
  const input = {
    document: { ...document(), secret: "not persisted" },
    expectedRevision: 0,
  };
  const valid = validateProgressWrite(input);
  assert.equal(valid.document.secret, undefined);
  valid.document.completed.push("saludos");
  assert.deepEqual(input.document.completed, []);
});

const configuration = () => ({
  baseUrl: "https://auth.example/neondb/auth",
  cookieSecret: "test-cookie-secret-never-used-outside-tests",
});
test("auth proxy preserves the raw body, query, status and each Set-Cookie header", async () => {
  let captured;
  const handler = createAuthHandler({
    configuration,
    proxy: async (config) => {
      captured = config;
      assert.equal(await config.request.text(), '{"email":"a@example.test"}');
      const headers = new Headers({ "content-type": "application/json" });
      headers.append(
        "set-cookie",
        "session=one; Path=/; HttpOnly; SameSite=Lax",
      );
      headers.append(
        "set-cookie",
        "cache=two; Expires=Wed, 01 Jan 2031 00:00:00 GMT; Path=/; HttpOnly",
      );
      return new Response('{"ok":true}', { status: 201, headers });
    },
  });
  const req = request("POST", '{"email":"a@example.test"}');
  req.url = "/api/auth/sign-in/email?test=1";
  const res = await call(handler, req);
  assert.equal(captured.path, "sign-in/email");
  assert.equal(
    captured.request.url,
    "https://wort.example/api/auth/sign-in/email?test=1",
  );
  assert.equal(captured.sameSite, "lax");
  assert.equal(res.statusCode, 201);
  assert.equal(res.headers["set-cookie"].length, 2);
  assert.match(res.headers["set-cookie"][1], /Expires=Wed, 01 Jan/);
  assert.match(res.headers["cache-control"], /no-store/);
  assert.deepEqual(res.json(), { ok: true });
});

test("auth bridge also supports Vercel's parsed request body", async () => {
  const handler = createAuthHandler({
    configuration,
    proxy: async (config) => {
      assert.deepEqual(await config.request.json(), {
        password: "not-a-real-password",
      });
      return Response.json({ ok: true });
    },
  });
  const req = request("POST");
  req.url = "/api/auth/sign-in/email";
  req.body = { password: "not-a-real-password" };
  assert.equal((await call(handler, req)).statusCode, 200);
});

test("auth proxy rejects traversal, arbitrary URLs and missing origins", async () => {
  for (const url of [
    "/api/auth/../token",
    "/api/auth/%2e%2e/token",
    "/api/auth/https://attacker.example",
    "/api/auth//token",
    "/api/auth/token%2fsecret",
    "/api/auth/.well-known/jwks.json",
  ]) {
    assert.throws(() => authPath({ url }), HttpError);
  }
  const handler = createAuthHandler({
    configuration,
    proxy: async () => {
      assert.fail("proxy should not run");
    },
  });
  const req = request("POST", {});
  req.url = "/api/auth/sign-in/email";
  delete req.headers.origin;
  assert.equal((await call(handler, req)).statusCode, 403);
});

test("missing auth configuration is an actionable 503 without upstream calls", async () => {
  const handler = createAuthHandler({
    configuration: () => ({
      baseUrl: "https://auth.example",
      cookieSecret: "",
    }),
    proxy: async () => {
      assert.fail("proxy should not run");
    },
  });
  const req = request("GET");
  req.url = "/api/auth/get-session";
  assert.equal((await call(handler, req)).statusCode, 503);
});
