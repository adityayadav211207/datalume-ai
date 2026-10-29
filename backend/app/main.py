from __future__ import annotations

import io
import os
import uuid
from pathlib import PurePosixPath
from typing import Any

import httpx
import pandas as pd
from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .analytics import answer_question, filtered, kpis, metadata, statistics

app = FastAPI(title="DataLume AI API", version="1.0.0")
frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGIN", "http://localhost:5173,http://localhost:5174").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
DATASETS: dict[str, dict[str, Any]] = {}
DASHBOARDS: dict[str, dict[str, Any]] = {}
CONVERSATIONS: dict[str, dict[str, Any]] = {}
MESSAGES: dict[str, list[dict[str, Any]]] = {}
MAX_BYTES = int(os.getenv("MAX_UPLOAD_MB", "25")) * 1024 * 1024
DEMO_USER = {"id": "demo-user", "token": "demo-token"}


class QueryRequest(BaseModel):
    filters: dict[str, Any] = Field(default_factory=dict)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=500)
    search: str | None = Field(default=None, max_length=300)


class ChatRequest(BaseModel):
    dataset_id: str
    question: str = Field(min_length=1, max_length=1000)
    filters: dict[str, Any] = Field(default_factory=dict)


class ChartRequest(BaseModel):
    x: str = Field(min_length=1, max_length=200)
    y: str | None = Field(default=None, max_length=200)
    chart_type: str = Field(default="bar", pattern="^(bar|horizontal-bar|line|area|pie|donut|histogram|scatter|heatmap|boxplot|radar|missing|treemap)$")
    aggregation: str = Field(default="count", pattern="^(sum|average|count|minimum|maximum|median)$")
    top_n: int = Field(default=10, ge=1, le=100)
    filters: dict[str, Any] = Field(default_factory=dict)



class DashboardRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    dataset_id: str
    configuration: dict[str, Any] = Field(default_factory=dict)


class ConversationRequest(BaseModel):
    dataset_id: str | None = None
    title: str = Field(default="New conversation", min_length=1, max_length=160)


class MessageRequest(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=5000)
    metadata: dict[str, Any] | None = None


async def current_user(authorization: str | None = Header(default=None)) -> dict[str, str]:
    return DEMO_USER


def owned_dataset(dataset_id: str, user: dict[str, str]) -> dict[str, Any]:
    try:
        uuid.UUID(dataset_id)
    except ValueError as exc:
        raise HTTPException(422, "Invalid dataset id.") from exc
    dataset = DATASETS.get(dataset_id)
    if not dataset or dataset["user_id"] != user["id"]:
        raise HTTPException(404, "Dataset not found.")
    return dataset


async def load_owned_dataset(dataset_id: str, user: dict[str, str]) -> dict[str, Any]:
    try:
        uuid.UUID(dataset_id)
    except ValueError as exc:
        raise HTTPException(422, "Invalid dataset id.") from exc
    cached = DATASETS.get(dataset_id)
    if cached:
        if cached["user_id"] != user["id"]:
            raise HTTPException(404, "Dataset not found.")
        return cached
    url, key = os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_PUBLISHABLE_KEY")
    if not url or not key:
        raise HTTPException(503, "Supabase persistence is not configured.")
    headers = {"apikey": key, "Authorization": f"Bearer {user['token']}"}
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(f"{url.rstrip('/')}/rest/v1/datasets?id=eq.{dataset_id}&select=id,user_id,name,original_filename,file_type,storage_path", headers=headers)
        if response.status_code != 200:
            raise HTTPException(502, "Could not restore dataset metadata.")
        entries = response.json()
        if not entries or entries[0]["user_id"] != user["id"]:
            raise HTTPException(404, "Dataset not found.")
        record = entries[0]
        storage_path = record["storage_path"]
        if not storage_path.startswith(f"{user['id']}/{dataset_id}/"):
            raise HTTPException(404, "Dataset not found.")
        stored = await client.get(f"{url.rstrip('/')}/storage/v1/object/user-datasets/{storage_path}", headers=headers)
        if stored.status_code != 200:
            raise HTTPException(502, "Could not restore the private dataset file.")
    content = stored.content
    try:
        extension = record["file_type"]
        frame = pd.read_csv(io.BytesIO(content), nrows=500_001) if extension == "csv" else pd.read_excel(
            io.BytesIO(content), nrows=500_001, engine="openpyxl" if extension == "xlsx" else "xlrd")
    except Exception as exc:
        raise HTTPException(422, "The stored dataset could not be parsed.") from exc
    if len(frame) > 500_000:
        raise HTTPException(413, "A maximum of 500,000 rows is supported per dataset.")
    if frame.columns.duplicated().any():
        seen: dict[str, int] = {}
        names = []
        for name in frame.columns:
            base = str(name)
            count = seen.get(base, 0)
            seen[base] = count + 1
            names.append(base if count == 0 else f"{base}.{count}")
        frame.columns = names
    dataset = {"user_id": user["id"], "name": record["name"], "frame": frame,
               "source": content, "file_type": extension}
    DATASETS[dataset_id] = dataset
    return dataset


