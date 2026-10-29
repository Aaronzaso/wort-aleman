/** Node/Vercel bridge shared by the auth proxy and the progress API. */
export const MAX_BODY_BYTES = 500 * 1024;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function header(req, name) {
  const value = req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value.join(", ") : value;
}

export function requestOrigin(req) {
  const host = header(req, "host");
  if (!host || !/^[a-z0-9.:[\]-]+$/i.test(host))
    throw new HttpError(400, "La dirección de la solicitud no es válida.");
  const forwardedProto = header(req, "x-forwarded-proto")?.split(",")[0].trim();
  const protocol =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : req.socket?.encrypted
        ? "https"
        : "http";
  return new URL(`${protocol}://${host}`).origin;
}

export function assertSameOrigin(req, { required = false } = {}) {
  const origin = header(req, "origin");
  if (!origin) {
    if (required) throw new HttpError(403, "Abre esta acción desde Wort.");
    return;
  }
  if (origin !== requestOrigin(req))
    throw new HttpError(403, "La solicitud debe venir de Wort.");
  if (header(req, "sec-fetch-site") === "cross-site")
    throw new HttpError(403, "La solicitud debe venir de Wort.");
}

export async function readBody(req, limit = MAX_BODY_BYTES) {
  const length = Number(header(req, "content-length"));
  if (Number.isFinite(length) && length > limit)
    throw new HttpError(413, "La copia de progreso es demasiado grande.");
  if (req.body !== undefined) {
    const data = Buffer.isBuffer(req.body)
      ? req.body
      : req.body instanceof Uint8Array
        ? Buffer.from(req.body)
        : Buffer.from(
            typeof req.body === "string" ? req.body : JSON.stringify(req.body),
          );
    if (data.length > limit)
      throw new HttpError(413, "La solicitud es demasiado grande.");
    return data;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += data.length;
    if (size > limit)
      throw new HttpError(413, "La solicitud es demasiado grande.");
    chunks.push(data);
  }
  return Buffer.concat(chunks);
}

export async function readJson(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(header(req, "content-type") || ""))
    throw new HttpError(415, "Envía la solicitud en formato JSON.");
  try {
    return JSON.parse((await readBody(req)).toString("utf8"));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "El formato de la solicitud no es válido.");
  }
}

export function noStore(res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

export function sendJson(res, status, value) {
  noStore(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(value));
}

export function sendError(res, error) {
  // Upstream exceptions can contain connection strings. Never serialize them.
  const status = error instanceof HttpError ? error.status : 503;
  const message =
    error instanceof HttpError
      ? error.message
      : "No pudimos conectar con tu cuenta. Inténtalo de nuevo en un momento.";
  sendJson(res, status, { error: message });
}

export async function toFetchRequest(req) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers || {})) {
    if (
      value === undefined ||
      ["host", "connection", "content-length", "transfer-encoding"].includes(
        name,
      )
    )
      continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  const method = (req.method || "GET").toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? undefined : await readBody(req);
  return new Request(new URL(req.url, requestOrigin(req)), {
    method,
    headers,
    body,
  });
}

export async function sendFetchResponse(res, response) {
  res.statusCode = response.status;
  for (const [key, value] of response.headers) {
    if (
      ![
        "set-cookie",
        "transfer-encoding",
        "content-encoding",
        "content-length",
        "connection",
      ].includes(key)
    )
      res.setHeader(key, value);
  }
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader("Set-Cookie", cookies);
  noStore(res);
  res.end(Buffer.from(await response.arrayBuffer()));
}
