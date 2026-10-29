import { normalizeProgressDocument } from "../src/progress-sync.js";
import { authenticate } from "../server/auth.js";
import { progressStore } from "../server/progress-store.js";
import {
  HttpError,
  assertSameOrigin,
  noStore,
  readJson,
  sendError,
  sendJson,
} from "../server/http.js";

export const config = { api: { bodyParser: false } };

export function validateProgressWrite(value) {
  const object = (item) =>
    item && typeof item === "object" && !Array.isArray(item);
  const doc = value?.document;
  if (
    !object(value) ||
    !Number.isSafeInteger(value.expectedRevision) ||
    value.expectedRevision < 0 ||
    !object(doc) ||
    doc.version !== 1 ||
    !object(doc.epoch) ||
    !Number.isSafeInteger(doc.epoch.at) ||
    doc.epoch.at < 0 ||
    typeof doc.epoch.id !== "string" ||
    !doc.epoch.id.trim() ||
    doc.epoch.id.length > 200 ||
    !Array.isArray(doc.completed) ||
    !object(doc.activity) ||
    !object(doc.xp) ||
    !object(doc.reviews) ||
    !object(doc.settings)
  )
    throw new HttpError(
      400,
      "La copia de progreso no tiene un formato válido.",
    );
  const normalized = normalizeProgressDocument(doc);
  if (
    normalized.epoch.id !== doc.epoch.id ||
    normalized.epoch.at !== doc.epoch.at
  )
    throw new HttpError(400, "La versión de la copia no es válida.");
  return { document: normalized, expectedRevision: value.expectedRevision };
}

export function createProgressHandler({
  identify = authenticate,
  store = progressStore,
} = {}) {
  return async function handler(req, res) {
    noStore(res);
    try {
      if (!["GET", "PUT"].includes(req.method)) {
        res.setHeader("Allow", "GET, PUT");
        throw new HttpError(405, "Este método no está disponible.");
      }
      assertSameOrigin(req);
      const userId = await identify(req);
      if (req.method === "GET")
        return sendJson(res, 200, await store.get(userId));
      const { document, expectedRevision } = validateProgressWrite(
        await readJson(req),
      );
      const result = await store.save(userId, document, expectedRevision);
      const { saved, ...current } = result;
      return sendJson(res, saved ? 200 : 409, current);
    } catch (error) {
      sendError(res, error);
    }
  };
}

export default createProgressHandler();
