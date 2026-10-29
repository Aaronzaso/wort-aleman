import authHandler, { authPath } from "./auth/[...path].js";
import { HttpError, noStore, sendError } from "../server/http.js";

export const config = { api: { bodyParser: false } };

/**
 * Vercel rewrites the entire /api/auth/:path* tree to this single function.
 * Some runtimes retain the original URL; others expose the destination URL
 * and decoded routing query. Both forms end at the same validated proxy.
 */
export function routedAuthUrl(req) {
  const incoming = typeof req.url === "string" ? req.url : "";
  const queryAt = incoming.indexOf("?");
  const rawPath = queryAt < 0 ? incoming : incoming.slice(0, queryAt);
  if (rawPath.startsWith("/api/auth/")) {
    authPath({ url: incoming });
    return incoming;
  }
  if (rawPath !== "/api/auth-router")
    throw new HttpError(404, "Ruta no disponible.");

  const params = new URLSearchParams(
    queryAt < 0 ? "" : incoming.slice(queryAt + 1),
  );
  const candidates = params.getAll("authPath");
  const routingValue = req.query?.authPath;
  if (candidates.length > 1 || Array.isArray(routingValue))
    throw new HttpError(400, "Ruta de cuenta no válida.");
  const path = candidates[0] ?? routingValue;
  if (typeof path !== "string" || !path)
    throw new HttpError(400, "Ruta de cuenta no válida.");
  if (candidates.length && routingValue !== undefined && routingValue !== path)
    throw new HttpError(400, "Ruta de cuenta no válida.");

  // Validate before constructing a URL, so URL normalization cannot erase
  // traversal or reinterpret a caller-supplied absolute URL.
  const destination = `/api/auth/${path}`;
  if (authPath({ url: destination }) !== path)
    throw new HttpError(400, "Ruta de cuenta no válida.");
  params.delete("authPath");
  const search = params.toString();
  return search ? `${destination}?${search}` : destination;
}

export function createAuthRouterHandler({ handle = authHandler } = {}) {
  return async function handler(req, res) {
    const originalUrl = req.url;
    noStore(res);
    try {
      req.url = routedAuthUrl(req);
      // Keep the original IncomingMessage: spreading it would lose its stream
      // iterator, breaking raw JSON bodies and the SDK's request bridge.
      await handle(req, res);
    } catch (error) {
      sendError(res, error);
    } finally {
      req.url = originalUrl;
    }
  };
}

export default createAuthRouterHandler();
