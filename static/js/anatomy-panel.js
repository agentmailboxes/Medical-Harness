export class AnatomyPanel {
  constructor(insertText) {
    this.dialog = document.getElementById('anatomy-panel');
    this.canvas = document.getElementById('atlas-canvas');
    this.status = document.getElementById('atlas-status');
    this.list = document.getElementById('atlas-structures');
    this.search = document.getElementById('atlas-search');
    this.useButton = document.getElementById('atlas-use');
    this.insertText = insertText;
    this.version = 0;
    this.dialog.addEventListener('close', () => this.disposeViewer());
    document.getElementById('anatomy-panel-close').addEventListener('click', () => this.close());
    document.getElementById('atlas-retry').addEventListener('click', () => this.load());
    this.search.addEventListener('input', () => this.populate());
    this.list.addEventListener('change', () => this.select(this.list.value));
    this.dialog.querySelectorAll('[data-layer]').forEach(input => input.addEventListener('change', () => this.layers()));
    this.dialog.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => this.viewer?.view(button.dataset.view)));
    document.getElementById('atlas-reset').addEventListener('click', () => this.viewer?.reset());
    document.getElementById('atlas-zoom-in').addEventListener('click', () => this.viewer?.zoom(.8));
    document.getElementById('atlas-zoom-out').addEventListener('click', () => this.viewer?.zoom(1.25));
    this.useButton.addEventListener('click', () => {
      const label = this.selected?.name || this.context.label;
      this.close();
      this.insertText(`The area I mean is the ${label}.`);
    });
    document.addEventListener('visibilitychange', () => this.viewer?.setVisible(!document.hidden && this.dialog.open));
  }

  async open(context) {
    this.context = context;
    this.selected = null;
    this.config = null;
    this.search.value = '';
    document.getElementById('atlas-title').textContent = context.label;
    document.getElementById('atlas-reason').textContent = context.reason;
    document.getElementById('atlas-selection').textContent = 'Select a structure in the model or list.';
    this.useButton.textContent = 'Use this area in my question';
    this.dialog.showModal();
    await this.load();
  }

  async load() {
    this.disposeViewer();
    const version = this.version;
    this.status.textContent = 'Loading reference anatomy…';
    this.status.hidden = false;
    document.getElementById('atlas-retry').hidden = true;
    this.list.replaceChildren();
    try {
      if (!this.manifest) {
        const response = await fetch('/static/assets/atlas/manifest.json');
        if (!response.ok) throw new Error('Catalog unavailable');
        this.manifest = await response.json();
      }
      if (version !== this.version) return;
      this.config = this.manifest.scenes[this.context.scene_id];
      if (!this.config) throw new Error('Region unavailable');
      const available = new Set(this.config.structures.map(item => item.layer));
      this.dialog.querySelectorAll('[data-layer]').forEach(input => {
        input.disabled = !available.has(input.dataset.layer);
        input.checked = available.has(input.dataset.layer) && input.dataset.layer !== 'muscles';
      });
      this.populate();
      const { AtlasViewer } = await import('./atlas-viewer.js');
      if (version !== this.version) return;
      this.viewer = new AtlasViewer(this.canvas, structure => this.showSelection(structure), message => this.failure(message));
      await this.viewer.load(this.config);
      if (version !== this.version) return;
      this.layers();
      await new Promise(requestAnimationFrame);
      if (version !== this.version) return;
      this.status.hidden = true;
    } catch (error) {
      if (version !== this.version || error.name === 'AbortError') return;
      this.failure('The 3D view is unavailable. You can still choose an area from the list or describe it in your question.');
    }
  }

  failure(message) {
    this.viewer?.dispose();
    this.viewer = null;
    this.status.textContent = message;
    this.status.hidden = false;
    document.getElementById('atlas-retry').hidden = false;
  }

  populate() {
    const query = this.search.value.trim().toLowerCase();
    const options = (this.config?.structures || []).filter(item => item.name.toLowerCase().includes(query)).sort((a, b) => a.name.localeCompare(b.name));
    this.list.replaceChildren(...options.map(item => new Option(item.name, item.id)));
    if (this.selected && options.some(item => item.id === this.selected.id)) this.list.value = this.selected.id;
    else this.list.selectedIndex = -1;
    document.getElementById('atlas-count').textContent = `${options.length} structures`;
  }

  select(id) {
    const item = this.config?.structures.find(structure => structure.id === id);
    if (!item) return;
    const checkbox = this.dialog.querySelector(`[data-layer="${item.layer}"]`);
    if (checkbox) checkbox.checked = true;
    this.layers();
    this.showSelection(item);
    this.viewer?.select(id);
  }

  showSelection(item) {
    this.selected = item;
    this.list.value = item.id;
    document.getElementById('atlas-selection').textContent = `${item.name} · ${item.layer}`;
    this.useButton.textContent = 'Use selected structure';
  }

  layers() {
    const selected = [...this.dialog.querySelectorAll('[data-layer]:checked')].map(input => input.dataset.layer);
    this.viewer?.setLayers(selected);
  }

  disposeViewer() {
    this.version++;
    this.viewer?.dispose();
    this.viewer = null;
  }

  close() {
    if (this.dialog.open) this.dialog.close();
  }
}
