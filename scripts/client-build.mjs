import { build } from "esbuild";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
export async function bundleClient(options = {}) {
  return build({
    entryPoints: ["src/app.js"],
    bundle: true,
    platform: "browser",
    format: "esm",
    target: ["es2022"],
    outfile: "dist/src/app.js",
    legalComments: "eof",
    define: {
      __WORT_AUTH_ENABLED__: JSON.stringify(!!process.env.NEON_AUTH_BASE_URL),
      __WORT_APP_URL__: JSON.stringify(
        process.env.WORT_APP_URL || "https://wort-aleman.vercel.app",
      ),
    },
    ...options,
  });
}
