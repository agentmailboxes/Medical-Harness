# Research decisions

Sources were reviewed with Firecrawl during the October 2026 refactor. These are engineering judgments, not clinical validation.

## Anatomy

[OpenAI's Astra architectural visualization example](https://developers.openai.com/blog/architectural-visualization-with-astra) shows an agent operating Blender and producing editable geometry. This supports using an agent to author a 3D workflow; it does not establish the medical accuracy of generated anatomy. Generating a mesh from patient symptoms would add unsupported detail.

[Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy) provides an open Blender/Unity atlas with CC BY-SA licensing obligations. It is a candidate for richer coverage, but adopting its whole authoring stack would increase scope and distribution cost.

The chosen implementation rebuilds the viewer using the repository's attributed [BodyParts3D](https://lifesciencedb.jp/bp3d/) geometry, converted through [anatomy-lab](https://github.com/MrH0v0/anatomy-lab). The old runtime assets and full-body viewer are removed. Twelve regional packs preserve structure identifiers/labels and record hashes plus source revision. Conversion dequantizes source positions before recompression; a decoded-geometry test prevents collapsed meshes.

These are adult reference structures, including male-specific anatomy in the source atlas. Coverage is incomplete: selected bones, muscles and organs, not a comprehensive vascular, nerve or ligament atlas. Both sides are labeled; neither laterality nor disease is inferred. A view is not a scan or diagnosis. Future assets need independent anatomical review and appropriate licensing.

## Tools chosen

[DailyMed's directory API](https://dailymed.nlm.nih.gov/dailymed/webservices-help/v2/spls_api.cfm) supplies official US label titles and links. It does not provide an interaction check, approval confirmation, or dosing decision. The [Europe PMC articles API](https://europepmc.org/RestfulWebService), restricted here to PubMed-indexed records with abstracts, adds research lookup without another paid key. Abstracts are not a systematic review or a guarantee of study quality.

New calculations use [NIDDK's CKD-EPI 2021 adult eGFR equation](https://www.niddk.nih.gov/research-funding/research-programs/kidney-clinical-research-epidemiology/laboratory/glomerular-filtration-rate-equations/adults), the [ADAG estimated average glucose equation](https://doi.org/10.2337/dc08-0545), and explicit measurement conversions. BMI uses [CDC adult categories](https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html); two-level Wells references [NICE NG158](https://www.nice.org.uk/guidance/ng158/chapter/recommendations). Inputs, scope and source links accompany results. Approximate Framingham scoring was removed.

Personalized dosing, interaction checking and diagnostic image interpretation require suitable authoritative data and clinical evaluation before implementation. General search results do not satisfy those needs.

## Self-improvement

| Paper | Relevant finding | Engineering consequence |
| --- | --- | --- |
| [Reflexion](https://arxiv.org/abs/2303.11366) | Uses feedback and episodic reflection to improve later attempts on benchmark tasks; not a medical safety validation. | Record failures and external reviewer feedback; test the next candidate under a fixed budget. |
| [Large Language Models Cannot Self-Correct Reasoning Yet](https://arxiv.org/abs/2310.01798) | Intrinsic correction can fail or degrade reasoning without reliable external feedback. | Do not let the answering model approve permanent changes or count another attempt as proof of improvement. |

The resulting design is an offline, externally reviewed loop with regression gates. The evals package implements comparable synthetic runs and comparison reports; clinical review and PR review remain necessary. Runtime answer review is a bounded check on one answer, not online learning. The application does not train on conversations or store answers as permanent medical memory.

## Mobile reading, local time, and explanatory visuals

Research checked on 2026-10-12 through Firecrawl, using generic product and medical-topic queries rather than patient text.

- [MDN: Intl.DateTimeFormat.resolvedOptions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/resolvedOptions) documents the browser's IANA time-zone and locale settings. We send these hints, use the server clock, retain per-turn offsets, and calculate today/yesterday deterministically. Approximate phrases remain approximate. This avoids an extra model call and prevents treating the model's training cutoff as today's date.
- [Vercel request headers](https://vercel.com/docs/headers/request-headers) provides approximate network country and time-zone hints. They are only read in the Vercel runtime and never treated as GPS or confirmed location. Explicit user context takes precedence. Locale does not imply country. Exact location is unnecessary for normal explanations.
- [NEI: Glaucoma and Eye Pressure](https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/glaucoma/glaucoma-and-eye-pressure) informs the front-chamber/drainage schematic. The guide explains slow drainage and distinguishes raised pressure from a diagnosis. It does not map personal measurements onto a simulated eye.
- [NEI: Laser Treatment](https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/glaucoma/treatment) and [NEI: Glaucoma Surgery](https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/glaucoma/glaucoma-surgery) support fixed explanations of treatment goals and limitations. A user chooses a topic; the app does not recommend a procedure. Links stay next to the explanation. No third-party surgical video, tracking embed, or unlicensed GIF is loaded.
- [NEI: Glaucoma](https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/glaucoma) supplies warning signs and the treatment overview. Emergency routing still precedes visuals and retrieval.
- [Adobe Express logo generator](https://www.adobe.com/express/create/ai/logo) was researched and tried with a generic project brief. Generation required sign-in. The shipped mark is an original, editable SVG book monogram; it is not an Adobe-generated logo or a stock image. A later mascot exploration was rejected and is not shipped.
- [Vercel toolbar management](https://vercel.com/docs/vercel-toolbar/managing-toolbar) documents the preview feedback environment flag. Preview toolbar injection is disabled instead of broadening the application's script policy.

Native HTML dialogs and accordions fit this small JavaScript application without adding React solely for Radix. Explicit keyboard loops, focus restoration, touch targets and reduced-motion behavior are tested. Lucide provides a consistent icon vocabulary; a single local variable font replaces platform-dependent typography. The visual guide is a fixed educational asset, not proof of anatomical or clinical accuracy. A clinician should review new visual topics before broadening the catalog.

## Monochrome and typography refinement

The October 12 follow-up uses black and neutral charcoal in dark mode, warm off-white in light mode, and a 44 px icon-only new-question control with an accessible name. Instrument Sans supplies restrained headings and a lighter wordmark; mobile answer text is 16 px and desktop answer text is 17 px. The owner subsequently approved the generated m monogram, now adapted as a small SVG for the header, assistant avatar, and favicon. These are design decisions, not claims of clinical benefit.

- [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) informed text and muted-text contrast in both themes. Color is not the only indicator of an error or selected state.
- [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) informed pointer spacing; principal header and composer controls remain at least 44 px. Inline citations retain their text context and keyboard labels.
- [Rello, Pielot and Marcos, CHI 2016](https://www.pielot.org/pubs/Rello2016-Fontsize.pdf) studied font size and spacing with 104 participants. Larger text improved their reading measures, while extreme spacing was less helpful. Their desktop Arial experiment does not establish an optimum for this mobile UI; we use the finding to avoid shrinking answer text and retain browser zoom.
- [Instrument's typeface background](https://www.instrument.com/latest/from-old-to-bold-instrument-rebrand-signals-energetic-shift) describes the family collaboration. The locally bundled font is OFL licensed; selecting it is an aesthetic choice, not a universal readability claim.

Adobe Express was retried after sign-in with Gemini 3 and Firefly Image 4. Both attempts showed a service error. The approved [monochrome concept](brand/README.md) was therefore generated with the built-in image tool. Its original raster and prompt are preserved as provenance; the application loads the SVG adaptation.
