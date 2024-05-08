import { compress } from 'brotli';
import { readFileSync, writeFileSync } from 'fs'

console.log('index.js:\n');

let minified = readFileSync('dist/index.min.js');

console.log('dist/index.min.js -','Uncompressed, minified:', minified.length, 'Bytes');

let brotliCompressed = compress(minified);

console.log('Brotli -11:', brotliCompressed.length, 'Bytes');

let gzipCompressed = Bun.gzipSync(minified, {level: 9});

console.log('Gzip -9:', gzipCompressed.length, 'Bytes');

writeFileSync('README.md', readFileSync('README.md', 'utf-8').replace(/\*\*\d+\*\*/, `**${brotliCompressed.length}**`));

minified = readFileSync('dist/plugins/class-map.min.js');

console.log('\ndist/plugins/class-map.min.js -','Uncompressed, minified:', minified.length, 'Bytes');

brotliCompressed = compress(minified);

console.log('Brotli -11:', brotliCompressed.length, 'Bytes');

gzipCompressed = Bun.gzipSync(minified, {level: 9});

console.log('Gzip -9:', gzipCompressed.length, 'Bytes');

minified = readFileSync('dist/plugins/sty-le.min.js');

console.log('\ndist/plugins/sty-le.min.js -','Uncompressed, minified:', minified.length, 'Bytes');

brotliCompressed = compress(minified);

console.log('Brotli -11:', brotliCompressed.length, 'Bytes');

gzipCompressed = Bun.gzipSync(minified, {level: 9});

console.log('Gzip -9:', gzipCompressed.length, 'Bytes');
