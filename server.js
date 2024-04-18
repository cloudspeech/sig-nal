import serveStatic from "serve-static-bun";

Bun.serve({ fetch: serveStatic("."), port: 8080 });
