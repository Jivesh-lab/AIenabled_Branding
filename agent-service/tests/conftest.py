import pytest

from core import team_access


@pytest.fixture(autouse=True)
def no_real_node_backend(monkeypatch):
    """Tests never call the real Node backend; membership defaults to 'not a member' unless a test sets it."""
    async def not_a_member(user_id, project_id):
        return False

    monkeypatch.setattr(team_access, "_lookup_membership", not_a_member)
