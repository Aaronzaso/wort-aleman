import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { bundleClient } from "./client-build.mjs";
const root = resolve(process.argv.includes("--dist") ? "dist" : ".");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (pathname === "/api/progress") {
      const { default: handler } = await import("../api/progress.js");
      return await handler(req, res);
    }
    if (pathname === "/api/auth-callback") {
      const { default: handler } = await import("../api/auth-callback.js");
      return await handler(req, res);
    }
    if (pathname.startsWith("/api/auth/")) {
      const { default: handler } = await import("../api/auth/[...path].js");
      return await handler(req, res);
    }
    if (pathname === "/src/app.js" && !process.argv.includes("--dist")) {
      const bundle = await bundleClient({ write: false });
      res
        .writeHead(200, {
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "no-cache",
        })
        .end(bundle.outputFiles[0].contents);
      return;
    }
    if (
      !["/", "/index.html", "/sw.js", "/manifest.webmanifest"].includes(
        pathname,
      ) &&
      !/^\/src\/[a-z0-9-]+\.(?:js|css)$/.test(pathname) &&
      !/^\/icons\/[a-z0-9-]+\.(?:svg|png)$/.test(pathname)
    ) {
      res.writeHead(404).end();
      return;
    }
    const file = resolve(
      root,
      "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname),
    );
    if (!file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    const data = await readFile(file);
    res
      .writeHead(200, {
        "Content-Type": mime[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      })
      .end(data);
  } catch {
    res.writeHead(404).end("Archivo no encontrado");
  }
});
server.listen(Number(process.env.PORT) || 4173, "127.0.0.1", () =>
  console.log("Local: http://127.0.0.1:4173"),
);
