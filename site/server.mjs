import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4320);
const publicDir = root;

const mimeTypes = new Map([
  [".html", "text/html; charset=UTF-8"],
  [".css", "text/css; charset=UTF-8"],
  [".js", "application/javascript; charset=UTF-8"],
  [".mjs", "application/javascript; charset=UTF-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".txt", "text/plain; charset=UTF-8"],
  [".json", "application/json; charset=UTF-8"],
  [".xml", "application/xml; charset=UTF-8"],
]);

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const send = (res, status, headers, body) => {
  res.writeHead(status, headers);
  res.end(body);
};

const fileExists = async (filePath) => {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
};

const injectSharedShell = (html) => {
  if (html.includes('data-shared-shell="true"')) return html;
  const versionedHtml = html
    .replace(/src=(['"])(?:\.\/|\/)js\/main\.js(?:\?[^'"]*)?\1/g, 'src="/js/main.js?v=20260924e"')
    .replace(/src=(['"])(?:\.\/|\/)js\/policy-modern\.js(?:\?[^'"]*)?\1/g, 'src="/js/policy-modern.js?v=20260924e"')
    .replace(/src=(['"])(?:\.\/|\/)js\/policy-shell\.js(?:\?[^'"]*)?\1/g, 'src="/js/policy-shell.js?v=20260924v2"')
    .replace(/href=(['"])(?:\.\/|\/)css\/policy-modern\.css(?:\?[^'"]*)?\1/g, 'href="/css/policy-modern.css?v=20260924v2"');
  const withPolicyStyles = versionedHtml.includes('class="account-policy"')
    ? versionedHtml.replace('</head>', '  <link rel="stylesheet" href="/css/policy-modern.css?v=20260924v2" />\n</head>')
    : versionedHtml;
  return withPolicyStyles
    .replace(
      "</head>",
      '  <link rel="stylesheet" href="/css/shared-shell.css?v=20260924b" data-shared-shell="true" />\n</head>',
    )
    .replace(
      "</body>",
      '  <script defer src="/js/shared-shell.js?v=20260924b" data-shared-shell="true"></script>\n</body>',
    );
};

const serveFile = async (res, filePath, status = 200) => {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = path.basename(filePath) === "apple-app-site-association"
    ? "application/json; charset=UTF-8"
    : (mimeTypes.get(ext) || "application/octet-stream");
  const isHtml = ext === ".html";
  const fileBody = await readFile(filePath);
  const body = isHtml ? injectSharedShell(fileBody.toString("utf8")) : fileBody;
  send(res, status, {
    "Content-Type": contentType,
    "Cache-Control": isHtml ? "no-cache" : "public, max-age=86400",
  }, body);
};

const redirect = (res, location) => {
  send(res, 301, { Location: location, "Content-Type": "text/plain; charset=UTF-8" }, `Redirecting to ${location}`);
};

const resolveRoute = async (pathname) => {
  let clean = safeDecode(pathname);
  if (!clean || clean === "/") return { type: "file", file: path.join(publicDir, "index.html") };

  const licenseNumber = clean.match(/^\/license\/([^/]+)\/?$/)?.[1];
  if (licenseNumber) {
    return {
      type: "redirect",
      location: `https://api.divergram.com/api/diving-licenses/verify/${encodeURIComponent(licenseNumber)}`,
    };
  }

  if (/^\/(?:posts?|reels?|profiles?|resorts?|guides?|marine-life)(?:\/[^/]+)?\/?$/.test(clean)) {
    return { type: "file", file: path.join(publicDir, "open-app.html") };
  }

  if (clean === "/index") return { type: "redirect", location: "/" };

  if (clean.endsWith(".html")) {
    const base = clean.slice(0, -5);
    return { type: "redirect", location: base === "/index" ? "/" : base };
  }

  const directFile = path.join(publicDir, clean);
  const statOk = await fileExists(directFile);
  if (statOk) return { type: "file", file: directFile };

  const htmlFile = path.join(publicDir, `${clean}.html`);
  if (await fileExists(htmlFile)) return { type: "file", file: htmlFile };

  const indexFile = path.join(publicDir, clean, "index.html");
  if (await fileExists(indexFile)) return { type: "file", file: indexFile };

  return { type: "file", file: path.join(publicDir, "404.html"), status: 404 };
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  const route = await resolveRoute(url.pathname);

  if (route.type === "redirect") {
    redirect(res, route.location);
    return;
  }

  try {
    await serveFile(res, route.file, route.status || 200);
  } catch (error) {
    try {
      await serveFile(res, path.join(publicDir, "500.html"), 500);
    } catch {
      send(res, 500, { "Content-Type": "text/plain; charset=UTF-8" }, "Internal Server Error");
    }
    console.error(error);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`divergram.com server listening on http://127.0.0.1:${port}`);
});
