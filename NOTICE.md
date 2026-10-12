# Third-party assets and services

The [MIT license](LICENSE) covers medical-harness application code and documentation. It does not replace the licenses of third-party data, models, fonts, or hosted APIs.

## BodyParts3D anatomy data

The regional GLB files and structure metadata in `static/assets/atlas/` are derived from [BodyParts3D](https://lifesciencedb.jp/bp3d/), © The Database Center for Life Science, under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). The geometry has been simplified, regrouped into twelve focused scenes, dequantized, and recompressed. Attribution and a license link are also displayed in the anatomy viewer. `manifest.json` records source revision and SHA-256 hashes; `scripts/build_atlas.mjs` reproduces the packs from the attributed source assets in Git history.

The conversion pipeline uses assets from [anatomy-lab](https://github.com/MrH0v0/anatomy-lab), which is MIT licensed. See its repository for its license and source pipeline.

The previous full-body runtime assets and viewer are removed. The underlying licensed geometry is reused; these are reference structures, not generated clinical findings or patient-specific models.

## Bundled browser libraries

Three.js and its Meshopt decoder are bundled locally. Their MIT notices are retained in `static/vendor-licenses/` and the generated bundle notice. Build tooling is pinned in `package-lock.json`.

Selected [Lucide](https://lucide.dev/) icons use the ISC license. [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans) is self-hosted under the SIL Open Font License 1.1. Their full notices are in `static/vendor-licenses/`. The book monogram and eye-pressure schematic are original application assets. No stock logo or generated squirrel image is included. The separate monochrome logo exploration in `docs/brand/` was generated with OpenAI image generation; it is not an Adobe asset or the active application logo.

The educational guide paraphrases National Eye Institute material and links directly to its sources. NIH does not endorse this application. The conceptual illustration is not a clinically validated simulation.

## External services

medical-harness calls Cerebras and MediSearch using your own API keys. Their services, returned content, and usage terms are independent of this repository's MIT license.

DailyMed and Europe PMC/PubMed reference records remain subject to their publishers' terms. The application retrieves a small number of links or abstract excerpts and preserves source links. No HealthBench dataset is bundled; the checked-in evaluation cases are synthetic project fixtures.
