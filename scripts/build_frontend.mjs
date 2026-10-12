import { build } from 'esbuild';
import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises';

const outdir = 'static/dist';
await mkdir(outdir, { recursive: true });
const result = await build({
  entryPoints: ['static/js/app.js', 'static/js/theme-init.js', 'static/js/analytics.js', 'static/css/app.css'],
  outdir, bundle: true, splitting: true, format: 'esm', target: 'es2022',
  entryNames: '[name]-[hash]', chunkNames: '[name]-[hash]', minify: true,
  legalComments: 'external', metafile: true,
  loader: { '.woff2': 'file', '.svg': 'file' }, assetNames: '[name]-[hash]',
});
const manifest = {};
for (const [path, details] of Object.entries(result.metafile.outputs)) {
  if (details.entryPoint) manifest[details.entryPoint.split('/').pop()] = `/${path}`;
}
const keep = new Set(Object.keys(result.metafile.outputs).map(path => path.split('/').pop()));
for (const file of await readdir(outdir)) {
  if (file.endsWith('.LEGAL.txt') && keep.has(file.slice(0, -10))) keep.add(file);
}
for (const file of await readdir(outdir)) if (!keep.has(file)) await unlink(`${outdir}/${file}`);
await writeFile('static/build.json', JSON.stringify(manifest));
console.log(JSON.stringify(Object.fromEntries(Object.entries(result.metafile.outputs).map(([path, info]) => [path, info.bytes])), null, 2));
