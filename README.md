# DataLume AI Analytics 📊⚡

> **Intelligent, Enterprise-Grade AI-Powered Analytics Workspace**  
> Transform raw data into actionable insights, interactive charts, and natural conversational analysis powered by **Google Gemini** & **Supabase Cloud**.

![DataLume AI](https://img.shields.io/badge/DataLume-AI%20Analytics-f97316?style=for-the-badge&logo=databricks&logoColor=white)
![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E)

---

## 🌟 Key Features

### 🚀 1. Automated Data Pipeline
- **Stage 01 — Upload Your Data**: Drag & drop support for `.csv`, `.xlsx`, and `.xls` files.
- **Stage 02 — Automatic Profiling**: Instant dataset structure detection, data types, missing value analysis, distributions, and summary statistics.
- **Stage 03 — Ask Lumi AI**: Context-aware natural conversation with conversational drill-downs and visualizations.

### 🤖 2. Lumi AI Assistant (Powered by Google Gemini)
- **Multilingual Understanding**: Natural conversation in **English**, **Hindi**, and **Hinglish** (*"kitni rows hain"*, *"total revenue batao"*, etc.).
- **Typo & Grammar Tolerance**: Resilient to spelling mistakes and informal questions.
- **Deterministic Number Grounding**: Statistical math (sums, averages, counts, distributions) is computed deterministically with **pandas** to eliminate LLM hallucinations.
- **Zero-Dataset Intelligence**: General chat, data science concepts, and app guidance work even without an active dataset.

### ☁️ 3. Cloud Database & Storage (Supabase Integration)
- **Automatic Dataset Persistence**: Uploaded datasets are automatically backed up to Supabase Cloud Storage (`user-datasets` bucket).
- **Metadata Management**: Complete dataset registry and metadata tracking in Supabase PostgreSQL (`datasets` table).
- **Hybrid In-Memory + Cloud Architecture**: Superfast RAM processing with pandas, backed by persistent cloud storage.

### 📈 4. Interactive Data Visualizations
- Real-time chart generation: **Bar**, **Horizontal Bar**, **Line**, **Area**, **Pie**, **Donut**, **Histogram**, **Scatter**, **Correlation Heatmap**, **Box Plot**, **Radar**, and **Treemap**.
- Aggregations: Sum, Average, Count, Minimum, Maximum, and Median.
- Dynamic filtering, column searching, and paginated data table explorer.

### 🎨 5. Premium Dark Glassmorphism UI
- Enterprise-grade dark design system with charcoal glass cards, subtle neon orange accents, responsive layout, and intuitive sidebar controls with dataset management (including deletion).

---

## 🏗️ Architecture

```
datalume-ai/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── ai.py            # Gemini LLM conversational analyst & grounding
│   │   ├── analytics.py     # Deterministic statistics, KPI calculation & filters
│   │   └── main.py          # REST API endpoints (Chat, Datasets, Visualizations, Supabase)
│   ├── requirements.txt
│   └── .env.example
├── src/                      # React + TypeScript frontend (Vite)
│   ├── components/          # UI components (Pipeline, Sidebar, Charts, Chat, Table)
│   ├── hooks/               # State hooks (useDatasets, useConversations, useTheme)
│   ├── pages/               # OverviewPage, DataExplorer, Visualizations, Reports
│   └── css/                 # Modern CSS tokens & glassmorphism system
├── run-backend.bat           # One-click Windows runner for backend
├── run-frontend.bat          # One-click Windows runner for frontend
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))
- **Supabase Account** (Optional for cloud storage: [Supabase](https://supabase.com/))

### 1. Clone the Repository
```bash
git clone https://github.com/adityayadav211207/datalume-ai.git
cd datalume-ai
```

### 2. Configure Environment Variables
Copy the example files and add your configuration:

```bash
# Frontend .env
cp .env.example .env

# Backend .env
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your credentials:
```env
FRONTEND_ORIGIN=http://localhost:5173
MAX_UPLOAD_MB=25

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite

# Supabase (Optional for Cloud Persistence)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

---

### 3. Running with One-Click Batch Files (Windows) ⚡

- **Double-click `run-backend.bat`** to start FastAPI on `http://127.0.0.1:8000`
- **Double-click `run-frontend.bat`** to start Vite on `http://localhost:5173`

Or run them in PowerShell:
```powershell
.\run-backend.bat
.\run-frontend.bat
```

---

### 4. Running Manually

#### Backend (FastAPI):
```bash
# Create and activate virtual environment
python -m venv .venv

# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies & run
pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```
Docs live at: `http://127.0.0.1:8000/docs`

#### Frontend (React + Vite):
```bash
npm install
npm run dev
```
App live at: `http://localhost:5173`

---

## 🧪 Testing & Verification

```bash
# Typecheck TypeScript
npm run typecheck

# Run unit tests
npm test

# Build for production
npm run build
```

---

## 🛡️ Security Best Practices
- **No API Keys in Frontend**: `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are stored and executed strictly on the backend.
- **Git Protection**: Sensitive `.env` files are included in `.gitignore` by default.

---

## 👨‍💻 Author
- **Aditya Yadav** - [@adityayadav211207](https://github.com/adityayadav211207)

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
