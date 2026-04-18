# Full-Text Search by MongoDB — Complete Project Explanation

This document explains **every file**, **every module**, and **every operation** in this project so you know exactly how everything works.

---

## 1. Project Overview

**What it does:** A web app that lets users type a search query and see results from **two MongoDB collections** (Products and Articles) in one place, sorted by relevance. Search is powered by **MongoDB full-text search** (text indexes + `$text`).

**Architecture:**
- **Backend:** Node.js + Express API that talks to MongoDB.
- **Frontend:** React (Vite) SPA that calls the API and shows results with highlighted matches.
- **Database:** MongoDB with two collections: `products`, `articles`. Each has a **text index** so `$text` search works.

**High-level flow:**
1. User types in the search box → frontend debounces and calls `GET /api/global-search?q=...`
2. Backend runs two parallel full-text queries (Products + Articles), merges and sorts by score
3. Frontend receives JSON, normalizes it, and renders result cards with highlighted query terms

---

## 2. Project Structure (Source Files Only)

```
FULL-TEXT_SEARCH_BY_MONGODB/
├── backend/
│   ├── .env                 # MONGO_URI, PORT (not committed)
│   ├── package.json         # Backend deps & scripts
│   ├── server.js            # Express app + MongoDB connect + mount routes
│   ├── routes/
│   │   └── searchRoutes.js  # GET /api/global-search → controller
│   ├── controllers/
│   │   └── searchController.js  # globalSearch: query both collections, merge, sort
│   ├── models/
│   │   ├── Product.js       # Product schema + text index (name, description, category)
│   │   └── Article.js       # Article schema + text index (title, content, author)
│   └── seed.js              # Clears DB, syncs indexes, inserts sample products & articles
├── frontend/
│   ├── package.json
│   ├── index.html           # Single HTML, mounts React at #root
│   ├── vite.config.js       # Vite + React plugin
│   └── src/
│       ├── main.jsx         # React root: StrictMode + App
│       ├── index.css        # Global styles (variables, layout, cards, animations)
│       ├── App.css          # Empty (overrides if needed)
│       └── App.jsx          # Search UI, debounced fetch, results, HighlightedText
└── PROJECT_EXPLAINED.md    # This file
```

---

## 3. Backend — File by File

### 3.1 `backend/server.js`

**Role:** Entry point. Creates Express app, loads env, mounts middleware and routes, connects to MongoDB, then starts the HTTP server.

**Line by line:**

| Lines | What it does |
|-------|----------------|
| 1–4 | Imports: `express`, `mongoose`, `cors`, and loads `dotenv` so `process.env.MONGO_URI` / `PORT` are set. |
| 6 | Imports the router from `./routes/searchRoutes` (all API routes under `/api`). |
| 8 | Creates Express app. |
| 11 | `cors()` — allows browser requests from any origin (e.g. frontend on another port). |
| 12 | `express.json()` — parses request body as JSON (not used by current GET search, but standard). |
| 15 | Mounts `searchRoutes` at `/api` → so routes in searchRoutes are at `/api/global-search`, etc. |
| 18–20 | GET `/` returns a small JSON health message. |
| 23–35 | Connects to MongoDB using `process.env.MONGO_URI`. On success: reads `PORT` (default 5000), starts `app.listen(PORT)`. On failure: logs error and `process.exit(1)`. |

**Important:** The server only listens **after** MongoDB connects. If `MONGO_URI` is wrong or DB is down, the app exits.

---

### 3.2 `backend/routes/searchRoutes.js`

**Role:** Defines the single API route for search and wires it to the controller.

| Lines | What it does |
|-------|----------------|
| 1–2 | Express router. |
| 4 | Imports `globalSearch` from `../controllers/searchController`. |
| 7 | Registers **GET** `/global-search` → handler is `globalSearch`. Because server mounts this at `/api`, full path is **GET /api/global-search**. |
| 9 | Exports the router so `server.js` can `app.use("/api", searchRoutes)`. |

