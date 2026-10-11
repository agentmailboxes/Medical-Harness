# Evaluation and improvement loop

Routine checks are offline and use fake keys: run `uv run pytest -q`, `npm run check:anatomy`, and `npm run test:browser`.

The old HealthBench script was removed. It reused asynchronous clients across separate event loops, graded with the answering model, excluded failed examples from scores, and printed question excerpts. Those properties made its scores unsuitable as a promotion signal. This repository claims no clinical benchmark score.

## Synthetic live runs

The ten built-in cases in evals/cases.json probe emergency routing, anatomy relevance, missing inputs, reference lookup and instruction injection. These are behavior checks, not clinical validation. Explicit opt-in is required:

```bash
uv run python -m evals.run run --live --out data/evals/baseline.json
uv run python -m evals.run run --live --out data/evals/candidate.json
```

Run the baseline on its revision, make one reviewable change, then run the candidate. Keep the case file and provider settings fixed. Each case has a fresh cache scope. Reports contain run IDs, case/budget/prompt hashes, usage, elapsed time, and check outcomes. Failures remain in the denominator. Adjacent *.responses.json files contain synthetic outputs for clinical review. The data directory is ignored by Git and deployment. Do not substitute patient records for these fixtures.

Repeat runs before interpreting small improvements. Equal token budgets are not equal dollar costs across models; provider pricing and retry costs need separate review.

## Independent review

A qualified independent reviewer should inspect both sets of responses against a predetermined rubric: factual correctness, citation support, applicability, uncertainty, red flags and harmful omissions. Model self-grading does not meet this requirement. A local review JSON file must use exact run IDs and contain every case:

```json
{
  "baseline": {
    "run_id": "baseline-report-run-id",
    "reviewer": "Reviewer identifier",
    "ratings": {"greeting": {"score": 1.0, "safe": true}}
  },
  "candidate": {
    "run_id": "candidate-report-run-id",
    "reviewer": "Reviewer identifier",
    "ratings": {"greeting": {"score": 1.0, "safe": true}}
  }
}
```

This example shows one entry; include all ten case IDs in each ratings map. Scores must be finite numbers from 0 to 1, and safe must be boolean. Store it in ignored data/evals/review.json.

```bash
uv run python -m evals.run compare --baseline data/evals/baseline.json --candidate data/evals/candidate.json --review data/evals/review.json --out data/evals/comparison.json
```

The gate exits nonzero for missing/duplicate cases, different case or budget hashes, failed candidate checks, incomplete review, any candidate safety failure, no average clinical-score improvement, or more than 20% growth in elapsed time or reported tokens. Passing produces eligible_for_human_review. It never edits code, promotes prompts, deploys or merges. Reports are operator-supplied evidence, not cryptographically attested results.

## Bounded improvement process

1. Reproduce a failure with a synthetic or approved, properly deidentified case.
2. Obtain external feedback and record one specific hypothesis.
3. Change a prompt, tool or route on a branch and add a regression test.
4. Rerun the same cases and budgets with independent clinical review.
5. Compare safety, quality, source support, latency and tokens; review the PR before promotion.

Useful contributions are clinician-reviewed cases/rubrics, intended countries and populations, acceptable cost/latency, and adversarial cases. Keep a held-out set that is not used to tune prompts. The small bundled pack is scaffolding, not clinical validation. [Research notes](RESEARCH.md) explain why online learning from chat history and self-approved promotion are not enabled.
