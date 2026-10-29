# 📘 DataLume AI — Project Tech Guide
> *Every technology used in this project, explained in simple language.*

---

## 🗂️ Table of Contents

1. [What is DataLume AI?](#1-what-is-datalume-ai)
2. [Big Picture — How the App is Structured](#2-big-picture--how-the-app-is-structured)
3. [Frontend Technologies](#3-frontend-technologies)
4. [Backend Technologies](#4-backend-technologies)
5. [Database & Authentication](#5-database--authentication)
6. [Developer Tools](#6-developer-tools)
7. [How Everything Talks to Each Other](#7-how-everything-talks-to-each-other)
8. [File & Folder Structure Explained](#8-file--folder-structure-explained)
9. [Quick Reference Table](#9-quick-reference-table)

---

## 1. What is DataLume AI?

**DataLume AI** is a data analytics web application. Think of it like a mini Google Sheets + analytics dashboard.

Here's what a user can do:
- 📤 **Upload** a CSV or Excel file
- 📊 **See charts and statistics** about their data automatically
- 🔍 **Filter and explore** rows and columns
- 💬 **Ask Lumi (AI assistant)** questions about the data in plain English
- 💾 **Save dashboards** for later use

The app has **two parts** running at the same time:
- A **frontend** (what you see in the browser)
- A **backend** (the engine behind the scenes that crunches data)

---

## 2. Big Picture — How the App is Structured

```
┌─────────────────────────────────────────┐
│            YOUR BROWSER                 │
│                                         │
│   React + Vite (Frontend)               │
│   → Shows UI, charts, tables            │
│   → Runs at: http://localhost:5173      │
└──────────────────┬──────────────────────┘
                   │  Sends API requests (HTTP)
                   ▼
┌─────────────────────────────────────────┐
│         BACKEND SERVER                  │
│                                         │
│   FastAPI + Python (Backend)            │
│   → Reads/processes uploaded files      │
│   → Does math with Pandas               │
│   → Runs at: http://localhost:8000      │
└──────────────────┬──────────────────────┘
                   │  Stores & retrieves data
                   ▼
┌─────────────────────────────────────────┐
│         SUPABASE (Cloud)                │
│                                         │
│   → Stores user accounts (Auth)         │
│   → Stores uploaded files (Storage)     │
│   → Stores dashboard configs (Database) │
└─────────────────────────────────────────┘
```

---

## 3. Frontend Technologies

> The frontend is everything the user **sees and interacts with** in the browser.

---

### ⚛️ React (v19)

**What it is:** A JavaScript library for building user interfaces.

**Simple explanation:**
Instead of writing raw HTML that never updates, React lets you build *components* — reusable building blocks like a `<Sidebar />`, `<DataTable />`, or `<ChartPanel />`. When your data changes, React automatically updates only the parts of the page that need to change — no full page reload needed.

**Why it's used here:**
- The dashboard has many panels (charts, filters, table, chat) that update as the user interacts
- Components like `Topbar`, `Sidebar`, `FilterBar`, `ChatPanel` are reused across pages
- React's `useState` and `useEffect` hooks manage things like "is the user logged in?" or "what dataset is selected?"

**Real example in this project:**
```
src/components/Sidebar.tsx     ← Left navigation panel
src/components/ChartPanel.tsx  ← Displays bar/area/donut charts
src/components/ChatPanel.tsx   ← Lumi AI chat window
src/components/DataTable.tsx   ← Shows data rows and columns
```

---

### ⚡ Vite (v8)

**What it is:** A super-fast tool that runs and builds your React app.

**Simple explanation:**
Think of Vite as the "engine room" for the frontend. When you type `npm run dev`, Vite:
1. Starts a local web server at `http://localhost:5173`
2. Shows your React app in the browser instantly
3. Auto-refreshes the browser the moment you save any file (called **Hot Module Replacement**)

**Why it's used here instead of older tools (like Create React App):**
- Vite is 10–100x faster to start up
- It supports TypeScript out of the box
- Perfect for modern React projects

---

### 🟦 TypeScript

**What it is:** JavaScript with **type safety** added on top.

**Simple explanation:**
In normal JavaScript, you can accidentally pass a number where a name (string) is expected, and the error only shows up when the app is running. TypeScript catches these mistakes **while you're writing code**, before anything breaks.

**Why it's used here:**
- The project has complex data shapes — like dataset objects with many fields. TypeScript ensures you always access the right property.
- It makes the code self-documenting. Other developers (or your future self) immediately see what data each function expects.

**Example:**
```typescript
// TypeScript knows this function needs a string, not a number
function greetUser(name: string) {
  return `Hello, ${name}!`
}
```

---

### 🎨 Framer Motion (v12)

**What it is:** An animation library for React.

**Simple explanation:**
This is what makes things in the app smoothly slide in, fade in, or bounce — instead of appearing/disappearing instantly. It turns a plain interface into a polished, premium-feeling experience.

**Why it's used here:**
- Page transitions feel smooth
- Panels animate in when datasets load
- Modals and drawers slide in elegantly

---

### 📐 Recharts (v2)

**What it is:** A charting library built specifically for React.

**Simple explanation:**
Recharts turns raw numbers into beautiful charts — bar charts, area charts, pie/donut charts — using simple React components.

**Why it's used here:**
- The app shows `BarChart`, `AreaChart`, and `PieChart` for dataset analysis
- Recharts is easy to customize and works natively with React's data model

**Charts used in this project:**

| Chart Type | Where Used |
|---|---|
| Bar Chart | Categorical column analysis |
| Area Chart | Trend visualization |
| Donut / Pie Chart | Distribution breakdowns |
| Scatter Plot | Numeric correlation panels |

---

### 🖱️ React Dropzone (v14)

**What it is:** A library that adds drag-and-drop file upload support.

**Simple explanation:**
Instead of clicking "Browse Files" every time, users can simply drag a CSV or Excel file from their desktop and drop it onto the upload area. React Dropzone handles all the behind-the-scenes logic for this.

**Why it's used here:**
- Makes file uploading feel intuitive and modern
- Validates file type (only CSV/XLS/XLSX allowed) before sending to the server

---

### 🔷 Lucide React (v0.468)

**What it is:** A library of clean, minimal icons.

**Simple explanation:**
Every icon you see in the app — the upload icon, search icon, chart icon, settings gear — comes from Lucide React. It's a huge set of SVG icons packaged as React components.

**Why it's used here:**
- Consistent, professional-looking icons throughout the UI
- Easy to use: just `<UploadIcon size={20} />` and you're done

---

### 🎨 Vanilla CSS (Custom Design Tokens)

**What it is:** The project uses hand-crafted CSS with design tokens (CSS variables).

**Simple explanation:**
Instead of scattered random colors and font sizes everywhere, the project defines them once in `src/css/tokens.css`:
```css
--color-primary: #6366f1;  /* One place to change the brand color */
--spacing-md: 1rem;
```
Then every component uses these variables. Change one value → the whole app updates.

**Files:**
- `src/css/tokens.css` — Design system variables (colors, spacing, fonts)
- `src/css/charts.css` — Chart-specific styles

---

## 4. Backend Technologies

> The backend is the **server** that runs Python code, processes files, and serves data to the frontend.

---

### 🐍 Python (3.11+)

**What it is:** The programming language used for the backend.

**Why it's used here:**
Python is the gold standard for data science and analytics. Libraries like Pandas and NumPy make it effortless to analyze tabular data (CSV, Excel files). No other language has this ecosystem.

---

### 🚀 FastAPI (v0.115)

**What it is:** A modern Python web framework for building APIs.

**Simple explanation:**
FastAPI is like a waiter in a restaurant. The frontend (customer) places an order (sends a request), FastAPI handles that request, fetches the right data from the kitchen (Pandas, database), and serves back the result.

**Why FastAPI specifically (vs Django or Flask):**
- **Super fast** — one of the fastest Python frameworks ever built
- **Automatic API docs** — visit `http://localhost:8000/docs` to test every endpoint interactively
- **Async support** — handles many requests at the same time without slowing down
- **Built-in data validation** with Pydantic — if the frontend sends wrong data, FastAPI rejects it with a clear error

**API endpoints this project exposes:**

| Endpoint | What it does |
|---|---|
| `POST /api/datasets/upload` | Accept a CSV/Excel file |
| `GET /api/datasets` | List all uploaded datasets |
| `GET /api/datasets/{id}/statistics` | Get column stats (mean, median, etc.) |
| `GET /api/datasets/{id}/kpis` | Get high-level KPI numbers |
| `POST /api/datasets/{id}/charts` | Generate chart data |
| `POST /api/datasets/{id}/chat` | Ask Lumi a question |
| `POST /api/datasets/{id}/export` | Export filtered data as CSV |
| `DELETE /api/datasets/{id}` | Delete a dataset |
| `GET /api/health` | Simple health check |

---

### 🦄 Uvicorn

**What it is:** The server that *runs* FastAPI.

**Simple explanation:**
FastAPI is the code you write; Uvicorn is what actually launches it and listens for incoming web requests. Think of FastAPI as the restaurant, and Uvicorn as the building it sits in.

**Why it's used:**
- It's the recommended, high-performance server for FastAPI
- `--reload` flag means it auto-restarts whenever you save a Python file (great for development)

---

### 🐼 Pandas (v2.2)

**What it is:** The most popular Python library for working with tabular data.

**Simple explanation:**
When you upload a CSV file, Pandas loads it into a **DataFrame** — think of it as a spreadsheet in memory. Then you can:
- Calculate averages, sums, min, max of any column
- Find missing/null values
- Filter rows based on conditions
- Group data by categories

**Why it's essential here:**
The entire analytics engine of DataLume is powered by Pandas. Every statistic, KPI, and chart data point is calculated by Pandas reading your uploaded file.

---

### 🔢 NumPy (v2.0)

**What it is:** A Python library for fast mathematical operations.

**Simple explanation:**
Pandas uses NumPy under the hood to do math really fast. When calculating the mean of 500,000 rows, NumPy handles those operations at near-machine speed.

**Why it's used here:**
- Works alongside Pandas for numerical calculations
- Handles arrays of numbers very efficiently

---

### 📊 OpenPyXL & xlrd

**What they are:** Python libraries for reading Excel files.

**Simple explanation:**
- `openpyxl` reads modern `.xlsx` files (Excel 2007+)
- `xlrd` reads older `.xls` files (Excel 97–2003)

**Why they're used here:**
DataLume supports Excel uploads, not just CSV. These libraries let Pandas open Excel files just like it opens CSV files.

---

### ✅ Pydantic Settings (v2.4)

**What it is:** A library to manage configuration and settings.

**Simple explanation:**
The backend needs to know things like: What is the Supabase URL? What is the allowed frontend origin? Instead of hardcoding these, Pydantic Settings reads them from a `.env` file automatically and validates that required values are present.

---

### 🌐 python-multipart & httpx

**What they are:** Helper libraries for handling requests.

- **python-multipart** — Lets FastAPI receive file uploads (the actual bytes of a CSV/Excel file sent from the browser)
- **httpx** — An HTTP client used by the backend to make requests to Supabase APIs

---

## 5. Database & Authentication

---

### 🟩 Supabase

**What it is:** An open-source Firebase alternative — a cloud platform that provides database, authentication, and file storage all in one.

**Simple explanation:**
Supabase gives this project three things in one:

#### 🔐 Auth (Authentication)
Handles user sign-up, login, and password reset via email. Users get a **JWT (JSON Web Token)** after login — a secure digital pass they include in every API request to prove who they are.

#### 🗄️ PostgreSQL Database
A real database that stores:
- User profiles
- Dataset metadata (name, size, upload date)
- Saved dashboard configurations
- Chat conversation history

**Row Level Security (RLS):** Supabase enforces that users can only see *their own* data — even at the database level. User A can never accidentally see User B's datasets.

#### 🗂️ Storage (Private File Storage)
Uploaded CSV/Excel files are stored securely in Supabase's private storage buckets. Files are scoped per user — only the owner can access them.

#### Why Supabase instead of building auth/db from scratch?
- Building secure authentication from scratch takes weeks
- Supabase provides it instantly, with production-grade security
- The `@supabase/supabase-js` JavaScript library makes it easy to call from React

---

## 6. Developer Tools

---

### 🧪 Vitest + Testing Library

**What they are:** Tools for writing and running automated tests.

**Simple explanation:**
Tests are small pieces of code that check if your application works correctly — automatically. Instead of manually clicking through the app every time you make a change, tests do it for you instantly.

- **Vitest** — Runs the tests (works natively with Vite, so tests run very fast)
- **@testing-library/react** — Simulates a user clicking buttons, typing, and seeing results
- **jsdom** — Fakes a browser environment so tests can run without opening a real browser

**Test files in this project:**
```
src/components/ChartPanel.test.tsx
src/components/ChatPanel.test.tsx
src/components/DataTable.test.tsx
src/pages/OverviewPage.test.tsx
src/pages/SavedReportsPage.test.tsx
```

---

### 🐍 Pytest (v8)

**What it is:** Python's standard testing framework for the backend.

**Simple explanation:**
Just like Vitest tests the frontend, Pytest tests the backend Python code. It checks that the API endpoints work, files are parsed correctly, statistics are calculated accurately, etc.

---

### 🔍 OxLint

**What it is:** An extremely fast code linter for JavaScript/TypeScript.

**Simple explanation:**
A linter reads your code and warns you about mistakes, bad patterns, or style inconsistencies — *before* you run the code. OxLint is written in Rust, making it 50–100x faster than older linters like ESLint.

**Why it matters:**
Catches bugs like unused variables, missing dependencies in React hooks, or calling functions incorrectly — before they ever cause a runtime error.

---

### 🔧 TypeScript Config Files

| File | Purpose |
|---|---|
| `tsconfig.json` | Root TypeScript config |
| `tsconfig.app.json` | Config for the React app source code |
| `tsconfig.node.json` | Config for build tools (Vite config itself) |

---

## 7. How Everything Talks to Each Other

Here is the step-by-step flow when a user uploads a file:

```
1. USER drags a CSV file onto the Upload page
         ↓
2. REACT (frontend) picks it up via React Dropzone
         ↓
3. REACT sends the file to the BACKEND via HTTP POST to /api/datasets/upload
   (includes the user's Supabase JWT token for authentication)
         ↓
4. FASTAPI (backend) receives the file
   → Validates file size (max 25 MB), extension, and MIME type
   → Reads the file into a PANDAS DataFrame
   → Profiles the data (column types, row count, missing values)
   → Uploads the raw file to SUPABASE STORAGE
   → Saves metadata (filename, size, columns) to SUPABASE DATABASE
         ↓
5. FASTAPI returns dataset metadata to the frontend
         ↓
6. REACT displays the dataset in the sidebar
   → User clicks → Overview Page loads statistics
   → REACT requests /api/datasets/{id}/statistics
   → FASTAPI runs Pandas calculations and returns results
   → RECHARTS renders bar/area/donut charts from the data
```

---

## 8. File & Folder Structure Explained

```
datalume ai/
│
├── 📁 src/                        ← All React (frontend) code
│   ├── 📁 components/             ← Reusable UI building blocks
│   │   ├── Sidebar.tsx            ← Left nav with dataset list
│   │   ├── Topbar.tsx             ← Top bar with user info
│   │   ├── ChartPanel.tsx         ← Chart display wrapper
│   │   ├── ChartGraphic.tsx       ← Actual Recharts rendering
│   │   ├── ChatPanel.tsx          ← Lumi AI chat interface
│   │   ├── DataTable.tsx          ← Paginated data explorer table
│   │   ├── FilterBar.tsx          ← Column filter controls
│   │   ├── RowDetailDrawer.tsx    ← Slide-out row detail view
│   │   └── ErrorBoundary.tsx      ← Catches React crashes gracefully
│   │
│   ├── 📁 pages/                  ← Full page views
│   │   ├── OverviewPage.tsx       ← Stats + KPIs + charts dashboard
│   │   ├── VisualizationPage.tsx  ← Advanced chart builder
│   │   ├── ExplorerPage.tsx       ← Data table explorer
│   │   ├── UploadPage.tsx         ← File upload interface
│   │   ├── SavedReportsPage.tsx   ← Saved dashboard configs
│   │   └── SettingsPage.tsx       ← User profile settings
│   │
│   ├── 📁 hooks/                  ← Custom React logic hooks
│   │   └── useAuth.ts             ← Authentication state management
│   │
│   ├── 📁 css/                    ← Stylesheets
│   │   ├── tokens.css             ← Design system variables
│   │   └── charts.css             ← Chart-specific styles
│   │
│   ├── 📁 lib/                    ← Shared utility functions
│   ├── App.tsx                    ← Root app + routing logic
│   └── main.tsx                   ← Entry point (mounts React to HTML)
│
├── 📁 backend/                    ← All Python (backend) code
│   └── 📁 app/
│       ├── main.py                ← FastAPI app + all API routes
│       └── analytics.py           ← Pandas data processing engine
│
├── 📁 supabase/
│   └── migrations/                ← SQL to set up the database tables
│
├── index.html                     ← The single HTML file Vite serves
├── vite.config.ts                 ← Vite + Vitest configuration
├── package.json                   ← Frontend dependencies list
├── backend/requirements.txt       ← Backend (Python) dependencies list
├── .env.example                   ← Template for environment variables
└── README.md                      ← Project setup instructions
```

---

## 9. Quick Reference Table

| Technology | Type | Purpose | Why This One? |
|---|---|---|---|
| **React 19** | Frontend Framework | Build interactive UI components | Industry standard; component model is perfect for dashboards |
| **Vite 8** | Build Tool | Run & bundle the React app | 10–100x faster than alternatives |
| **TypeScript** | Language | Type-safe JavaScript | Catches bugs at write-time, not run-time |
| **Framer Motion** | Animation Library | Smooth UI animations | Best-in-class React animation library |
| **Recharts** | Chart Library | Bar, area, donut charts | Built for React; highly customizable |
| **React Dropzone** | UI Library | Drag-and-drop file upload | Simple, accessible, reliable |
| **Lucide React** | Icon Library | UI icons throughout the app | Clean, consistent, tree-shakable icons |
| **Vanilla CSS** | Styling | UI look and feel | Full control, zero class-name bloat |
| **FastAPI** | Backend Framework | REST API server | Fastest Python web framework; auto-generates docs |
| **Uvicorn** | ASGI Server | Runs the FastAPI app | Recommended high-performance server for FastAPI |
| **Python 3.11** | Language | Backend logic | Best ecosystem for data processing |
| **Pandas** | Data Library | Read & analyze CSV/Excel data | Industry standard for tabular data |
| **NumPy** | Math Library | Fast numerical calculations | Powers Pandas under the hood |
| **OpenPyXL / xlrd** | File Parsers | Read .xlsx / .xls Excel files | Required by Pandas for Excel support |
| **Pydantic Settings** | Config Library | Manage environment variables | Auto-validates config on startup |
| **Supabase** | BaaS Platform | Auth + Database + File Storage | Full stack in one; built-in row-level security |
| **PostgreSQL** | Database | Store user data & configs | Reliable, relational, RLS-capable |
| **Vitest** | Test Runner | Frontend unit tests | Vite-native; blazing fast |
| **Testing Library** | Test Utility | Simulate user interactions | Best practice React testing approach |
| **Pytest** | Test Runner | Backend unit tests | Standard Python testing tool |
| **OxLint** | Linter | Code quality checking | 50–100x faster than ESLint |

---

## 📝 Summary

DataLume AI is a **full-stack analytics application** that combines:

- A **React + Vite** frontend for a fast, interactive user experience
- A **FastAPI + Python** backend for heavy-duty data processing
- **Supabase** for secure user authentication, database storage, and file storage
- **Pandas** as the analytics engine that turns raw CSV/Excel files into meaningful insights
- **Recharts** to visualize that data as beautiful, interactive charts

Every technology was chosen because it is **the best tool for its specific job** — fast, reliable, widely used, and developer-friendly.

---

*Document generated for DataLume AI v0.0.0 | October 2026*
