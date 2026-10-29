import { neon } from "@neondatabase/serverless";
import { HttpError } from "./http.js";

let sql;
function database() {
  if (!process.env.DATABASE_URL)
    throw new HttpError(
      503,
      "El guardado en tu cuenta aún no está configurado.",
    );
  return (sql ||= neon(process.env.DATABASE_URL));
}

function snapshot(row) {
  if (!row) return { document: null, revision: 0 };
  const revision = Number(row.revision);
  if (!Number.isSafeInteger(revision) || revision < 1)
    throw new Error("Invalid stored revision");
  return { document: row.document, revision };
}

export const progressStore = {
  async get(userId) {
    const rows =
      await database()`SELECT document, revision FROM public.wort_progress WHERE user_id = ${userId} LIMIT 1`;
    return snapshot(rows[0]);
  },
  async save(userId, document, expectedRevision) {
    const query = database();
    const payload = JSON.stringify(document);
    // A single SQL statement performs the comparison and write atomically.
    const rows =
      expectedRevision === 0
        ? await query`INSERT INTO public.wort_progress (user_id, document, revision)
          VALUES (${userId}, ${payload}::jsonb, 1)
          ON CONFLICT (user_id) DO NOTHING RETURNING document, revision`
        : await query`UPDATE public.wort_progress
          SET document = ${payload}::jsonb, revision = revision + 1, updated_at = now()
          WHERE user_id = ${userId} AND revision = ${expectedRevision}
          RETURNING document, revision`;
    if (rows[0]) return { saved: true, ...snapshot(rows[0]) };
    return { saved: false, ...(await this.get(userId)) };
  },
};
