from __future__ import annotations

import math
import re
from typing import Any

import numpy as np
import pandas as pd


def safe_value(value: Any) -> Any:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        return float(value) if math.isfinite(float(value)) else None
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()
    return value.item() if isinstance(value, np.generic) else value


def metadata(frame: pd.DataFrame) -> dict[str, Any]:
    columns = []
    for name in frame.columns:
        series = frame[name]
        looks_like_date = any(token in str(name).lower() for token in ("date", "time", "timestamp"))
        parsed = pd.to_datetime(series, errors="coerce") if looks_like_date and not pd.api.types.is_numeric_dtype(series) else None
        inferred = "datetime" if parsed is not None and parsed.notna().mean() >= 0.8 else str(series.dtype)
        columns.append({"name": str(name), "type": inferred, "missing": int(series.isna().sum()),
                        "missing_percent": round(float(series.isna().mean() * 100), 2),
                        "unique": int(series.nunique(dropna=True))})
    return {"row_count": int(len(frame)), "column_count": int(len(frame.columns)),
            "columns": columns, "duplicate_rows": int(frame.duplicated().sum())}


def statistics(frame: pd.DataFrame) -> dict[str, Any]:
    numeric = frame.select_dtypes(include="number")
    numeric_summary: dict[str, Any] = {}
    for name in numeric.columns:
        values = numeric[name].dropna()
        numeric_summary[str(name)] = {key: safe_value(value) for key, value in {
            "count": values.count(), "mean": values.mean(), "median": values.median(),
            "std": values.std(), "min": values.min(), "max": values.max()
        }.items()}
    categorical: dict[str, Any] = {}
    for name in frame.select_dtypes(exclude="number").columns:
        categorical[str(name)] = [{"value": safe_value(value), "count": int(count)}
                                  for value, count in frame[name].value_counts(dropna=True).head(10).items()]
    correlations = numeric.corr().replace({np.nan: None}).to_dict() if len(numeric.columns) > 1 else {}
    return {"metadata": metadata(frame), "numeric": numeric_summary, "categorical": categorical,
            "correlations": correlations}


def kpis(frame: pd.DataFrame) -> list[dict[str, Any]]:
    cards = [{"label": "Records", "value": len(frame), "column": None, "calculation": "Row count"}]
    for name in frame.select_dtypes(include="number").columns[:3]:
        label = re.sub(r"[_-]+", " ", str(name)).title()
        values = frame[name].dropna()
        if len(values):
            cards.append({"label": f"Average {label}", "value": safe_value(values.mean()),
                          "column": str(name), "calculation": f"Mean of {name}"})
    for name in frame.columns:
        if any(word in str(name).lower() for word in ("revenue", "sales", "profit", "total")) and pd.api.types.is_numeric_dtype(frame[name]):
            cards.insert(1, {"label": f"Total {str(name).replace('_', ' ').title()}",
                             "value": safe_value(frame[name].sum()), "column": str(name),
                             "calculation": f"Sum of {name}"})
            break
    return cards[:4]


def filtered(frame: pd.DataFrame, filters: dict[str, Any] | None) -> pd.DataFrame:
    result = frame
    for column, spec in (filters or {}).items():
        if column not in result.columns or not isinstance(spec, dict):
            continue
        series = result[column]
        if "search" in spec:
            result = result[series.astype(str).str.contains(str(spec["search"]), case=False, na=False)]
        if "values" in spec and isinstance(spec["values"], list):
            result = result[result[column].isin(spec["values"])]
        if pd.api.types.is_numeric_dtype(series):
            if spec.get("min") is not None:
                result = result[result[column] >= float(spec["min"])]
            if spec.get("max") is not None:
                result = result[result[column] <= float(spec["max"])]
        if spec.get("start_date") or spec.get("end_date"):
            try:
                date_series = pd.to_datetime(series, errors="coerce")
                if spec.get("start_date"):
                    start = pd.to_datetime(spec["start_date"], errors="coerce")
                    if pd.notna(start):
                        result = result[date_series >= start]
                if spec.get("end_date"):
                    end = pd.to_datetime(spec["end_date"], errors="coerce")
                    if pd.notna(end):
                        result = result[date_series <= end]
            except Exception:
                pass
    return result