**Query:** The controller expects the search term in the query string: `?q=something`. So the full URL is `GET /api/global-search?q=...`.

---

### 3.3 `backend/controllers/searchController.js`

**Role:** Implements `globalSearch`: validate `q`, run full-text search on Products and Articles, merge results, sort by score, return JSON.

**Imports (1–2):** `Product` and `Article` models (needed for `find()` and `$text`).

**Function: `globalSearch(req, res)`**

| Step | Code / Logic | Explanation |
|------|----------------|-------------|
| 1. Get query | `req.query.q` | Search term from URL, e.g. `?q=laptop`. |
| 2. Validate | If missing or only whitespace → `400` JSON with message. | Ensures we never call `$text` with an empty string. |
| 3. Search Products | `Product.find({ $text: { $search: searchTerm } }, { score: { $meta: "textScore" }, name: 1, description: 1, category: 1, price: 1 }).sort({ score: { $meta: "textScore" } })` | Uses MongoDB **full-text search**: only documents that match the text index (name, description, category) are returned. `$meta: "textScore"` adds a relevance score; projection limits fields; sort orders by that score. |
| 4. Search Articles | Same pattern with `Article.find(...)` and fields: title, content, author, tags. | Same idea on the Articles collection (text index on title, content, author). |
| 5. Combine | Spread products (mapped to `{ type: "product", id, name, description, category, price, score }`) and articles (mapped to `{ type: "article", id, title, content, author, tags, score }`) into one `results` array. Uses `p.score ?? 0` so missing score doesn’t break sort. | Single list with a `type` so the frontend can show “product” vs “article”. |
| 6. Sort merged | `results.sort((a, b) => b.score - a.score)` | Highest relevance first across both collections. |
| 7. No results | If `results.length === 0` → 200 JSON with `count: 0`, message, `results: []`. | Still success; “no results” is not a server error. |
| 8. Success | 200 JSON with `success`, `count`, `query`, `results`. | |
| 9. Catch | Any thrown error → log, then 500 JSON with message and `error.message`. | Covers DB errors, missing index, etc. |

**MongoDB here:**  
- `$text: { $search: searchTerm }` requires a **text index** on the collection.  
- The index is defined in the **models** (see below).  
- `score: { $meta: "textScore" }` is the relevance score computed by MongoDB for that document.

---

### 3.4 `backend/models/Product.js`

**Role:** Define the Product schema and the **text index** used for full-text search.

**Schema:**
- `name` (String, required)
- `description` (String, required)
- `category` (String)
- `price` (Number)
- `timestamps: true` → adds `createdAt`, `updatedAt`

**Index:**
```js
productSchema.index({ name: "text", description: "text", category: "text" });
```
- Tells MongoDB to build one **text index** over `name`, `description`, and `category`.
- Enables `$text: { $search: ... }` on this collection. Without this, the search would throw.

**Export:** `mongoose.model("Product", productSchema)` → collection name is `products` (lowercase, pluralized by Mongoose).

---

### 3.5 `backend/models/Article.js`

**Role:** Same idea as Product, for articles.

**Schema:**
- `title` (String, required)
- `content` (String, required)
- `author` (String)
- `tags` ([String])
- `timestamps: true`

**Index:**
```js
articleSchema.index({ title: "text", content: "text", author: "text" });
```
- Text index on `title`, `content`, `author` so `$text` search works on Articles.

**Export:** Model name `"Article"` → collection `articles`.

---

### 3.6 `backend/seed.js`

**Role:** One-off script to reset the database and fill it with sample products and articles so you can try search.

**Config:** Uses `process.env.MONGO_URI` or falls back to `mongodb://127.0.0.1:27017/globalsearch`.

