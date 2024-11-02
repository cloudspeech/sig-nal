import serveStatic from 'serve-static-bun';

const port = 8080;

Bun.serve({ fetch: serveStatic('.'), port });

console.log(`
Welcome to the sig-nal demo!

Point your browser at http://localhost:${port} to see it.

Press Ctrl-C to exit this web server.
`);
