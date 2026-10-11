import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const COLORS = { skeleton: 0xe4d7b6, muscles: 0xb75f60, organs: 0xc8776b };

export class AtlasViewer {
  constructor(container, onSelect, onError) {
    this.container = container;
    this.onSelect = onSelect;
    this.onError = onError;
    this.disposed = false;
    this.visible = true;
    this.frame = null;
    this.meshes = [];
    this.materials = new Set();
    this.abort = new AbortController();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, .001, 20);
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute('aria-label', '3D reference anatomy. Arrow keys rotate; plus and minus zoom. Use the structure list to select.');
    container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false;
    this.controls.enablePan = true;
    this.controls.minDistance = .025;
    this.controls.maxDistance = 3;
    this.controls.addEventListener('change', () => this.render());
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x596273, 2.3));
    for (const [position, intensity] of [[[1, 2, 3], 3], [[-2, 1, -2], 2]]) {
      const light = new THREE.DirectionalLight(0xffffff, intensity);
      light.position.set(...position);
      this.scene.add(light);
    }
    const canvas = this.renderer.domElement;
    const options = { signal: this.abort.signal };
    canvas.addEventListener('pointerdown', event => { this.down = [event.clientX, event.clientY]; }, options);
    canvas.addEventListener('pointerup', event => {
      if (!this.down || Math.hypot(event.clientX - this.down[0], event.clientY - this.down[1]) > 5) return;
      const box = canvas.getBoundingClientRect();
      const pointer = new THREE.Vector2((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(pointer, this.camera);
      const hit = ray.intersectObjects(this.meshes.filter(mesh => mesh.visible), false)[0];
      if (hit) this.select(hit.object.userData.structureId);
    }, options);
    canvas.addEventListener('keydown', event => {
      const rotations = { ArrowLeft: -.2, ArrowRight: .2, ArrowUp: -.15, ArrowDown: .15 };
      if (event.key in rotations) {
        event.preventDefault();
        const offset = this.camera.position.clone().sub(this.controls.target);
        const sphere = new THREE.Spherical().setFromVector3(offset);
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') sphere.theta += rotations[event.key];
        else sphere.phi = THREE.MathUtils.clamp(sphere.phi + rotations[event.key], .15, Math.PI - .15);
        this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(sphere));
        this.controls.update();
      } else if (['+', '=', '-'].includes(event.key)) {
        event.preventDefault();
        this.zoom(event.key === '-' ? 1.2 : .8);
      }
    }, options);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.onError('The 3D graphics connection was lost. You can retry or use the structure list.');
    }, options);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
  }

  async load(config) {
    this.config = config;
    const response = await fetch(`/static/assets/atlas/${config.file}`, { signal: this.abort.signal });
    if (!response.ok) throw new Error('Model download failed');
    const bytes = await response.arrayBuffer();
    if (this.disposed) return;
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.parseAsync(bytes, '');
    if (this.disposed) {
      gltf.scene.traverse(node => { node.geometry?.dispose(); node.material?.dispose(); });
      return;
    }
    this.model = gltf.scene;
    this.structures = new Map(config.structures.map(item => [item.id, item]));
    this.model.traverse(node => {
      if (!node.isMesh) return;
      let parent = node;
      while (parent && !parent.userData.structureId) parent = parent.parent;
      const id = parent?.userData.structureId;
      const structure = this.structures.get(id);
      if (!structure) return;
      const old = Array.isArray(node.material) ? node.material : [node.material];
      old.forEach(material => material.dispose());
      node.material = new THREE.MeshStandardMaterial({ color: COLORS[structure.layer] || COLORS.organs, roughness: .65, metalness: 0, side: THREE.DoubleSide });
      this.materials.add(node.material);
      node.userData = { structureId: id, layer: structure.layer };
      this.meshes.push(node);
    });
    this.scene.add(this.model);
    if (!this.meshes.length || new THREE.Box3().setFromObject(this.model).isEmpty()) throw new Error('No reference geometry');
    this.reset();
  }

  setLayers(layers) {
    for (const mesh of this.meshes) mesh.visible = layers.includes(mesh.userData.layer);
    this.render();
  }

  select(id) {
    const structure = this.structures?.get(id);
    if (!structure) return;
    for (const mesh of this.meshes) {
      const selected = mesh.userData.structureId === id;
      mesh.material.emissive.setHex(selected ? 0x315b88 : 0);
      mesh.material.emissiveIntensity = selected ? .5 : 0;
    }
    const bounds = new THREE.Box3();
    this.meshes.filter(mesh => mesh.userData.structureId === id).forEach(mesh => bounds.expandByObject(mesh));
    const offset = this.camera.position.clone().sub(this.controls.target).normalize();
    bounds.getCenter(this.controls.target);
    const size = bounds.getSize(new THREE.Vector3());
    this.distance = Math.max(.025, size.x / this.camera.aspect, size.y, size.z) * 2;
    this.camera.position.copy(this.controls.target).add(offset.multiplyScalar(this.distance));
    this.controls.update();
    this.onSelect(structure);
    this.render();
  }

  reset() {
    if (!this.config) return;
    this.controls.target.set(...this.config.center);
    this.distance = this.config.radius * 3.6;
    this.view('front');
  }

  view(direction) {
    const vectors = { front: [0, .12, 1], back: [0, .12, -1], side: [1, .12, 0] };
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3(...vectors[direction]).multiplyScalar(this.distance || .5));
    this.controls.update();
    this.render();
  }

  zoom(factor) {
    const offset = this.camera.position.clone().sub(this.controls.target).multiplyScalar(factor);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  resize() {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth), height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.render();
  }

  setVisible(visible) {
    this.visible = visible;
    if (visible) this.render();
  }

  render() {
    if (this.frame || this.disposed || !this.visible || document.hidden) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      if (!this.disposed && this.visible && !document.hidden) this.renderer.render(this.scene, this.camera);
    });
  }

  dispose() {
    this.disposed = true;
    this.abort.abort();
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.dispose();
    this.model?.traverse(node => node.geometry?.dispose());
    this.materials.forEach(material => material.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
