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
};

http.createServer((request, response) => {
  let urlPath = decodeURIComponent(request.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(root, urlPath);
  fs.readFile(filePath, (error, contents) => {
    if (error) {
      response.statusCode = 404;
      response.end("Not found");
      return;
    }
    response.setHeader("Content-Type", types[path.extname(filePath)] || "application/octet-stream");
    response.setHeader("Cache-Control", "no-store");
    response.end(contents);
  });
}).listen(8099, "127.0.0.1");
