import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (!process.env.DATABASE_URL_UNPOOLED)
  throw Error("Falta DATABASE_URL_UNPOOLED para aplicar la migración.");
const sql = neon(process.env.DATABASE_URL_UNPOOLED);
const migration = await readFile(
  new URL("../db/migrations/001_progress.sql", import.meta.url),
  "utf8",
);
try {
  await sql.query(migration);
  const rows =
    await sql`SELECT to_regclass('public.wort_progress') IS NOT NULL AS ready`;
  if (!rows[0]?.ready) throw Error("Table not available after migration");
  console.log("Migración de Wort aplicada. Tabla de progreso lista.");
} catch {
  // Database errors may include connection details; never print their object.
  console.error(
    "No se pudo aplicar la migración de Wort. Revisa la conexión y los permisos de la base de datos.",
  );
  process.exitCode = 1;
}
