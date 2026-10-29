import asyncio

import pandas as pd
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.analytics import answer_question, filtered, kpis, metadata, statistics
from app.main import DATASETS, app, current_user, owned_dataset


def test_metadata_and_statistics_include_quality_and_numeric_facts():
    frame = pd.DataFrame({"sales": [10, 20, None], "region": ["East", "West", "East"]})
    result = statistics(frame)
    assert metadata(frame)["row_count"] == 3
    assert result["numeric"]["sales"]["mean"] == 15
    assert metadata(frame)["columns"][0]["missing"] == 1


def test_kpis_do_not_invent_business_metrics():
    cards = kpis(pd.DataFrame({"temperature": [10, 20]}))
    assert [card["label"] for card in cards] == ["Records", "Average Temperature"]


def test_filters_apply_category_numeric_and_text_search():
    frame = pd.DataFrame({"region": ["North", "South", "North"], "amount": [3, 8, 12]})
    result = filtered(frame, {"region": {"values": ["North"]}, "amount": {"min": 5}, "note": {"search": "x"}})
    assert result["amount"].tolist() == [12]


def test_chat_calculation_uses_real_grouped_values():
    frame = pd.DataFrame({"category": ["A", "B", "A"], "sales": [4, 9, 10]})
    result = answer_question(frame, "Which category has the highest total sales?")
    assert result["facts"]["value"] == 14
    assert result["facts"]["category"] == "A"


def test_chat_resolves_generic_category_performance_question():
    frame = pd.DataFrame({"region": ["North", "South", "North"], "revenue": [4, 9, 10]})
    result = answer_question(frame, "Which categories perform best?")
    assert result["facts"] == {"category": "North", "column": "revenue", "value": 14}


@pytest.mark.parametrize("question", [
    "what is the average balance",
    "tell average balance in this dataset",
    "balance ka average kya hai",
    "is dataset mein balance ka ausat batao",
])
def test_chat_calculates_english_and_hinglish_column_average(question):
    result = answer_question(pd.DataFrame({"balance": [100, 300, 500]}), question)
    assert result["kind"] == "calculated"
    assert result["facts"]["column"] == "balance"
    assert result["facts"]["value"] == 300


@pytest.mark.parametrize("question", [
    "What is the average revenue?",
    "revenue ka average kya hai?",
    "Which region has the highest total revenue?",
])
def test_dataset_suggestion_prompts_map_to_calculations(question):
    frame = pd.DataFrame({
        "region": ["North", "South", "North"],
        "revenue": [100, 300, 500],
    })
    result = answer_question(frame, question)
    assert result["kind"] == "calculated"
    assert result["facts"]


def test_chat_insight_question_returns_dataset_summary():
    result = answer_question(pd.DataFrame({"balance": [100, 300, 500]}), "What are the most important insights?")
    assert "3 rows" in result["answer"]
    assert result["kind"] == "calculated"


@pytest.mark.parametrize("question", [
    "how much rows in this dataset",
    "how many rows",
    "total rows",
    "kitni rows hain is dataset mein",
])
def test_chat_answers_row_count_questions(question):
    frame = pd.DataFrame({"a": [1, 2, 3, 4, 5], "b": ["x", "y", "z", "w", "v"]})
    result = answer_question(frame, question)
    assert result["kind"] == "calculated"
    assert result["facts"]["row_count"] == 5
    assert "5 rows" in result["answer"]


def test_chat_answers_column_and_greetings():
    frame = pd.DataFrame({"sales": [10, 20], "region": ["US", "EU"]})
    col_result = answer_question(frame, "how many columns in this dataset")
    assert col_result["facts"]["column_count"] == 2
    hello_result = answer_question(frame, "hi")
    assert "Lumi" in hello_result["answer"]


