# DataLume AI

**Illuminate Your Data. Discover Your Insights.**

DataLume is a React/Vite analytics workspace backed by FastAPI and Supabase. Users authenticate with Supabase, upload tabular data, explore calculated statistics and charts, filter records, save dashboard configurations, and ask Lumi rule-based questions whose numeric answers are calculated from the active dataset.

## Requirements

- Node.js 20.19+ or 22.12+
- Python 3.11+
- A Supabase project (Auth, Postgres, and private Storage)

## Configure Supabase

1. Create a Supabase project and copy the project URL and publishable/anon key.
2. Copy the root `.env.example` to `.env` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Set `VITE_API_BASE_URL` if the API is not at `http://localhost:8000`.
3. Copy `backend/.env.example` to `backend/.env`. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_JWT_ISSUER` (`https://<project-ref>.supabase.co/auth/v1`), and `FRONTEND_ORIGIN`. A server-only service-role key placeholder is provided for future privileged operations; this implementation passes the user's verified JWT to Storage and PostgREST instead, so the service-role key is not used or needed.
4. In Supabase SQL Editor, run `supabase/migrations/202610210001_initial_schema.sql`. It creates profiles, datasets, saved dashboards, chat conversations/messages, analysis history, RLS policies and the private `user-datasets` bucket.
5. In Supabase Auth settings, enable email/password and email confirmation. Add the frontend local origin and `${frontend origin}/reset-password` to the allowed redirect URLs. Configure SMTP for production email delivery.

Never put a service-role key or AI provider secret in a `VITE_*` variable. There is no LLM provider wired in this first implementation; Lumi uses the deterministic, allowlisted fallback calculations, so no AI key is required.

## Install and run

From the project root, install frontend packages and start Vite:

```powershell
npm install
npm run dev
```

In another terminal, create and activate a Python environment, install backend dependencies, and launch FastAPI:

```powershell
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn app.main:app --app-dir backend --reload --port 8000
```

FastAPI health check: `http://localhost:8000/api/health`. Interactive API documentation: `http://localhost:8000/docs`.

## Test

```powershell
python -m pytest backend\tests -q
npm run build
```

The explicitly synthetic example data is `backend/tests/sample_data.csv` and can be uploaded after signing in.

## Implemented API

- `POST /api/datasets/upload`: validates size, extension, MIME and spreadsheet signatures; profiles the file; writes it to private owner-scoped Supabase Storage and metadata to Postgres.
- `GET /api/datasets`: lists datasets under the user's JWT/RLS policy.
- `GET /api/datasets/{id}/metadata`, `/statistics`, `/kpis`; `POST /analysis`, `/charts`, `/query`, `/export`; `DELETE /api/datasets/{id}`.
- `POST /api/datasets/{id}/chat`: bounded rule-based calculations (summaries, missing values, correlations, grouped high totals), declines unsupported questions.
- `/api/dashboards` and `/api/conversations` provide authenticated, RLS-scoped saved dashboard and chat-history CRUD.

Dataset processing is limited to 25 MB and 500,000 rows. The API keeps parsed DataFrames in process memory and rehydrates them from private Storage on demand. For multi-worker or high-volume production, replace this cache with a durable isolated query engine/job service. Upload progress is reported as a busy state; browser-native upload percentage and background jobs are not implemented yet. XLS requires `xlrd` and XLSX uses OpenPyXL.

## Current scope notes

This runnable initial release includes upload, actual Pandas profiling, filtered data explorer, CSV export, categorical aggregations, a responsive workspace, Supabase email auth, dataset persistence, saved dashboard configurations and persistent Lumi conversations. The currently exposed chart types are bar, area and donut. Data cleaning/undo, image/PDF report exports, date-range/category multi-select UI, full report editing, saved conversation history navigation, rate limiting, and external LLM-provider calls remain follow-up work; they are not represented as completed features in the interface or API.