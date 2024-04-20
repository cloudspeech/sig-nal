import { compress } from 'brotli';
import { readFileSync, writeFileSync } from 'fs'

console.log('index.js:\n');

let minified = readFileSync('dist/index.min.js');

console.log('Uncompressed, minified:', minified.length, 'Bytes');

let brotliCompressed = compress(minified);

console.log('Brotli -11:', brotliCompressed.length, 'Bytes');

let gzipCompressed = Bun.gzipSync(minified, {level: 9});

console.log('Gzip -9:', gzipCompressed.length, 'Bytes');

writeFileSync('README.md', readFileSync('README.md', 'utf-8').replace(/\*\*\d+\*\*/, `**${brotliCompressed.length}**`));