async def persist_upload(user: dict[str, str], dataset_id: str, name: str, content: bytes, file_type: str, details: dict[str, Any]) -> None:
    return None


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/datasets/upload")
async def upload_dataset(file: UploadFile = File(...), user: dict[str, str] = Depends(current_user)) -> dict[str, Any]:
    raw_name = (file.filename or "dataset.csv").replace("\\", "/")
    filename = PurePosixPath(raw_name).name
    if not filename or filename in {".", ".."} or len(filename) > 180:
        raise HTTPException(400, "Invalid dataset filename.")
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in {"csv", "xlsx", "xls"}:
        raise HTTPException(415, "Upload a CSV, XLSX, or XLS dataset.")
    content = await file.read(MAX_BYTES + 1)
    if not content or len(content) > MAX_BYTES:
        raise HTTPException(413, f"File must be non-empty and no larger than {MAX_BYTES // (1024 * 1024)} MB.")
    mime = (file.content_type or "").lower()
    allowed_mimes = {"text/csv", "application/csv", "application/vnd.ms-excel",
                     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     "application/octet-stream", "text/plain"}
    if mime not in allowed_mimes:
        raise HTTPException(415, "The declared content type is not supported.")
    if extension == "xlsx" and not content.startswith(b"PK\x03\x04"):
        raise HTTPException(400, "The file does not have a valid XLSX signature.")
    if extension == "xls" and not content.startswith(bytes.fromhex("D0CF11E0A1B11AE1")):
        raise HTTPException(400, "The file does not have a valid XLS signature.")
    if extension == "csv" and b"\x00" in content[:4096]:
        raise HTTPException(400, "The file does not have a valid CSV text signature.")
    try:
        if extension == "csv":
            if b"\x00" in content[:4096]:
                raise ValueError("Binary content is not a CSV.")
            frame = pd.read_csv(io.BytesIO(content), nrows=500_001)
        else:
            frame = pd.read_excel(io.BytesIO(content), nrows=500_001, engine="openpyxl" if extension == "xlsx" else None)
    except Exception as exc:
        raise HTTPException(400, "The file could not be parsed. Check that it is a valid CSV or Excel workbook.") from exc
    if len(frame) > 500_000:
        raise HTTPException(413, "A maximum of 500,000 rows is supported per upload.")
    if frame.columns.duplicated().any():
        seen: dict[str, int] = {}
        names = []
        for name in frame.columns:
            base = str(name)
            count = seen.get(base, 0)
            seen[base] = count + 1
            names.append(base if count == 0 else f"{base}.{count}")
        frame.columns = names
    dataset_id = str(uuid.uuid4())
    details = metadata(frame)
    await persist_upload(user, dataset_id, filename, content, extension, details)
    DATASETS[dataset_id] = {"user_id": user["id"], "name": filename, "frame": frame, "source": content, "file_type": extension}
    return {"id": dataset_id, "name": filename, "metadata": details, "statistics": statistics(frame), "kpis": kpis(frame)}


@app.get("/api/datasets")
async def list_datasets(user: dict[str, str] = Depends(current_user)) -> list[dict[str, Any]]:
    response: list[dict[str, Any]] = []
    for dataset_id, dataset in DATASETS.items():
        if dataset.get("user_id") == user["id"]:
            metadata_data = metadata(dataset["frame"])
            response.append({
                "id": dataset_id,
                "name": dataset["name"],
                "original_filename": dataset["name"],
                "file_type": dataset["file_type"],
                "row_count": metadata_data["row_count"],
                "column_count": metadata_data["column_count"],
                "created_at": metadata_data.get("created_at", "now"),
                "user_id": user["id"],
            })
    return sorted(response, key=lambda item: item["id"], reverse=True)


@app.get("/api/datasets/{dataset_id}/metadata")
async def get_metadata(dataset_id: str, user: dict[str, str] = Depends(current_user)) -> dict[str, Any]:
    dataset = await load_owned_dataset(dataset_id, user)
    return {"id": dataset_id, "name": dataset["name"], **metadata(dataset["frame"])}


