# Architecture

medical-harness serves a FastAPI backend and plain HTML/CSS/JavaScript frontend. esbuild produces checked-in, self-hosted bundles. Node is a development dependency; production needs Python 3.12+ and the static files. There is no account system, database, or durable conversation store.

## Request flow

1. Routes validate alternating messages, body size, aggregate text size, rate and concurrency limits. They attach a random browser-session cache scope and enforce a total deadline. SSE sends keep-alives and cancels pending work on disconnect. Buffered and streamed results share ChatResponse validation.
2. Triage runs first. Emergencies stop normal work and return fixed urgent guidance. Routine messages receive fixed nonclinical replies. Clarification asks up to three essential questions and is limited to one round. Anatomy intent is part of triage, eliminating a separate model call; only twelve validated scene IDs are accepted.
3. Tool planning and MediSearch retrieval run concurrently. At most two relevant tools execute, with concurrent input extraction and reference requests. Calculators require supplied values and validate types, finite numbers, ranges and enums. Reference requests use fixed endpoints, eight-second total timeouts, at most three records, and a 256 KiB decoded response cap.
4. Supplemental PubMed abstracts may join the bounded source list or supply evidence when the primary provider is unavailable. Directory-only medicine labels cannot. When abstracts alter source numbering, the primary summary is dropped to avoid stale citation indices. No sources means a fixed evidence-unavailable response.
5. Generation is buffered. Review sees source excerpts and tool outputs. A revision is allowed once and must pass another review. Empty, interrupted, oversized or invalidly cited answers fail closed. The browser renders only the authoritative result.

These checks validate control flow and citation indices, not clinical truth.

## Lifecycle and caches

HTTP clients are pooled and closed on shutdown. Provider calls have bounded retries and circuit breakers with one recovery probe after cooldown. Session-scoped TTL/LRU caches coalesce identical work. One cancelled waiter cannot disrupt others; the final waiter's cancellation stops the shared operation. Failed evidence/reference retrieval is not cached. Zero capacity or TTL disables storage.

Cache values contain sensitive derived data in memory; expired entries are removed during cache operations. No prompts, patient text or keys belong in logs. Protected metrics expose numeric counters only. Caches, concurrency and quotas are per instance; global limits require platform infrastructure.

## Browser and anatomy

The initial response already contains the home screen and home layout. A small synchronous theme script runs before CSS; startup does not replace the hero. HTML/manifests revalidate, while hashed bundles and GLBs use immutable caching. The app uses system fonts and no CDN runtime scripts. FastAPI developer documentation has a separate CSP for its Swagger/ReDoc assets.

Anatomy context belongs to each answer. Opening its native dialog imports the viewer and downloads one region. Closing aborts loads and disposes geometry, materials, observers, listeners and WebGL resources. Rendering occurs on interaction or resize, not continuously. Keyboard controls and a searchable structure list remain usable after graphics failure.

| Module | Responsibility |
| --- | --- |
| app/main.py | Startup/shutdown, headers, static shell |
| app/api/routes.py, app/schemas.py | HTTP/SSE contract and validation |
| app/pipeline.py, app/prompts.py | Bounded orchestration and reviewed answer policy |
| app/cache.py, app/transport.py | TTL/LRU, single-flight and circuit breakers |
| app/tools/clinical.py | Seven sourced calculators/converters |
| app/tools/references.py | DailyMed and Europe PMC lookups |
| static/js/anatomy-panel.js, atlas-viewer.js | Dialog and on-demand Three.js viewer |
| scripts/build_atlas.mjs, check_atlas.mjs | Reproducible packs and decoded geometry validation |
| evals/ | Synthetic evaluations and an offline review gate |

See [research decisions](RESEARCH.md), [tool boundaries](RELIABILITY.md), and [performance checks](PERFORMANCE.md).