**Flow:**
1. Connect to MongoDB.
2. `Product.deleteMany({})` and `Article.deleteMany({})` — clear both collections.
3. `Product.syncIndexes()` and `Article.syncIndexes()` — ensure text indexes exist (creates them if missing, e.g. first run).
4. `Product.insertMany(products)` and `Article.insertMany(articles)` — insert the hardcoded arrays.
5. Log success, then `await mongoose.disconnect()`.
6. On any error: log, disconnect, `process.exit(1)`.

**When to run:** After cloning, or whenever you want a clean dataset. Command: `npm run seed` (from `backend/`).

---

## 4. Frontend — File by File

### 4.1 `frontend/index.html`

- Standard single-page shell.
- `<div id="root">` is where React mounts.
- `<script type="module" src="/src/main.jsx">` loads the app (Vite serves from `src/`).

---

### 4.2 `frontend/src/main.jsx`

- Imports React, `createRoot`, global `index.css`, and `App`.
- Renders `<App />` inside `StrictMode` into `document.getElementById('root')`.

---

### 4.3 `frontend/src/index.css`

**Role:** All visual styling (variables, layout, search box, result cards, empty state, animations).

**Notable:**
- **CSS variables** (e.g. `--bg-dark`, `--accent-blue`, `--card-bg`) for theme.
- **.background-effects** and **.glow** — fixed blurred circles for background.
- **.search-box** — rounded bar, focus state, search icon.
- **.result-card** — card layout, type tag (product vs article), score badge, hover.
- **.match-highlight** — yellow highlight for query terms in title/description.
- **.empty-state** — no results / error / loading messages.
- **Animations:** `fadeIn`, `slideUp`, `drift`, `spin` for loader and cards.
- **Responsive** rules for smaller screens.

`App.css` is empty; all styles are in `index.css`.

---

### 4.4 `frontend/src/App.jsx`

**Role:** The only page: search input, debounced API call, results list, and term highlighting.

#### Component: `HighlightedText({ text, query })`

- **Purpose:** Split `text` by the search terms and wrap matches in `<span className="match-highlight">`.
- **Steps:**
  1. If no `text` or no `query`, return plain text or empty.
  2. Split `query` into terms (trim, split on whitespace, drop empty), sort by length descending (longer terms first).
  3. Escape special regex characters in each term → `safeTerms`.
  4. Build regex from `safeTerms` and **split** `text` into parts (alternating non-match and match).
  5. For each part, decide if it’s a match using a **non-global** regex per term (`isMatch(part)`) so we don’t rely on stateful `regex.test()` in a loop.
  6. Render parts: match parts get `match-highlight` class, others plain.

#### Component: `App()`

**State:**
- `query` — current input.
- `results` — normalized list for rendering.
- `isLoading` — true while fetch in progress.
- `hasSearched` — true after first search (drives “Found X results” and empty states).
- `error` — true if fetch failed.
- `searchInputRef` — ref to the input (for focus).

**Effects:**
1. **Focus (useEffect with `[]`):** On mount, focus the search input.
2. **Debounced search (useEffect with `[query]`):**
   - If `query.trim()` is empty: clear results, set `hasSearched` false, loading false, return.
   - Otherwise: set loading and hasSearched, then after **400 ms** (`setTimeout`) call `performSearch()`.
   - Cleanup: `clearTimeout(timer)` so rapid typing cancels previous timer (debounce).

**performSearch():**
- GET `http://localhost:8080/api/global-search?q=${encodeURIComponent(query)}`.
- If not `response.ok`, throw so catch runs.
- Parse JSON; take `data.results` (default `[]`).
- **Normalize** each item to a single shape for the UI:
  - `title` = `item.name || item.title || 'Untitled'`
  - `description` = `item.description || item.content || ''`
  - `displayScore` = `item.score` rounded to two decimals (or `'0.00'`).
- `setResults(normalized)`; on error set `error` and clear results; in `finally` set `isLoading` false.

