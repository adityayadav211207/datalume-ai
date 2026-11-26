from __future__ import annotations

import logging
import os
import socket
from typing import Any

import httpx
import pandas as pd

from .analytics import answer_question as deterministic_answer, statistics, kpis

logger = logging.getLogger(__name__)

# Ensure IPv4 resolution when IPv6 network route is unreachable on local host
_orig_getaddrinfo = socket.getaddrinfo

def _ipv4_preferring_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    try:
        return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
    except Exception:
        return _orig_getaddrinfo(host, port, family, type, proto, flags)

socket.getaddrinfo = _ipv4_preferring_getaddrinfo

SYSTEM_INSTRUCTION = """You are Lumi, an intelligent, friendly, and expert Conversational Data Analyst for DataLume AI Analytics.

Your Core Identity & Responsibilities:
1. Multilingual & Flexible: You understand and naturally communicate in English, Hindi, and Hinglish (e.g., "dataset mein kitni rows hain", "kya kar sakte ho", "show me top categories").
2. Conversational & Approachable: You comfortably handle greetings ("Hi", "Hello", "hlo bro", "namaste"), small talk, follow-up questions, and general inquiries about data science, analytics, machine learning, and DataLume.
3. Natural Language Understanding: Always tolerate typos, grammatical mistakes, abbreviations, and informal phrasing (e.g., "wht is my datset", "calcualte avg reveue"). Never reject a query because of spelling or grammar; infer the intent gracefully.
4. Grounded Dataset Intelligence:
   - When dataset context is provided, answer accurately using the real facts, columns, counts, and statistical summaries provided in the prompt.
   - For calculated numbers, rely on the grounded calculations provided in the prompt or existing metrics. NEVER hallucinate or invent numbers that contradict the dataset.
   - If a requested analytical calculation is not already present, clearly state the facts available and suggest a next step or relevant chart.
5. Without Dataset:
   - When no dataset is uploaded, warmly assist the user, answer data science / analytics / business questions, and explain what DataLume can do once they upload their CSV or Excel file.
6. Tone: Professional yet conversational, helpful, concise, well-structured, and clear. Format answers with clean markdown when useful (bullet points, bold key figures). Do NOT produce raw markdown tables unless specifically requested. Keep answers crisp and readable."""


def get_gemini_config() -> tuple[str | None, str]:
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    return api_key, model


def build_dataset_summary(frame: pd.DataFrame | None, dataset_name: str | None = None) -> str:
    if frame is None or frame.empty:
        return "No dataset is currently uploaded or selected."

    stats = statistics(frame)
    meta = stats.get("metadata", {})
    cols_info = meta.get("columns", [])
    row_count = meta.get("row_count", len(frame))
    col_count = meta.get("column_count", len(frame.columns))
    dup_rows = meta.get("duplicate_rows", 0)

    columns_desc = []
    for c in cols_info[:25]:
        columns_desc.append(f"- {c['name']} (type: {c['type']}, missing: {c['missing']} ({c['missing_percent']}%), unique: {c['unique']})")

    numeric_summary = stats.get("numeric", {})
    numeric_lines = []
    for col, vals in list(numeric_summary.items())[:10]:
        numeric_lines.append(f"- {col}: mean={vals.get('mean')}, median={vals.get('median')}, min={vals.get('min')}, max={vals.get('max')}")

    categorical_summary = stats.get("categorical", {})
    categorical_lines = []
    for col, vals in list(categorical_summary.items())[:5]:
        top_vals = [f"{item['value']} ({item['count']})" for item in vals[:5]]
        categorical_lines.append(f"- {col}: top categories [{', '.join(top_vals)}]")

    summary_parts = [
        f"Active Dataset: {dataset_name or 'Uploaded File'}",
        f"Total Records (Rows): {row_count:,}",
        f"Total Columns: {col_count}",
        f"Duplicate Rows: {dup_rows:,}",
        f"Columns:\n" + "\n".join(columns_desc),
    ]

    if numeric_lines:
        summary_parts.append("Numeric Summary:\n" + "\n".join(numeric_lines))
    if categorical_lines:
        summary_parts.append("Categorical Top Values:\n" + "\n".join(categorical_lines))

    return "\n\n".join(summary_parts)


async def ask_gemini(
    question: str,
    dataset_context: str | None = None,
    history: list[dict[str, str]] | None = None,
    calculated_facts: dict[str, Any] | None = None,
) -> str | None:
    api_key, model = get_gemini_config()
    if not api_key:
        return None

    # Construct conversation contents for Gemini REST API
    contents: list[dict[str, Any]] = []

    # Inject system instruction & context in system instruction or initial prompt
    system_part = SYSTEM_INSTRUCTION
    if dataset_context:
        system_part += f"\n\nCURRENT DATASET CONTEXT:\n{dataset_context}"
    if calculated_facts:
        system_part += f"\n\nGROUNDED EXACT CALCULATIONS FOR THIS QUESTION:\n{calculated_facts}"

    # Previous turns (if any)
    if history:
        for turn in history[-6:]:  # Keep recent turns
            role = "user" if turn.get("role") == "user" else "model"
            content = turn.get("content", "")
            if content:
                contents.append({"role": role, "parts": [{"text": content}]})

    # Current user turn
    user_prompt = question
    contents.append({"role": "user", "parts": [{"text": user_prompt}]})

    payload = {
        "system_instruction": {
            "parts": [{"text": system_part}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 1024,
        }
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
            else:
                logger.warning("Gemini API call failed with status %d: %s", res.status_code, res.text[:200])
    except Exception as exc:
        logger.error("Error communicating with Gemini API: %s", exc)

    return None


async def answer_with_lumi(
    question: str,
    frame: pd.DataFrame | None = None,
    dataset_name: str | None = None,
    history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Unified conversational AI handler combining Gemini LLM intelligence with deterministic analytics."""
    facts: dict[str, Any] = {}
    deterministic_result: dict[str, Any] | None = None

    if frame is not None and not frame.empty:
        try:
            deterministic_result = deterministic_answer(frame, question)
            facts = deterministic_result.get("facts", {})
        except Exception:
            deterministic_result = None

    dataset_summary = build_dataset_summary(frame, dataset_name) if frame is not None else None

    # Call Gemini with context and grounded facts
    gemini_answer = await ask_gemini(
        question=question,
        dataset_context=dataset_summary,
        history=history,
        calculated_facts=facts if facts else None,
    )

    if gemini_answer:
        return {
            "answer": gemini_answer,
            "facts": facts,
            "kind": "conversational_ai",
        }

    # Fallback to deterministic analytics if Gemini is unreachable/unconfigured
    if deterministic_result:
        return deterministic_result

    # Default fallback when no dataset and Gemini is unavailable
    return {
        "answer": "Hello! I am Lumi, your AI Data Assistant. Please upload a dataset (CSV or Excel) to explore insights, statistics, and charts!",
        "facts": {},
        "kind": "fallback",
    }
