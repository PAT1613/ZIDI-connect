import pytest

from apps.common.utils import generate_code


@pytest.mark.django_db
def test_generate_code_monotonic():
    a = generate_code("TST")
    b = generate_code("TST")
    c = generate_code("TST")
    assert a == "TST-000001"
    assert b == "TST-000002"
    assert c == "TST-000003"


@pytest.mark.django_db
def test_generate_code_isolated_per_prefix():
    a = generate_code("AAA")
    b = generate_code("BBB")
    assert a.endswith("000001")
    assert b.endswith("000001")
