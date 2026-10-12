import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const manifest = JSON.parse(await readFile('static/assets/atlas/manifest.json', 'utf8'));
assert.equal(Object.keys(manifest.scenes).length, 12);
for (const [id, scene] of Object.entries(manifest.scenes)) {
  assert.match(scene.file, /^[a-z_]+-[a-f0-9]{12}\.glb$/);
  const bytes = await readFile(`static/assets/atlas/${scene.file}`);
  assert.equal(bytes.length, scene.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), scene.sha256);
  assert(scene.center.every(Number.isFinite) && Number.isFinite(scene.radius) && scene.radius > 0);
  const document = await io.readBinary(new Uint8Array(bytes));
  await document.transform(dequantize());
  const meshes = document.getRoot().listMeshes();
  assert(meshes.length > 0);
  for (const mesh of meshes) {
    for (const primitive of mesh.listPrimitives()) {
      const positions = primitive.getAttribute('POSITION');
      assert(positions && positions.getCount() >= 3);
      const min = positions.getMin([]), max = positions.getMax([]);
      assert(max.every(Number.isFinite) && min.every(Number.isFinite));
      assert(Math.hypot(...max.map((value, axis) => value - min[axis])) > .00001, `${id}: degenerate geometry`);
    }
  }
  const identifiers = new Set(document.getRoot().listNodes().map(node => node.getExtras().structureId).filter(Boolean));
  assert.equal(identifiers.size, scene.structures.length);
  assert(scene.structures.every(item => identifiers.has(item.id)));
}
console.log('12 anatomy scenes passed hash, catalog, and decoded geometry validation.');
