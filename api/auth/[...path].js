import { handleAuthProxyRequest } from "@neondatabase/auth/server";
import { authConfiguration } from "../../server/auth.js";
import {
  HttpError,
  assertSameOrigin,
  noStore,
  sendError,
  sendFetchResponse,
  toFetchRequest,
} from "../../server/http.js";

export const config = { api: { bodyParser: false } };

export function authPath(req) {
  // Inspect the raw path before URL normalization can erase dot segments.
  const rawPath = (req.url || "").split("?")[0];
  const prefix = "/api/auth/";
  if (!rawPath.startsWith(prefix))
    throw new HttpError(404, "Ruta no disponible.");
  const path = rawPath.slice(prefix.length);
  if (!path || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path))
    throw new HttpError(400, "Ruta de cuenta no válida.");
  return path;
}

export function createAuthHandler({
  proxy = handleAuthProxyRequest,
  configuration = authConfiguration,
} = {}) {
  return async function handler(req, res) {
    noStore(res);
    try {
      if (!["GET", "POST"].includes(req.method)) {
        res.setHeader("Allow", "GET, POST");
        throw new HttpError(405, "Este método no está disponible.");
      }
      const path = authPath(req);
      assertSameOrigin(req, { required: req.method === "POST" });
      const { baseUrl, cookieSecret } = configuration();
      if (typeof cookieSecret !== "string" || cookieSecret.length < 32)
        throw new HttpError(
          503,
          "El inicio de sesión aún no está configurado.",
        );
      const request = await toFetchRequest(req);
      const response = await proxy({
        request,
        path,
        baseUrl,
        cookieSecret,
        sameSite: "lax",
        sessionDataTtl: 60,
      });
      await sendFetchResponse(res, response);
    } catch (error) {
      sendError(res, error);
    }
  };
}

export default createAuthHandler();
