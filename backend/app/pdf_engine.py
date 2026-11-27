from __future__ import annotations

import io
import logging
import re
from typing import Any

import pandas as pd
import pymupdf  # PyMuPDF
import pdfplumber

logger = logging.getLogger(__name__)

# Check optional pytesseract OCR capability
try:
    import pytesseract
    from PIL import Image
    HAS_OCR = True
except Exception:
    HAS_OCR = False


def check_pdf_encrypted(content: bytes) -> bool:
    """Returns True if the PDF is password-protected or encrypted."""
    try:
        doc = pymupdf.open(stream=content, filetype="pdf")
        is_enc = doc.is_encrypted
        doc.close()
        return is_enc
    except Exception as exc:
        raise ValueError("Could not parse PDF file structure.") from exc


def normalize_extracted_table(raw_rows: list[list[Any]]) -> pd.DataFrame | None:
    """Normalizes raw extracted 2D table data into a clean pandas DataFrame."""
    if not raw_rows or len(raw_rows) < 2:
        return None

    # Clean rows: strip strings, replace empty with None
    cleaned_rows = []
    for r in raw_rows:
        row_cells = [str(c).strip() if c is not None and str(c).strip() != "" else None for c in r]
        # Skip completely empty rows
        if any(c is not None for c in row_cells):
            cleaned_rows.append(row_cells)

    if len(cleaned_rows) < 2:
        return None

    # First non-empty row as header
    header_raw = cleaned_rows[0]
    data_rows = cleaned_rows[1:]

    # Remove completely empty columns across all rows
    num_cols = len(header_raw)
    valid_cols = []
    for col_idx in range(num_cols):
        has_val = (
            (col_idx < len(header_raw) and header_raw[col_idx] is not None)
            or any(col_idx < len(r) and r[col_idx] is not None for r in data_rows)
        )
        if has_val:
            valid_cols.append(col_idx)

    if not valid_cols:
        return None

    # Format header names and eliminate duplicates
    headers = []
    seen: dict[str, int] = {}
    for idx in valid_cols:
        name = header_raw[idx] if idx < len(header_raw) and header_raw[idx] else f"Column_{idx + 1}"
        name = re.sub(r"\s+", " ", str(name)).strip()
        count = seen.get(name, 0)
        seen[name] = count + 1
        headers.append(name if count == 0 else f"{name}.{count}")

    # Build clean record rows
    clean_records = []
    for r in data_rows:
        row_vals = []
        for idx in valid_cols:
            val = r[idx] if idx < len(r) else None
            row_vals.append(val)
        if any(v is not None for v in row_vals):
            clean_records.append(row_vals)

    if not clean_records:
        return None

    df = pd.DataFrame(clean_records, columns=headers)

    # Clean column types: attempt numeric conversion where applicable
    for col in df.columns:
        # Check if values look numeric (e.g. "1,234.50" or "45%")
        cleaned_series = (
            df[col]
            .astype(str)
            .str.replace(r"[$,]", "", regex=True)
            .str.strip()
        )
        # Attempt numeric conversion
        numeric_conv = pd.to_numeric(cleaned_series, errors="coerce")
        if numeric_conv.notna().mean() >= 0.7:  # At least 70% valid numbers
            df[col] = numeric_conv

    return df


def extract_pdf_document(
    content: bytes, max_pages: int = 50
) -> dict[str, Any]:
    """Inspects, classifies, and extracts tables, text, and metadata from a PDF file."""
    if b"%PDF-" not in content[:1024]:
        raise ValueError("Invalid PDF signature. File is not a valid PDF document.")

    if check_pdf_encrypted(content):
        raise ValueError("Password-protected or encrypted PDF documents are not supported.")

    # 1. PyMuPDF analysis: text & structure
    doc = pymupdf.open(stream=content, filetype="pdf")
    total_pages = len(doc)
    pages_to_process = min(total_pages, max_pages)

    pages_text: list[dict[str, Any]] = []
    full_text_parts: list[str] = []
    has_scanned_pages = False
    total_images_count = 0

    for p_num in range(pages_to_process):
        page = doc[p_num]
        p_text = page.get_text("text").strip()
        img_list = page.get_images()
        total_images_count += len(img_list)

        # Check if page is potentially scanned (low text + contains images)
        is_scanned = len(p_text) < 40 and len(img_list) > 0
        if is_scanned:
            has_scanned_pages = True

        # Optional OCR fallback if page has almost no text
        if is_scanned and HAS_OCR:
            try:
                pix = page.get_pixmap(dpi=150)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                ocr_text = pytesseract.image_to_string(img)
                if ocr_text.strip():
                    p_text = f"[OCR Extracted]\n{ocr_text.strip()}"
            except Exception as ocr_err:
                logger.debug("OCR attempt on page %d skipped: %s", p_num + 1, ocr_err)

        if p_text:
            pages_text.append({"page": p_num + 1, "text": p_text})
            full_text_parts.append(f"--- Page {p_num + 1} ---\n{p_text}")

    full_document_text = "\n\n".join(full_text_parts)
    word_count = len(full_document_text.split())

    # Document metadata
    meta = doc.metadata or {}
    metadata_info = {
        "title": meta.get("title") or "Untitled Document",
        "author": meta.get("author") or "Unknown",
        "subject": meta.get("subject") or "",
        "creator": meta.get("creator") or "",
        "producer": meta.get("producer") or "",
        "total_pages": total_pages,
        "processed_pages": pages_to_process,
        "word_count": word_count,
        "has_scanned_pages": has_scanned_pages,
        "total_images": total_images_count,
    }
    doc.close()

    # 2. pdfplumber analysis: high-fidelity table extraction
    extracted_tables: list[dict[str, Any]] = []
    table_dfs: list[pd.DataFrame] = []

    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for p_idx, page in enumerate(pdf.pages[:pages_to_process]):
                tables = page.extract_tables()
                for t_idx, raw_table in enumerate(tables):
                    df = normalize_extracted_table(raw_table)
                    if df is not None and len(df) >= 2 and len(df.columns) >= 2:
                        t_id = f"table_p{p_idx + 1}_{t_idx + 1}"
                        t_name = f"Page {p_idx + 1} — Table {t_idx + 1} ({len(df)} rows, {len(df.columns)} cols)"
                        extracted_tables.append({
                            "id": t_id,
                            "name": t_name,
                            "page": p_idx + 1,
                            "row_count": len(df),
                            "column_count": len(df.columns),
                            "columns": list(map(str, df.columns)),
                            "preview": df.head(5).to_dict(orient="records"),
                        })
                        table_dfs.append(df)
    except Exception as exc:
        logger.warning("pdfplumber table extraction encountered an issue: %s", exc)

    # 3. Document classification
    if extracted_tables and word_count < 100:
        doc_type = "structured_tables"
    elif extracted_tables and word_count >= 100:
        doc_type = "mixed_content"
    elif not extracted_tables and has_scanned_pages:
        doc_type = "scanned_document"
    else:
        doc_type = "text_document"

    # Default DataFrame: primary extracted table if present
    primary_df = table_dfs[0] if table_dfs else None

    # Check if multiple extracted tables have identical columns to offer combined table
    can_combine = False
    if len(table_dfs) > 1:
        first_cols = list(table_dfs[0].columns)
        can_combine = all(list(t.columns) == first_cols for t in table_dfs[1:])

    return {
        "doc_type": doc_type,
        "metadata": metadata_info,
        "document_text": full_document_text,
        "pages_text": pages_text,
        "tables": extracted_tables,
        "can_combine_tables": can_combine,
        "table_dfs": table_dfs,
        "primary_df": primary_df,
    }