**Handlers:**
- `handleClear`: set `query` to `''` and focus the input.

**JSX structure:**
- Background glows (decoration).
- **Header:** title “Discover Anything”, subtitle, **search box** (icon, controlled input, loader when loading, clear button when there’s text).
- **Results section** (`aria-live="polite"` for accessibility):
  - If hasSearched and not loading and no error: “Found X results for ‘query’”.
  - List area:
    - Not searched: nothing.
    - Error: message about server.
    - Loading and no results yet: “Searching...”.
    - No results: “No results found for ‘query’”.
    - Otherwise: map `results` to **result cards** (type tag, score badge, title and description with `<HighlightedText>`).

So: **every file and operation** on the frontend is either mounting the app (main.jsx), styling (index.css), or this one screen (App.jsx) with debounced search and highlighting.

---

## 5. End-to-End Data Flow

1. User types e.g. `laptop` in the input.
2. React updates `query` state; the effect runs and sets a 400 ms timer.
3. After 400 ms (and no new change), `performSearch()` runs:  
   `GET http://localhost:8080/api/global-search?q=laptop`
4. Express receives the request; `searchRoutes` sends it to `globalSearch`.
5. Controller reads `req.query.q` → `"laptop"`, validates it.
6. MongoDB is queried:
   - `products` with `$text: { $search: "laptop" }` → docs with text score.
   - `articles` with same `$text` → docs with text score.
7. Controller maps both to a common shape (type, id, fields, score), merges, sorts by `score` descending.
8. Response: `{ success: true, count: N, query: "laptop", results: [...] }`.
9. Frontend normalizes to `title`/`description`/`displayScore`, sets `results` and clears loading/error.
10. React re-renders; result cards show with `HighlightedText` highlighting “laptop” in title and description.

---

## 6. MongoDB Full-Text Search (What Actually Happens)

- A **text index** is created over specified string fields (Product: name, description, category; Article: title, content, author).
- MongoDB tokenizes and stems words in those fields and builds an index.
- When you run `find({ $text: { $search: "laptop screen" } })`, MongoDB:
  - Tokenizes the search string (e.g. “laptop”, “screen”).
  - Finds documents that contain any of those terms in the indexed fields.
  - Assigns a **textScore** (relevance) to each document.
- `score: { $meta: "textScore" }` in the projection adds that score to each document so we can sort and send it to the frontend.

So “each and every” search operation is: two `find()` calls using `$text`, then merge + sort by score in the controller.

---

## 7. How to Run

**Backend:**
- Create `backend/.env` with `MONGO_URI` (and optionally `PORT=8080`).
- From `backend/`: `npm install`, then `npm run seed` (once), then `npm run dev` or `npm start`.

**Frontend:**
- From `frontend/`: `npm install`, then `npm run dev`. Open the URL Vite prints (e.g. http://localhost:5173).

Ensure the backend port (e.g. 8080) matches the URL in `App.jsx` (`http://localhost:8080`). If you use a different PORT in `.env`, either change the frontend URL or set `PORT=8080` in `.env`.

---

## 8. Summary Table

| File | Responsibility |
|------|----------------|
| **server.js** | Express app, CORS, JSON, mount `/api` routes, connect MongoDB, listen. |
| **searchRoutes.js** | GET `/api/global-search` → `globalSearch`. |
| **searchController.js** | Validate `q`, Product.find($text) + Article.find($text), merge, sort by score, return JSON. |
| **Product.js** | Product schema + text index (name, description, category). |
| **Article.js** | Article schema + text index (title, content, author). |
| **seed.js** | Clear DB, sync indexes, insert sample data. |
| **main.jsx** | Mount React app with StrictMode. |
| **index.css** | All styling. |
| **App.jsx** | Search UI, debounced fetch to `/api/global-search`, normalize results, HighlightedText, result cards and empty/error states. |

That’s the full picture of how every file and operation works in this project.
