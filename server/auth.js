import { createRemoteJWKSet, jwtVerify } from "jose";
import { HttpError, header } from "./http.js";

let activeVerifier;
let activeBaseUrl;

export function authConfiguration(env = process.env) {
  if (!env.NEON_AUTH_BASE_URL)
    throw new HttpError(503, "El inicio de sesión aún no está configurado.");
  const url = new URL(env.NEON_AUTH_BASE_URL);
  if (url.protocol !== "https:")
    throw new HttpError(503, "El inicio de sesión aún no está configurado.");
  return {
    baseUrl: url.href.replace(/\/$/, ""),
    origin: url.origin,
    cookieSecret: env.NEON_AUTH_COOKIE_SECRET,
  };
}

/** Both issuer and audience are the Neon Auth origin, as documented by Neon. */
export function createTokenVerifier({ baseUrl, jwks } = {}) {
  const base = new URL(baseUrl);
  const keySet =
    jwks ||
    createRemoteJWKSet(
      new URL(`${base.href.replace(/\/$/, "")}/.well-known/jwks.json`),
      {
        timeoutDuration: 8000,
        cooldownDuration: 30000,
        cacheMaxAge: 10 * 60 * 1000,
      },
    );
  return async (token) => {
    const { payload } = await jwtVerify(token, keySet, {
      issuer: base.origin,
      audience: base.origin,
      algorithms: ["EdDSA"],
      requiredClaims: ["exp", "iat", "sub", "iss", "aud"],
      maxTokenAge: "16m",
      clockTolerance: 10,
    });
    if (
      payload.role !== "authenticated" ||
      payload.banned === true ||
      typeof payload.sub !== "string" ||
      !/^[a-zA-Z0-9_-]{1,200}$/.test(payload.sub)
    )
      throw new HttpError(401, "Inicia sesión para guardar tu progreso.");
    return payload.sub;
  };
}

export async function authenticate(req) {
  const authorization = header(req, "authorization") || "";
  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  if (!match || match[1].length > 16000)
    throw new HttpError(401, "Inicia sesión para guardar tu progreso.");
  const { baseUrl } = authConfiguration();
  if (!activeVerifier || activeBaseUrl !== baseUrl) {
    activeVerifier = createTokenVerifier({ baseUrl });
    activeBaseUrl = baseUrl;
  }
  try {
    return await activeVerifier(match[1]);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error?.code === "ERR_JWKS_TIMEOUT" || error instanceof TypeError)
      throw new HttpError(
        503,
        "No pudimos validar tu sesión. Inténtalo de nuevo.",
      );
    throw new HttpError(
      401,
      "Tu sesión necesita renovarse. Vuelve a iniciar sesión.",
    );
  }
}
