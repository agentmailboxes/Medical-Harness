import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises';
import { Document, NodeIO, Logger } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { copyToDocument, unpartition, prune, meshopt, dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const revision = '15e058404713026bff8eb3cf159b16e13d24174a';
const sourcePath = 'static/assets/anatomy/';
const readSource = name => execFileSync('git', ['show', `${revision}:${sourcePath}${name}`], { maxBuffer: 32 * 1024 * 1024 });
const metadata = JSON.parse(readSource('structures.json')).structures;
const byId = new Map(metadata.map(item => [item.id, item]));
const inRegion = (...regions) => item => regions.some(region => item.region === region || item.region === `left_${region}` || item.region === `right_${region}`);
const configs = {
  head: { label: 'Head and brain', test: inRegion('head'), focus: inRegion('head') },
  neck: { label: 'Neck', test: inRegion('neck'), focus: inRegion('neck') },
  shoulder: { label: 'Shoulder', test: item => inRegion('shoulder')(item) || /humerus/.test(item.name), focus: inRegion('shoulder') },
  chest: { label: 'Chest', test: inRegion('chest'), focus: inRegion('chest') },
  abdomen: { label: 'Abdomen', test: inRegion('abdomen'), focus: inRegion('abdomen') },
  pelvis: { label: 'Pelvis and hip', test: inRegion('hip'), focus: inRegion('hip') },
  spine: { label: 'Back and spine', test: item => item.group === 'vertebral column' || /sacrum|coccyx/.test(item.name), focus: () => true },
  elbow: { label: 'Elbow', test: item => inRegion('elbow')(item) || /humerus|radius|ulna/.test(item.name), focus: inRegion('elbow') },
  hand: { label: 'Hand and wrist', test: item => inRegion('hand')(item) || /carpal|scaphoid|lunate|triquetr|pisiform|trapezium|trapezoid|capitate|hamate/.test(item.name), focus: item => item.layer === 'skeleton' && inRegion('hand')(item) },
  knee: { label: 'Knee', test: item => inRegion('knee')(item) || (item.layer === 'skeleton' && /femur|tibia|fibula/.test(item.name)), focus: inRegion('knee') },
  lower_leg: { label: 'Lower leg', test: inRegion('lower_leg'), focus: inRegion('lower_leg') },
  foot: { label: 'Foot and ankle', test: item => inRegion('foot', 'ankle')(item) || /tibia|fibula/.test(item.name), focus: item => item.layer === 'skeleton' && inRegion('foot', 'ankle')(item) },
};

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const sources = [];
const inputHashes = {};
for (const filename of ['skeleton.glb', 'muscles.glb', 'muscles_extra.glb', 'organs.glb']) {
  const bytes = readSource(filename);
  inputHashes[filename] = createHash('sha256').update(bytes).digest('hex');
  const doc = await io.readBinary(new Uint8Array(bytes));
  await doc.transform(dequantize());
  sources.push(doc);
}
const outDir = 'static/assets/atlas';
await mkdir(outDir, { recursive: true });
const manifest = { version: 1, source_revision: revision, source_sha256: inputHashes, attribution: 'BodyParts3D, © The Database Center for Life Science (DBCLS). Adapted into focused reference scenes by medical-harness from anatomy-lab-derived geometry.', license: 'CC BY 4.0', license_url: 'https://creativecommons.org/licenses/by/4.0/', scenes: {} };
for (const [id, config] of Object.entries(configs)) {
  const output = new Document().setLogger(new Logger(Logger.Verbosity.ERROR));
  const scene = output.createScene(config.label);
  const structures = new Map();
  for (const source of sources) {
    const nodes = source.getRoot().listNodes().filter(node => byId.has(node.getName()) && config.test(byId.get(node.getName())));
    const mapping = copyToDocument(output, source, nodes);
    for (const node of nodes) {
      const item = byId.get(node.getName());
      const copy = mapping.get(node);
      copy.setExtras({ structureId: item.id, label: item.name, layer: item.layer });
      scene.addChild(copy);
      structures.set(item.id, { id: item.id, name: item.name, layer: item.layer, center: item.center, size: item.size });
    }
  }
  if (!structures.size) throw new Error(`No structures for ${id}`);
  await output.transform(prune(), unpartition(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const bytes = await io.writeBinary(output);
  const hash = createHash('sha256').update(bytes).digest('hex');
  const filename = `${id}-${hash.slice(0, 12)}.glb`;
  await writeFile(`${outDir}/${filename}`, bytes);
  const targets = [...structures.values()].filter(item => config.focus(byId.get(item.id)));
  const min = [0, 1, 2].map(axis => Math.min(...targets.map(item => item.center[axis] - item.size[axis] / 2)));
  const max = [0, 1, 2].map(axis => Math.max(...targets.map(item => item.center[axis] + item.size[axis] / 2)));
  manifest.scenes[id] = { label: config.label, file: filename, bytes: bytes.length, sha256: hash, center: min.map((value, axis) => (value + max[axis]) / 2), radius: Math.max(.065, ...min.map((value, axis) => (max[axis] - value) / 2)), structures: [...structures.values()] };
  console.log(`${id}: ${structures.size} structures, ${Math.round(bytes.length / 1024)} KiB`);
}
await writeFile(`${outDir}/manifest.json`, JSON.stringify(manifest));

const keep = new Set(Object.values(manifest.scenes).map(scene => scene.file));
for (const filename of await readdir(outDir)) {
  if (/^[a-z_]+-[a-f0-9]{12}\.glb$/.test(filename) && !keep.has(filename)) await unlink(`${outDir}/${filename}`);
}