@app.get("/api/datasets/{dataset_id}/statistics")
async def get_statistics(dataset_id: str, user: dict[str, str] = Depends(current_user)) -> dict[str, Any]:
    return statistics((await load_owned_dataset(dataset_id, user))["frame"])


@app.get("/api/datasets/{dataset_id}/kpis")
async def get_kpis(dataset_id: str, user: dict[str, str] = Depends(current_user)) -> list[dict[str, Any]]:
    return kpis((await load_owned_dataset(dataset_id, user))["frame"])


@app.post("/api/datasets/{dataset_id}/analysis")
async def get_analysis(dataset_id: str, request: QueryRequest, user: dict[str, str] = Depends(current_user)) -> dict[str, Any]:
    frame = filtered((await load_owned_dataset(dataset_id, user))["frame"], request.filters)
    return {"statistics": statistics(frame), "kpis": kpis(frame)}


@app.post("/api/datasets/{dataset_id}/charts")
async def chart_data(dataset_id: str, request: ChartRequest, user: dict[str, str] = Depends(current_user)) -> dict[str, Any]:
    frame = filtered((await load_owned_dataset(dataset_id, user))["frame"], request.filters)

    if request.chart_type == "missing":
        output = [
            {
                "name": str(col),
                "value": round(float(frame[col].isna().mean() * 100), 2),
                "missing": int(frame[col].isna().sum()),
                "total": len(frame),
            }
            for col in frame.columns
        ]
        output.sort(key=lambda item: item["value"], reverse=True)
        return {"data": output, "x": "columns", "y": "missing_percent", "aggregation": "percent", "row_count": len(frame)}

    if request.chart_type == "heatmap":
        numeric_frame = frame.select_dtypes(include="number")
        output = []
        if len(numeric_frame.columns) > 1:
            corr = numeric_frame.corr().replace({float("nan"): 0, None: 0})
            for c1 in corr.columns:
                for c2 in corr.columns:
                    val = corr.loc[c1, c2]
                    output.append({"x": str(c1), "y": str(c2), "value": round(float(val), 3) if pd.notna(val) else 0.0})
        return {"data": output, "x": "matrix", "y": "matrix", "aggregation": "correlation", "row_count": len(frame)}

    if request.x not in frame.columns or (request.y is not None and request.y not in frame.columns):
        raise HTTPException(422, "Chart columns must exist in the selected dataset.")

    if request.chart_type == "boxplot":
        if not pd.api.types.is_numeric_dtype(frame[request.x]):
            raise HTTPException(422, "Box plot requires a numeric column.")
        clean_vals = frame[request.x].dropna()
        if clean_vals.empty:
            output = []
        else:
            q1 = float(clean_vals.quantile(0.25))
            median = float(clean_vals.median())
            q3 = float(clean_vals.quantile(0.75))
            iqr = q3 - q1
            low_whisker = max(float(clean_vals.min()), q1 - 1.5 * iqr)
            high_whisker = min(float(clean_vals.max()), q3 + 1.5 * iqr)
            outliers = [float(v) for v in clean_vals[(clean_vals < low_whisker) | (clean_vals > high_whisker)].head(40)]
            output = [{
                "name": request.x,
                "min": float(clean_vals.min()),
                "q1": round(q1, 2),
                "median": round(median, 2),
                "q3": round(q3, 2),
                "max": float(clean_vals.max()),
                "lowWhisker": round(low_whisker, 2),
                "highWhisker": round(high_whisker, 2),
                "outliers": outliers,
                "value": round(median, 2),
            }]
        return {"data": output, "x": request.x, "y": request.y, "aggregation": "boxplot", "row_count": len(frame)}

    if request.chart_type == "scatter":
        if request.y is None:
            raise HTTPException(422, "Scatter plots require both X and Y numeric columns.")
        clean = frame[[request.x, request.y]].dropna()
        output = [
            {"name": f"{r[request.x]},{r[request.y]}", "x": float(r[request.x]), "y": float(r[request.y]), "value": float(r[request.y])}
            for _, r in clean.head(min(request.top_n * 20, 500)).iterrows()
        ]
        return {"data": output, "x": request.x, "y": request.y, "aggregation": "raw", "row_count": len(frame)}

    if request.aggregation != "count" and (request.y is None or not pd.api.types.is_numeric_dtype(frame[request.y])):
        raise HTTPException(422, "This aggregation requires a numeric Y-axis column.")
    if request.chart_type == "histogram":
        if not pd.api.types.is_numeric_dtype(frame[request.x]):
            raise HTTPException(422, "Histograms require a numeric X-axis column.")
        clean_vals = frame[request.x].dropna()
        if clean_vals.empty:
            output = []
        else:
            num_bins = min(max(request.top_n, 5), 30)
            counts, edges = pd.cut(clean_vals, bins=num_bins, retbins=True)
            def format_interval(iv):
                l, r = iv.left, iv.right
                if abs(l) < 0.001:
                    l = 0.0
                if float(l).is_integer() and float(r).is_integer():
                    return f"{int(l)}–{int(r)}"
                return f"{round(l, 1):g}–{round(r, 1):g}"
            output = [{"name": format_interval(interval), "value": int(count)} for interval, count in counts.value_counts(sort=False).items()]
    elif request.y is None or request.aggregation == "count":
        output = [{"name": str(value), "value": int(count)} for value, count in
                  frame[request.x].value_counts(dropna=True).head(request.top_n).items()]
    else:
        operation = {"sum": "sum", "average": "mean", "minimum": "min", "maximum": "max", "median": "median"}[request.aggregation]
        grouped = getattr(frame.groupby(request.x, dropna=True)[request.y], operation)().sort_values(ascending=False).head(request.top_n)
        output = [{"name": str(name), "value": float(value)} for name, value in grouped.items() if pd.notna(value)]
    return {"data": output, "x": request.x, "y": request.y, "aggregation": request.aggregation, "row_count": len(frame)}


