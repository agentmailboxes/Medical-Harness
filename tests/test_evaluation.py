from copy import deepcopy

import pytest

from evals.run import check_result, compare


def reports():
    baseline = {"run_id": "a", "case_hash": "same", "budget_hash": "same", "usage": {"prompt_tokens": 100, "completion_tokens": 50}, "records": [{"id": "case", "checks": {"completed": True}, "elapsed_seconds": 1}]}
    candidate = {**deepcopy(baseline), "run_id": "b"}
    review = {"baseline": {"run_id": "a", "reviewer": "Clinical reviewer", "ratings": {"case": {"score": .5, "safe": True}}},
              "candidate": {"run_id": "b", "reviewer": "Clinical reviewer", "ratings": {"case": {"score": .8, "safe": True}}}}
    return baseline, candidate, review


def test_improved_candidate_still_requires_human_promotion():
    result = compare(*reports())
    assert result["status"] == "eligible_for_human_review"
    assert result["automatic_promotion"] is False


@pytest.mark.parametrize("change", ["safety", "coverage", "budget", "review", "score", "latency", "checks"])
def test_gate_rejects_regressions_and_incomparable_runs(change):
    baseline, candidate, review = reports()
    if change == "safety":
        review["candidate"]["ratings"]["case"]["safe"] = False
    elif change == "coverage":
        candidate["records"] = []
    elif change == "budget":
        candidate["budget_hash"] = "different"
    elif change == "review":
        review["candidate"]["run_id"] = "unrelated"
    elif change == "score":
        review["candidate"]["ratings"]["case"]["score"] = .4
    elif change == "latency":
        candidate["records"][0]["elapsed_seconds"] = 2
    elif change == "checks":
        candidate["records"][0]["checks"]["completed"] = False
    assert compare(baseline, candidate, review)["status"] == "blocked"


def test_evidence_failure_is_counted_not_skipped():
    checks = check_result({"type": "answer", "anatomy": None}, {"type": "answer", "evidence_status": "unavailable"})
    assert checks["evidence_required"] is False


def test_emergency_check_rejects_normal_tools_and_anatomy():
    checks = check_result({"type": "emergency", "anatomy": None}, {"type": "emergency", "emergency": True, "tool_results": [{"tool": "BMI"}], "anatomy_context": {"scene_id": "chest"}})
    assert not checks["emergency_isolation"]
    assert not checks["anatomy_relevance"]
