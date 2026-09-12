const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf"
};

http.createServer((request, response) => {
  let rawPath = request.url.split("?")[0];
  let urlPath;
  try {
    urlPath = decodeURIComponent(rawPath);
  } catch (_e) {
    response.statusCode = 400;
    response.end("Bad Request");
    return;
  }

  if (urlPath === "/") urlPath = "/index.html";
  if (urlPath === "/events" || urlPath === "/events/") urlPath = "/events/events.html";
  if (urlPath === "/articles" || urlPath === "/articles/") urlPath = "/articles/articles.html";
  if (/^\/event\/[^/]+\/?$/.test(urlPath)) urlPath = "/events/event.html";
  if (/^\/article\/[^/]+\/?$/.test(urlPath)) urlPath = "/articles/article.html";

  // Prevent path traversal attacks
  const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, "");
  const filePath = path.resolve(root, "." + safePath);

  if (!filePath.startsWith(root)) {
    response.statusCode = 403;
    response.setHeader("Content-Type", "text/plain");
    response.end("Forbidden: Access Denied");
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      response.statusCode = 404;
      response.setHeader("Content-Type", "text/plain");
      response.end("Not found");
      return;
    }
    response.setHeader("Content-Type", types[path.extname(filePath)] || "application/octet-stream");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.end(contents);
  });
}).listen(8099, "127.0.0.1", () => {
  console.log("Secure preview server running at http://127.0.0.1:8099");
});
