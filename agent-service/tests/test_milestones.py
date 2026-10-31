from datetime import date

import pytest

from core import milestones as ms

TODAY = date(2026, 11, 4)


def row(status="pending", due=None, pct=0, **extra):
    return {"id": "m", "title": "T", "status": status, "due_date": due, "completion_pct": pct, **extra}


def test_display_state_is_derived_from_status_and_due_date():
    assert ms.display_state("completed", "2020-01-01", TODAY) == "completed"  # done is done, even if it was late
    assert ms.display_state("pending", "2026-11-03", TODAY) == "overdue"
    assert ms.display_state("in_progress", "2026-11-03", TODAY) == "overdue"
    assert ms.display_state("pending", "2026-11-04", TODAY) == "upcoming"  # due today is not overdue
    assert ms.display_state("in_progress", "2026-11-10", TODAY) == "in_progress"
    assert ms.display_state("pending", None, TODAY) == "no_date"
    assert ms.display_state("pending", "not a date", TODAY) == "no_date"
    assert ms.display_state("pending", date(2026, 11, 3), TODAY) == "overdue"  # asyncpg returns date objects


def test_progress_rule_is_the_mean_of_per_milestone_completion():
    assert ms.progress_of([]) is None  # not tracked is NOT zero
    assert ms.progress_of([row("pending")]) == 0  # tracked, nothing done is zero
    assert ms.progress_of([row("completed"), row("pending")]) == 50
    assert ms.progress_of([row("completed"), row("in_progress", pct=40), row("pending")]) == 47  # (100+40+0)/3
    assert ms.progress_of([row("in_progress", pct=150)]) == 99  # never claims 100 without 'completed'
    assert ms.progress_of([row("completed", pct=0)]) == 100  # status wins over a stale percentage


def test_summary_counts_agree_with_the_states():
    rows = [
        row("completed", "2026-10-01"),
        row("pending", "2026-10-15"),  # overdue
        row("in_progress", "2026-12-01", pct=30),
        row("pending", "2026-12-20"),
        row("pending", None),
    ]
    s = ms.summarise(rows, TODAY)
    assert (s["total"], s["completed"], s["overdue"], s["inProgress"], s["upcoming"]) == (5, 1, 1, 1, 2)
    assert s["progress"] == round((100 + 0 + 30 + 0 + 0) / 5)
    assert ms.summarise([], TODAY) == ms.EMPTY_SUMMARY and ms.EMPTY_SUMMARY["progress"] is None


def test_resolve_update_keeps_status_and_percentage_coherent():
    assert ms.resolve_update("pending", 0, "completed", None) == ("completed", 100)
    assert ms.resolve_update("completed", 100, "pending", None) == ("pending", 0)
    assert ms.resolve_update("pending", 0, "in_progress", 60) == ("in_progress", 60)
    assert ms.resolve_update("pending", 0, "in_progress", None) == ("in_progress", 1)
    assert ms.resolve_update("in_progress", 40, "in_progress", None) == ("in_progress", 40)
    assert ms.resolve_update("pending", 0, None, 0) == ("pending", 0)
    assert ms.resolve_update("pending", 0, None, 55) == ("in_progress", 55)
    assert ms.resolve_update("in_progress", 55, None, 100) == ("completed", 100)


@pytest.mark.parametrize("status,pct", [("blocked", None), ("overdue", None), (None, None), (None, -1), (None, 101), ("completed", 500)])
def test_resolve_update_rejects_unsupported_input(status, pct):
    with pytest.raises(ValueError):
        ms.resolve_update("pending", 0, status, pct)


def test_view_marks_only_the_creators_milestones():
    view = ms.milestone_view(row("pending", "2026-11-03", created_by="u1", completed_at=None), TODAY, "u1")
    assert view["state"] == "overdue" and view["createdByYou"] is True and view["completedAt"] is None
    assert ms.milestone_view(row(created_by="faculty-9"), TODAY, "u1")["createdByYou"] is False
