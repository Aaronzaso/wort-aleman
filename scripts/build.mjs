import { mkdir, cp, readFile, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
const out = resolve("dist");
if (out !== resolve(".") + "\\dist" && out !== resolve(".") + "/dist")
  throw Error("Ruta de salida inválida");
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const path of ["index.html", "src", "icons", "manifest.webmanifest"])
  await cp(path, `dist/${path}`, { recursive: true });
await writeFile("dist/.nojekyll", "");
const sw = await readFile("sw.js", "utf8");
await writeFile("dist/sw.js", sw);
console.log("App estática lista en dist/");
