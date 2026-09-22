import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = normalize(join(fileURLToPath(new URL(".", import.meta.url)), ".."));
const types = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".mjs":"text/javascript; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".md":"text/markdown; charset=utf-8" };

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const requested = normalize(join(root, pathname === "/" ? "index.html" : pathname));
    if (!requested.startsWith(root) || !(await stat(requested)).isFile()) throw new Error("not found");
    res.writeHead(200, { "content-type": types[extname(requested)] || "application/octet-stream", "cache-control":"no-store" });
    res.end(await readFile(requested));
  } catch {
    res.writeHead(404, { "content-type":"text/plain" });
    res.end("Not found");
  }
});
const port = Number(process.env.PORT || 8000);
server.listen(port, "0.0.0.0", () => console.log(`GRAM Defenders running on port ${port}`));