def answer_question(frame: pd.DataFrame, question: str) -> dict[str, Any]:
    """Answer English and Hinglish questions with calculations, insights, and conversational intelligence from the active frame."""
    lower = question.lower().strip()
    hinglish = bool(re.search(r"\b(ka|ki|ke|kya|hai|hain|batao|bataiye|kitna|kitni|kitne|mein|me|kaisa|kaisi|ausat|nikalo|dikhao|kaun|kaunsa|sabse)\b", lower))

    def response(english: str, hinglish_text: str, facts: dict[str, Any], kind: str = "calculated") -> dict[str, Any]:
        return {"answer": hinglish_text if hinglish else english, "facts": facts, "kind": kind}

    normalized_question = re.sub(r"[^a-z0-9]+", " ", lower).strip()

    # 1. Greetings & Capabilities
    if any(re.search(rf"\b{term}\b", normalized_question) for term in ("hi", "hello", "hey", "namaste", "namaskar", "who are you", "what can you do", "help", "kya kar sakte ho")):
        cols_preview = ", ".join(map(str, list(frame.columns)[:5]))
        return response(
            f"Hello! I'm Lumi, your AI Data Assistant. I have analyzed your uploaded dataset ({len(frame):,} rows and {len(frame.columns)} columns including {cols_preview}). You can ask me anything about this data — row counts, column details, averages, totals, highest/lowest values, rankings, category comparisons, data quality, or a complete executive summary!",
            f"Namaste! Main Lumi hoon, aapka AI Data Assistant. Maine aapka uploaded dataset ({len(frame):,} rows aur {len(frame.columns)} columns jaise {cols_preview}) analyze kar liya hai. Aap mujhse is data ke baare mein kuch bhi pooch sakte hain — total rows, columns, averages, totals, max/min values, category rankings ya full summary!",
            {"row_count": len(frame), "column_count": len(frame.columns), "columns": list(map(str, frame.columns))}
        )

    # 2. Row / Record count intents (e.g. "how much rows in this dataset", "how many rows", "kitni rows hain")
    row_count_patterns = (
        r"\b(how\s+(many|much)|number\s+of|total|count|kitni|kitne|kitna)\b.*\b(row|rows|record|records|entry|entries|lines|tuples)\b",
        r"\b(row|rows|record|records|entry|entries|lines|tuples)\b.*\b(count|total|number|kitni|kitne|kitna|batao|dikhao)\b",
        r"\b(dataset\s+(size|length)|how\s+big\s+is|total\s+data)\b",
    )
    if any(re.search(pattern, normalized_question) for pattern in row_count_patterns) or normalized_question in ("rows", "row count", "records", "total rows", "how many rows", "how much rows"):
        return response(
            f"This dataset has {len(frame):,} rows (records) and {len(frame.columns)} columns.",
            f"Is dataset mein {len(frame):,} rows (records) aur {len(frame.columns)} columns hain.",
            {"row_count": len(frame), "column_count": len(frame.columns)}
        )

    # 3. Column count / names / schema intents
    col_count_patterns = (
        r"\b(how\s+(many|much)|number\s+of|total|count|list|what|which|all|kitne|kitni|kya)\b.*\b(column|columns|col|cols|field|fields|feature|features|variables|headers)\b",
        r"\b(column|columns|col|cols|field|fields|feature|features|variables|headers)\b.*\b(count|total|number|names|list|kitne|kitni|kya|batao|dikhao)\b",
    )
    if any(re.search(pattern, normalized_question) for pattern in col_count_patterns) or normalized_question in ("columns", "column names", "fields", "list columns", "schema"):
        cols_list = list(map(str, frame.columns))
        return response(
            f"The dataset has {len(frame.columns)} columns: {', '.join(cols_list)}.",
            f"Dataset mein {len(frame.columns)} columns hain: {', '.join(cols_list)}.",
            {"column_count": len(frame.columns), "columns": cols_list}
        )

    # 4. Data Quality & Missing / Null Values
    if any(term in lower for term in ("missing", "null", "quality", "khali", "missing value", "empty", "duplicates", "clean")):
        missing = frame.isna().sum()
        details = {str(key): int(value) for key, value in missing[missing > 0].items()}
        total = int(missing.sum())
        dup_count = int(frame.duplicated().sum())
        if "duplicate" in lower:
            return response(
                f"There are {dup_count:,} duplicate rows detected in this dataset.",
                f"Is dataset mein {dup_count:,} duplicate rows mili hain.",
                {"duplicate_rows": dup_count}
            )
        return response(
            f"{total} missing values found across {len(details)} columns ({dup_count} duplicate rows).",
            f"Dataset mein {len(details)} columns mein kul {total} missing values hain ({dup_count} duplicate rows).",
            {"missing_total": total, "missing_by_column": details, "duplicate_rows": dup_count}
        )

    # 5. Correlation & Relationships
    if any(term in lower for term in ("correlation", "correlat", "sambandh", "rishta", "relationship")):
        corr = frame.select_dtypes(include="number").corr()
        if corr.shape[1] < 2:
            return response("There are not enough numeric columns to calculate correlations.",
                            "Correlation nikalne ke liye kam se kam do numeric columns chahiye.", {})
        pairs = [(abs(float(corr.iloc[i, j])), str(corr.columns[i]), str(corr.columns[j]), float(corr.iloc[i, j]))
                 for i in range(len(corr.columns)) for j in range(i + 1, len(corr.columns))]
        strength, first, second, value = max(pairs)
        return response(f"The strongest numeric correlation is between {first} and {second}: {value:.3f}. Correlation does not imply causation.",
                        f"Sabse strong correlation {first} aur {second} ke beech hai: {value:.3f}. Correlation ka matlab causation nahi hota.",
                        {"columns": [first, second], "correlation": value})

    # 6. Column resolution
    numeric_names = list(frame.select_dtypes(include="number").columns)
    category_names = list(frame.select_dtypes(exclude="number").columns)

    def find_column(columns: list[Any]) -> Any | None:
        matches = []
        for column in columns:
            normalized_column = re.sub(r"[^a-z0-9]+", " ", str(column).lower()).strip()
            if normalized_column and re.search(rf"(?<![a-z0-9]){re.escape(normalized_column)}(?![a-z0-9])", normalized_question):
                matches.append(column)
        return max(matches, key=lambda item: len(str(item))) if matches else None

    metric = find_column(numeric_names)
    category = find_column(category_names)

    operation_aliases = {
        "average": ("average", "avg", "mean", "ausat", "ausatan"),
        "sum": ("sum", "total", "combined", "kul", "jod", "jama", "overall"),
        "median": ("median", "madhyika"),
        "minimum": ("minimum", "min", "lowest", "smallest", "least", "sabse kam", "sabse chhota"),
        "maximum": ("maximum", "max", "highest", "largest", "biggest", "peak", "sabse zyada", "sabse bada"),
        "count": ("count", "number of", "how many", "kitne", "kitni", "ginti"),
        "spread": ("standard deviation", "std dev", "spread", "variation"),
    }
    operation = next((name for name, aliases in operation_aliases.items() if any(alias in normalized_question for alias in aliases)), None)
    ranking_question = any(term in normalized_question for term in ("highest", "best", "top", "most", "perform", "sabse zyada", "kaun sa", "lowest", "worst"))

    # 7. Math operation on specific numeric column
    if operation and metric and not (category and ranking_question):
        values = frame[metric].dropna()
        calculations = {
            "average": (values.mean(), "average", "average", "ka average", "ka ausat"),
            "sum": (values.sum(), "total", "total", "ka total", "ka kul yog"),
            "median": (values.median(), "median", "median", "ka median", "ka madhyika"),
            "minimum": (values.min(), "minimum", "minimum", "ka minimum", "ka sabse kam value"),
            "maximum": (values.max(), "maximum", "maximum", "ka maximum", "ka sabse zyada value"),
            "count": (values.count(), "non-empty values", "non-empty values", "non-empty values", "non-empty values"),
            "spread": (values.std(), "standard deviation", "standard deviation", "ka standard deviation", "ka standard deviation"),
        }
        value, label, hinglish_label, _, hinglish_value_label = calculations[operation]
        value = safe_value(value)
        if value is None:
            return response(f"Column {metric} has no numeric values to calculate.", f"{metric} column mein calculate karne ke liye numeric values nahi hain.", {})
        return response(f"The {label} {metric} is {value:,.6g}.",
                        f"{metric} {hinglish_value_label} {value:,.6g} hai.",
                        {"column": str(metric), "operation": operation, "value": value, "non_null_count": int(values.count())})

    # 8. All column averages
    if operation == "average" and not metric and numeric_names:
        values = {str(column): safe_value(frame[column].mean()) for column in numeric_names}
        details = ", ".join(f"{column}: {value:,.6g}" for column, value in values.items())
        return response(f"Column averages: {details}.", f"Sabhi numeric columns ka average: {details}.", {"averages": values})

    # 9. All column totals
    if operation == "sum" and not metric and numeric_names:
        values = {str(column): safe_value(frame[column].sum()) for column in numeric_names}
        details = ", ".join(f"{column}: {value:,.6g}" for column, value in values.items())
        return response(f"Column totals: {details}.", f"Sabhi numeric columns ka total: {details}.", {"totals": values})

    # 10. Category vs Metric Rankings (e.g. "Which region has highest revenue?")
    if not category and any(term in normalized_question for term in ("category", "categories", "group", "groups", "region", "segment", "product", "class")):
        candidates = [column for column in category_names if 1 < frame[column].nunique(dropna=True) <= 40]
        category = next((column for column in candidates if any(token in str(column).lower() for token in ("category", "region", "segment", "type", "group"))), None)
        category = category or (candidates[0] if candidates else None)
    if not metric and any(term in normalized_question for term in ("best", "highest", "top", "perform", "sabse zyada", "kaun sa", "revenue", "sales", "profit")):
        metric = next((column for column in numeric_names if any(token in str(column).lower() for token in ("revenue", "sales", "profit", "total", "amount"))), None)
        metric = metric or (numeric_names[0] if numeric_names else None)

    if category and metric and ranking_question:
        ascending = any(term in normalized_question for term in ("lowest", "worst", "sabse kam", "minimum"))
        grouped = frame.groupby(category, dropna=True)[metric].sum().sort_values(ascending=ascending)
        if grouped.empty:
            return response("There is no non-empty data for that comparison.", "Is comparison ke liye dataset mein data nahi hai.", {})
        winner, value = grouped.index[0], grouped.iloc[0]
        adjective = "lowest" if ascending else "highest"
        hinglish_adj = "sabse kam" if ascending else "sabse zyada"
        return response(f"{winner} has the {adjective} total {metric}: {value:,.4g}.",
                        f"{category} ke hisaab se {winner} ka {metric} total {hinglish_adj} hai: {value:,.4g}.",
                        {"category": safe_value(winner), "column": str(metric), "value": safe_value(value)})

    # 11. Summary & Overview & Insights
    if any(term in normalized_question for term in ("summar", "insight", "insights", "overview", "describe", "dataset kaisa", "data ke bare", "data ke baare", "explain data", "what is this data", "tell me about this data")):
        numeric = {name: {"mean": values["mean"], "min": values["min"], "max": values["max"]}
                   for name, values in statistics(frame)["numeric"].items()}
        summary = metadata(frame)
        english = f"This dataset has {len(frame):,} rows and {len(frame.columns)} columns, with {int(frame.isna().sum().sum())} missing values. Numeric summaries are included below."
        hinglish_text = f"Is dataset mein {len(frame):,} rows aur {len(frame.columns)} columns hain, aur {int(frame.isna().sum().sum())} missing values hain. Numeric columns ka summary neeche diya hai."
        return response(english, hinglish_text, {"numeric": numeric, "metadata": summary})

    # 12. Specific column inquiry (e.g. "tell me about sales", "what is region")
    if metric:
        values = frame[metric].dropna()
        mean_val = safe_value(values.mean())
        sum_val = safe_value(values.sum())
        min_val = safe_value(values.min())
        max_val = safe_value(values.max())
        return response(
            f"Summary for {metric}: Total is {sum_val:,.4g}, Average is {mean_val:,.4g}, ranging from {min_val:,.4g} to {max_val:,.4g} across {len(values):,} values.",
            f"{metric} ka summary: Total {sum_val:,.4g} hai, Average {mean_val:,.4g} hai, aur min {min_val:,.4g} se max {max_val:,.4g} tak range karta hai.",
            {"column": str(metric), "mean": mean_val, "sum": sum_val, "min": min_val, "max": max_val, "count": len(values)}
        )
    if category:
        top_items = frame[category].value_counts().head(5).to_dict()
        top_str = ", ".join(f"{k} ({v})" for k, v in top_items.items())
        return response(
            f"Column '{category}' has {frame[category].nunique()} unique values. Top values are: {top_str}.",
            f"Column '{category}' mein {frame[category].nunique()} unique values hain. Top values hain: {top_str}.",
            {"column": str(category), "unique_count": int(frame[category].nunique()), "top_values": top_items}
        )

    # 13. Top rows / sample data
    if any(term in normalized_question for term in ("sample", "preview", "first rows", "top rows", "show data", "data dikhao")):
        preview = frame.head(3).to_dict(orient="records")
        return response(
            f"Here is a preview of the first 3 rows of your dataset across {len(frame.columns)} columns.",
            f"Aapke dataset ki pehli 3 rows ka preview neeche diya gaya hai.",
            {"preview": preview, "row_count": len(frame)}
        )

    # 14. Data types & Schema
    if any(term in normalized_question for term in ("data type", "types of data", "dtypes", "schema", "column types", "fields type")):
        types_dict = {str(col): str(dtype) for col, dtype in frame.dtypes.items()}
        types_summary = ", ".join(f"{col} ({dtype})" for col, dtype in types_dict.items())
        return response(
            f"Column data types: {types_summary}.",
            f"Dataset ke columns ke data types: {types_summary}.",
            {"dtypes": types_dict}
        )

    # 15. Dataset Shape, Size & Dimensions
    if any(term in normalized_question for term in ("size", "shape", "dimension", "dimensions", "kitna bada", "kitni entries", "total data")):
        return response(
            f"This dataset contains {len(frame):,} rows and {len(frame.columns)} columns ({frame.size:,} total cells).",
            f"Is dataset mein kul {len(frame):,} rows aur {len(frame.columns)} columns hain ({frame.size:,} total cells).",
            {"row_count": len(frame), "column_count": len(frame.columns), "total_cells": int(frame.size)}
        )

    # 16. General question about data / dataset / analysis
    if any(term in normalized_question for term in ("data", "dataset", "table", "file", "record", "analysis", "batao", "help", "samjhao", "analyze", "explain")):
        numeric = {name: {"mean": values["mean"], "min": values["min"], "max": values["max"]}
                   for name, values in statistics(frame)["numeric"].items()}
        cols_preview = ", ".join(map(str, frame.columns[:8]))
        english = f"Your dataset has {len(frame):,} rows across {len(frame.columns)} columns ({cols_preview}{'...' if len(frame.columns) > 8 else ''}). You can ask me about averages, sums, maximums, minimums, missing values, or correlations between any fields."
        hinglish = f"Aapke dataset mein {len(frame):,} rows aur {len(frame.columns)} columns hain ({cols_preview}{'...' if len(frame.columns) > 8 else ''}). Aap mujhse kisi bhi column ka average, total, sabse zyada/kam value, missing records ya correlations pooch sakte hain."
        return response(english, hinglish, {"row_count": len(frame), "column_count": len(frame.columns), "numeric_summary": numeric})

    english_fallback = "I couldn't map that to a reliable calculation. Ask about a column by name, such as 'average balance', 'total sales', 'highest age', or ask for a summary, missing values, correlations, or a grouped comparison."
    hinglish_fallback = "Is sawaal ko reliable calculation se map nahi kar paya. Column ka naam use karke poochhein, jaise 'balance ka average', 'sales ka total', ya summary, missing values, correlation aur category comparison ke baare mein poochhein."
    return response(english_fallback, hinglish_fallback, {}, "unsupported")