@app.post("/api/datasets/{dataset_id}/query")
async def query_dataset(dataset_id: str, request: QueryRequest, user: dict[str, str] = Depends(current_user)) -> dict[str, Any]:
    frame = filtered((await load_owned_dataset(dataset_id, user))["frame"], request.filters)
    if request.search:
        mask = frame.astype(str).apply(lambda column: column.str.contains(request.search, case=False, na=False, regex=False)).any(axis=1)
        frame = frame[mask]
    start = (request.page - 1) * request.page_size
    records = frame.iloc[start:start + request.page_size].astype(object).where(pd.notna(frame.iloc[start:start + request.page_size]), None).to_dict(orient="records")
    for record in records:
        for key, value in record.items():
            if not isinstance(value, (str, int, float, bool, type(None))):
                record[key] = value.isoformat() if hasattr(value, "isoformat") else str(value)
    return {"rows": records,
            "total": len(frame), "page": request.page, "page_size": request.page_size, "columns": list(frame.columns)}


@app.post("/api/datasets/{dataset_id}/chat")
async def chat_dataset(dataset_id: str, request: ChatRequest, user: dict[str, str] = Depends(current_user)) -> dict[str, Any]:
    dataset = await load_owned_dataset(dataset_id, user)
    frame = filtered(dataset["frame"], request.filters)
    return answer_question(frame, request.question)


@app.post("/api/datasets/{dataset_id}/export")
async def export_dataset(dataset_id: str, request: QueryRequest, user: dict[str, str] = Depends(current_user)) -> dict[str, str]:
    frame = filtered((await load_owned_dataset(dataset_id, user))["frame"], request.filters)
    return {"filename": "datalume-filtered.csv", "content": frame.to_csv(index=False)}


@app.delete("/api/datasets/{dataset_id}")
async def delete_dataset(dataset_id: str, user: dict[str, str] = Depends(current_user)) -> dict[str, bool]:
    await load_owned_dataset(dataset_id, user)
    DATASETS.pop(dataset_id, None)
    return {"deleted": True}


@app.get("/api/dashboards")
async def list_dashboards(user: dict[str, str] = Depends(current_user)) -> list[dict[str, Any]]:
    return [
        {"id": dashboard_id, "dataset_id": dashboard["dataset_id"], "name": dashboard["name"], "configuration": dashboard["configuration"], "created_at": dashboard.get("created_at", "now"), "updated_at": dashboard.get("updated_at", "now")}
        for dashboard_id, dashboard in DASHBOARDS.items()
        if dashboard.get("user_id") == user["id"]
    ]


@app.post("/api/dashboards")
async def save_dashboard(request: DashboardRequest, user: dict[str, str] = Depends(current_user)) -> dict[str, Any]:
    await load_owned_dataset(request.dataset_id, user)
    dashboard_id = str(uuid.uuid4())
    record = {"id": dashboard_id, "dataset_id": request.dataset_id, "user_id": user["id"], "name": request.name, "configuration": request.configuration, "created_at": "now", "updated_at": "now"}
    DASHBOARDS[dashboard_id] = record
    return {"id": dashboard_id, "dataset_id": request.dataset_id, "name": request.name, "configuration": request.configuration}


