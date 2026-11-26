# DataLume AI Analytics 📊⚡

> **Intelligent, Enterprise-Grade AI-Powered Analytics Workspace**  
> Transform raw data into actionable insights, interactive charts, and natural conversational analysis powered by **Google Gemini**.

![DataLume AI](https://img.shields.io/badge/DataLume-AI%20Analytics-f97316?style=for-the-badge&logo=databricks&logoColor=white)
![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)
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

### 📈 3. Interactive Data Visualizations
- Real-time chart generation: **Bar**, **Horizontal Bar**, **Line**, **Area**, **Pie**, **Donut**, **Histogram**, **Scatter**, **Correlation Heatmap**, **Box Plot**, **Radar**, and **Treemap**.
- Aggregations: Sum, Average, Count, Minimum, Maximum, and Median.
- Dynamic filtering, column searching, and paginated data table explorer.

### 🎨 4. Premium Dark Glassmorphism UI
- Enterprise-grade dark design system with charcoal glass cards, subtle neon orange accents, responsive layout, and intuitive sidebar controls with dataset management.

---

## 🏗️ Architecture

```
datalume-ai/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── ai.py            # Gemini LLM conversational analyst & grounding
│   │   ├── analytics.py     # Deterministic statistics, KPI calculation & filters
│   │   └── main.py          # REST API endpoints (Chat, Datasets, Visualizations)
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

Edit `backend/.env` with your Gemini API key:
```env
FRONTEND_ORIGIN=http://localhost:5173
MAX_UPLOAD_MB=25
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
```

---

### 3. Backend Setup

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run backend server
uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```
Backend will be live at `http://127.0.0.1:8000` (Docs: `http://127.0.0.1:8000/docs`).

---

### 4. Frontend Setup

In a new terminal:
```bash
# Install packages
npm install

# Run frontend development server
npm run dev
```
Frontend will be live at `http://localhost:5173`.

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
- **No API Keys in Frontend**: `GEMINI_API_KEY` is strictly stored and executed on the backend server.
- **Git Protection**: Sensitive `.env` files are included in `.gitignore` by default.

---

## 👨‍💻 Author
- **Aditya Yadav** - [@adityayadav211207](https://github.com/adityayadav211207)

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
