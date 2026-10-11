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