@app.patch("/api/dashboards/{dashboard_id}")
async def update_dashboard(dashboard_id: str, request: DashboardRequest, user: dict[str, str] = Depends(current_user)) -> dict[str, Any]:
    await load_owned_dataset(request.dataset_id, user)
    dashboard = DASHBOARDS.get(dashboard_id)
    if not dashboard or dashboard["user_id"] != user["id"]:
        raise HTTPException(404, "Dashboard not found.")
    dashboard["dataset_id"] = request.dataset_id
    dashboard["name"] = request.name
    dashboard["configuration"] = request.configuration
    dashboard["updated_at"] = "now"
    return {"id": dashboard_id, "dataset_id": request.dataset_id, "name": request.name, "configuration": request.configuration}


@app.delete("/api/dashboards/{dashboard_id}")
async def delete_dashboard(dashboard_id: str, user: dict[str, str] = Depends(current_user)) -> dict[str, bool]:
    dashboard = DASHBOARDS.get(dashboard_id)
    if not dashboard or dashboard["user_id"] != user["id"]:
        raise HTTPException(404, "Dashboard not found.")
    DASHBOARDS.pop(dashboard_id, None)
    return {"deleted": True}


@app.get("/api/conversations")
async def list_conversations(user: dict[str, str] = Depends(current_user)) -> list[dict[str, Any]]:
    return [{"id": conversation_id, "dataset_id": conversation["dataset_id"], "title": conversation["title"], "created_at": conversation["created_at"], "updated_at": conversation["updated_at"]}
            for conversation_id, conversation in CONVERSATIONS.items() if conversation.get("user_id") == user["id"]]


@app.post("/api/conversations")
async def create_conversation(request: ConversationRequest, user: dict[str, str] = Depends(current_user)) -> dict[str, Any]:
    if request.dataset_id:
        await load_owned_dataset(request.dataset_id, user)
    conversation_id = str(uuid.uuid4())
    record = {"id": conversation_id, "user_id": user["id"], "dataset_id": request.dataset_id, "title": request.title, "created_at": "now", "updated_at": "now"}
    CONVERSATIONS[conversation_id] = record
    MESSAGES.setdefault(conversation_id, [])
    return {"id": conversation_id, "dataset_id": request.dataset_id, "title": request.title, "created_at": "now", "updated_at": "now"}


@app.get("/api/conversations/{conversation_id}/messages")
async def list_messages(conversation_id: str, user: dict[str, str] = Depends(current_user)) -> list[dict[str, Any]]:
    conversation = CONVERSATIONS.get(conversation_id)
    if not conversation or conversation["user_id"] != user["id"]:
        raise HTTPException(404, "Conversation not found.")
    return MESSAGES.get(conversation_id, [])


@app.post("/api/conversations/{conversation_id}/messages")
async def save_message(conversation_id: str, request: MessageRequest, user: dict[str, str] = Depends(current_user)) -> dict[str, Any]:
    conversation = CONVERSATIONS.get(conversation_id)
    if not conversation or conversation["user_id"] != user["id"]:
        raise HTTPException(404, "Conversation not found.")
    entry = {"role": request.role, "content": request.content, "metadata": request.metadata}
    MESSAGES.setdefault(conversation_id, []).append(entry)
    return entry


@app.patch("/api/conversations/{conversation_id}")
async def rename_conversation(conversation_id: str, request: ConversationRequest, user: dict[str, str] = Depends(current_user)) -> dict[str, Any]:
    conversation = CONVERSATIONS.get(conversation_id)
    if not conversation or conversation["user_id"] != user["id"]:
        raise HTTPException(404, "Conversation not found.")
    conversation["title"] = request.title
    conversation["updated_at"] = "now"
    return {"id": conversation_id, "dataset_id": conversation["dataset_id"], "title": request.title, "created_at": conversation["created_at"], "updated_at": "now"}


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, user: dict[str, str] = Depends(current_user)) -> dict[str, bool]:
    conversation = CONVERSATIONS.get(conversation_id)
    if not conversation or conversation["user_id"] != user["id"]:
        raise HTTPException(404, "Conversation not found.")
    CONVERSATIONS.pop(conversation_id, None)
    MESSAGES.pop(conversation_id, None)
    return {"deleted": True}