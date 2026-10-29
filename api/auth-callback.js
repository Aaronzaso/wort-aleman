import {
  NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAME,
  parseCookieValue,
  processAuthMiddleware,
} from "@neondatabase/auth/server";
import { authConfiguration } from "../server/auth.js";
import {
  header,
  noStore,
  requestOrigin,
  sendJson,
  toFetchRequest,
} from "../server/http.js";

const VERIFIER_PARAM = "neon_auth_session_verifier";
const CALLBACK_PATH = "/api/auth-callback";
const FAILURE_LOCATION = "/?authError=google#account";

export const config = { api: { bodyParser: false } };

function redirect(res, location) {
  res.statusCode = 303;
  res.setHeader("Location", location);
  res.end();
}

function validVerifier(url) {
  const values = url.searchParams.getAll(VERIFIER_PARAM);
  return (
    values.length === 1 &&
    values[0].length > 0 &&
    values[0].length <= 8192 &&
    !/[\s\u0000-\u001f\u007f]/u.test(values[0])
  );
}

function hasChallenge(req) {
  const cookies = header(req, "cookie") || "";
  // The SDK accepts the legacy misspelling while older OAuth sessions expire.
  const names = [
    NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAME,
    NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAME.replace(
      "session_challenge",
      "session_challange",
    ),
  ];
  return names.some((name) => Boolean(parseCookieValue(cookies, name)));
}

export function createAuthCallbackHandler({
  process = processAuthMiddleware,
  configuration = authConfiguration,
} = {}) {
  return async function handler(req, res) {
    noStore(res);
    res.setHeader("Referrer-Policy", "no-referrer");
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return sendJson(res, 405, { error: "Este método no está disponible." });
    }
    try {
      const origin = requestOrigin(req);
      const url = new URL(req.url, origin);
      if (!validVerifier(url) || !hasChallenge(req))
        return redirect(res, FAILURE_LOCATION);
      const { baseUrl, cookieSecret } = configuration();
      if (typeof cookieSecret !== "string" || cookieSecret.length < 32)
        return redirect(res, FAILURE_LOCATION);

      // The SDK performs the actual verifier/challenge exchange. Only this
      // parameter is needed; never forward caller-supplied next/redirect URLs.
      const incoming = await toFetchRequest(req);
      const cleanUrl = new URL(CALLBACK_PATH, origin);
      cleanUrl.searchParams.set(
        VERIFIER_PARAM,
        url.searchParams.get(VERIFIER_PARAM),
      );
      const headers = new Headers(incoming.headers);
      headers.set("Origin", origin);
      headers.delete("Referer");
      const request = new Request(cleanUrl, { method: "GET", headers });
      const result = await process({
        request,
        pathname: CALLBACK_PATH,
        skipRoutes: [CALLBACK_PATH],
        // '/' would skip middleware before it can exchange the verifier.
        loginUrl: "/sign-in",
        baseUrl,
        cookieSecret,
        sameSite: "lax",
        sessionDataTtl: 60,
        log: { debug() {}, info() {}, warn() {}, error() {} },
      });
      if (result.action !== "redirect_oauth")
        return redirect(res, FAILURE_LOCATION);

      // MiddlewareResult cookies are already serialized by the SDK. Preserve
      // the array; joining would corrupt Expires commas and session cookies.
      if (Array.isArray(result.cookies) && result.cookies.length)
        res.setHeader("Set-Cookie", result.cookies);
      for (const [name, value] of Object.entries(result.headers || {}))
        if (/^x-neon-auth-[a-z-]+$/i.test(name) && typeof value === "string")
          res.setHeader(name, value);
      // Root UI still calls getSession: a callback never asserts an identity.
      return redirect(res, "/#account");
    } catch {
      // Never reflect a verifier, OAuth code, upstream URL or error text.
      return redirect(res, FAILURE_LOCATION);
    }
  };
}

export default createAuthCallbackHandler();
