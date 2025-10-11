import { compress } from 'brotli';
import { readFileSync, writeFileSync } from 'fs';

console.log('index.js:\n');

let minified = readFileSync('dist/index.js');

console.log(
  'dist/index.js -',
  'Uncompressed, minified:',
  minified.length,
  'Bytes'
);

let brotliCompressed = compress(minified);

console.log('Brotli -11:', brotliCompressed.length, 'Bytes');

let gzipCompressed = Bun.gzipSync(minified, { level: 9 });

console.log('Gzip -9:', gzipCompressed.length, 'Bytes');

writeFileSync(
  'README.md',
  readFileSync('README.md', 'utf-8').replace(
    /\*\*\d+\*\*/,
    `**${brotliCompressed.length}**`
  )
);

minified = readFileSync('dist/plugins/classMap.js');

console.log(
  '\ndist/plugins/classMap.js -',
  'Uncompressed, minified:',
  minified.length,
  'Bytes'
);

brotliCompressed = compress(minified);

console.log('Brotli -11:', brotliCompressed.length, 'Bytes');

gzipCompressed = Bun.gzipSync(minified, { level: 9 });

console.log('Gzip -9:', gzipCompressed.length, 'Bytes');

minified = readFileSync('dist/plugins/sty-le.js');

console.log(
  '\ndist/plugins/sty-le.js -',
  'Uncompressed, minified:',
  minified.length,
  'Bytes'
);

brotliCompressed = compress(minified);

console.log('Brotli -11:', brotliCompressed.length, 'Bytes');

gzipCompressed = Bun.gzipSync(minified, { level: 9 });

console.log('Gzip -9:', gzipCompressed.length, 'Bytes');

minified = readFileSync('dist/plugins/part-ial.js');

console.log(
  '\ndist/plugins/part-ial.js -',
  'Uncompressed, minified:',
  minified.length,
  'Bytes'
);

brotliCompressed = compress(minified);

console.log('Brotli -11:', brotliCompressed.length, 'Bytes');

gzipCompressed = Bun.gzipSync(minified, { level: 9 });

console.log('Gzip -9:', gzipCompressed.length, 'Bytes');