def test_chat_endpoint_answers_hinglish_from_active_dataset():
    import app.main as main

    app.dependency_overrides[main.current_user] = lambda: {"id": "chat-user", "token": "demo-token"}
    dataset_id = "00000000-0000-0000-0000-000000000003"
    DATASETS[dataset_id] = {
        "user_id": "chat-user",
        "name": "bank.csv",
        "frame": pd.DataFrame({"balance": [100, 300, 500]}),
    }
    try:
        with TestClient(app) as client:
            result = client.post(f"/api/datasets/{dataset_id}/chat", json={
                "dataset_id": dataset_id,
                "question": "balance ka average kya hai",
            })
        assert result.status_code == 200
        assert result.json()["facts"]["value"] == 300
        assert "balance" in result.json()["answer"]
        assert "hai" in result.json()["answer"]
    finally:
        app.dependency_overrides.clear()
        DATASETS.pop(dataset_id, None)


def test_chat_content_normalizer_never_stringifies_objects_as_object_object():
    from pathlib import Path

    component_source = Path(__file__).parents[2] / "src" / "App.tsx"
    source = component_source.read_text(encoding="utf-8")
    assert "function normalizeChatContent(value: unknown): string" in source
    assert "This older reply could not be displayed. Please ask Lumi again." in source
    assert "String(message.content)" not in source


def test_chat_declines_unmappable_questions():
    result = answer_question(pd.DataFrame({"x": [1]}), "Tell me a joke")
    assert result["kind"] == "unsupported"


def test_dataset_ownership_cannot_be_changed_by_id_guessing():
    with pytest.raises(HTTPException) as error:
        owned_dataset("00000000-0000-0000-0000-000000000000", {"id": "another-user"})
    assert error.value.status_code == 404


def test_demo_mode_uses_local_persistence_without_auth_header():
    import app.main as main

    assert main.DEMO_USER == asyncio.run(main.current_user())
    app.dependency_overrides[main.current_user] = lambda: {"id": "demo-user", "token": "demo-token"}
    with TestClient(app) as client:
        dashboards = client.get("/api/dashboards")
        conversations = client.get("/api/conversations")
        assert dashboards.status_code == 200
        assert conversations.status_code == 200
        assert dashboards.json() == []
        assert conversations.json() == []
    app.dependency_overrides.clear()


def test_chart_endpoint_uses_allowlisted_aggregation_and_owner(monkeypatch):
    import app.main as main

    app.dependency_overrides[main.current_user] = lambda: {"id": "owner", "token": "token"}
    dataset_id = "00000000-0000-0000-0000-000000000001"
    DATASETS[dataset_id] = {"user_id": "owner", "name": "sales.csv",
                            "frame": pd.DataFrame({"region": ["N", "S", "N"], "sales": [2, 8, 5]})}
    with TestClient(app) as client:
        result = client.post(f"/api/datasets/{dataset_id}/charts", json={
            "x": "region", "y": "sales", "aggregation": "sum", "chart_type": "bar"})
        assert result.status_code == 200
        assert result.json()["data"] == [{"name": "S", "value": 8.0}, {"name": "N", "value": 7.0}]
        invalid = client.post(f"/api/datasets/{dataset_id}/charts", json={
            "x": "region", "y": "sales", "aggregation": "exec", "chart_type": "bar"})
        assert invalid.status_code == 422
    app.dependency_overrides.clear()
    DATASETS.pop(dataset_id, None)


def test_chart_endpoint_rejects_missing_or_non_numeric_measure(monkeypatch):
    import app.main as main

    app.dependency_overrides[main.current_user] = lambda: {"id": "owner", "token": "token"}
    dataset_id = "00000000-0000-0000-0000-000000000002"
    DATASETS[dataset_id] = {"user_id": "owner", "name": "sample.csv",
                            "frame": pd.DataFrame({"group": ["a", "b"], "label": ["x", "y"]})}
    with TestClient(app) as client:
        result = client.post(f"/api/datasets/{dataset_id}/charts", json={
            "x": "group", "y": "label", "aggregation": "sum"})
        assert result.status_code == 422
    app.dependency_overrides.clear()
    DATASETS.pop(dataset_id, None)