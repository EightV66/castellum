import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
const address = "http://127.0.0.1:4173/";
function openIfRequested() {
  if (process.argv.includes("--open") && process.platform === "win32")
    spawn("explorer.exe", [address], {
      windowsHide: true,
      stdio: "ignore",
      detached: true,
    }).unref();
}
const project = path.dirname(fileURLToPath(import.meta.url));
const localBuild = path.join(project, "dist");
const root = fs.existsSync(path.join(localBuild, "index.html"))
  ? localBuild
  : path.join(project, "docs");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json",
};
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, ""),
      file = path.resolve(root, relative || "index.html");
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
  }
});
server.listen(4173, "127.0.0.1", () => {
  console.log(
    "\nCASTELLUM — The Last Kingdom\nhttp://127.0.0.1:4173/\nKeep this window open. Press Ctrl+C to stop.\n",
  );
  openIfRequested();
});
server.on("error", async (e) => {
  if (e.code === "EADDRINUSE") {
    try {
      const res = await fetch(address, { signal: AbortSignal.timeout(1800) });
      if (
        res.ok &&
        (await res.text()).includes(
          "<title>CASTELLUM — The Last Kingdom</title>",
        )
      ) {
        console.log("CASTELLUM is already running at " + address);
        openIfRequested();
        return;
      }
    } catch {}
    console.error("Port 4173 is occupied. Run npm run dev to use port 5173.");
  } else console.error(e);
  process.exitCode = 1;
});
