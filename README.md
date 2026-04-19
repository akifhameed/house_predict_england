# HousePredict AI

A full-stack machine learning application for UK residential property price prediction.  
Built with **React + Vite** (frontend), **FastAPI + LightGBM** (backend), and trained on **4.5 million** HM Land Registry transactions.

Live demo: **https://house-predict-england.vercel.app**  
Backend API docs: **https://housepredict-backend.onrender.com/docs**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS v4, React Router v7 |
| Backend | Python 3.11+, FastAPI, Uvicorn |
| ML Model | LightGBM (3,000 trees, 21 features) |
| Postcode API | postcodes.io (free, no key required) |
| Amenity display | OpenStreetMap Overpass API (dual-server, prefetch cache) |
| IMD data | ONS Indices of Deprivation 2019 |
| Satellite imagery | Esri World Imagery (ArcGIS MapServer, no key required) |
| Authentication | Supabase (email/password + Google OAuth) |
| History storage | Supabase PostgreSQL (`saved_predictions` table, row-level security) |

---

## Project Structure

```
ml-dl/
├── backend/
│   ├── main.py               # FastAPI app — all 8 endpoints
│   ├── test_main.py          # Pytest test suite (52 functions / 58 cases)
│   ├── download_imd.py       # One-time script to build IMD lookup
│   ├── imd_lookup.json       # 32,844 LSOA → IMD rank entries
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── context/
│       │   └── AuthContext.jsx   # Auth state provider (useAuth hook)
│       ├── pages/
│       │   ├── Home.jsx          # Landing page
│       │   ├── Predict.jsx       # Postcode-first prediction form
│       │   ├── Results.jsx       # Results, satellite map, history
│       │   ├── HowItWorks.jsx    # Interactive explainer
│       │   ├── Login.jsx         # Supabase email + Google login
│       │   └── Signup.jsx        # New account registration
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── Footer.jsx
│       └── lib/
│           ├── api.js            # Backend API calls (/predict, /imd, /health)
│           ├── postcodes.js      # postcodes.io integration + region map
│           ├── overpass.js       # OpenStreetMap amenity distances (cached)
│           └── supabase.js       # Supabase client + history CRUD
└── model_lgb/
    ├── lgb_property_model.txt    # Trained LightGBM model
    └── label_encoders.pkl        # Scikit-learn label encoders
```

---

## Prerequisites

- **Python 3.11+** (Anaconda recommended)
- **Node.js 18+** and npm

---

## Setup — Backend

```bash
# 1. Navigate to the backend folder
cd backend

# 2. (Optional) create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # macOS / Linux
.venv\Scripts\activate           # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. (First time only) Build the IMD lookup
python download_imd.py
# If the download fails, manually download File 7 from:
# https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019
# Place the .csv in the backend/ folder and re-run the script.

# 5. Start the API server
uvicorn main:app --reload --port 8000
```

The backend will print:
```
[startup] IMD lookup loaded : 32,844 LSOAs
[startup] All artefacts loaded OK
```

API is now available at: **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

---

## Setup — Frontend

```bash
# Open a second terminal
cd frontend

npm install
npm run dev
```

Frontend is now available at: **http://localhost:5173**

### Environment variables (frontend)

Create `frontend/.env.local`:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8000   # omit in production if using Render default
```

---

## Running Tests

```bash
# Backend tests (requires uvicorn NOT running — TestClient spins up its own server)
cd backend
pip install pytest httpx
pytest test_main.py -v
```

### What the tests cover

| Test Class | Tests | What is verified |
|---|---|---|
| `TestHealth` | 5 | `/health` endpoint, model name, feature count |
| `TestPredictHappyPath` | 12 | Valid prediction, price range, CI ordering, contributions |
| `TestPredictPropertyTypes` | 6 | All 5 property types accepted, detached > flat |
| `TestPredictValidation` | 13 | 422 errors for out-of-range / missing inputs |
| `TestImd` | 3 | Real LSOA lookup, unknown fallback, rank range |
| `TestFeatureImportance` | 5 | Endpoint, structure, gain sum |
| `TestAgeBands` | 4 | List returned, known bands present |
| `TestEncoders` | 4 | Known columns, 404 for unknown |
| `TestFeatureCols` | 4 | 21 features, no duplicates |
| **Total** | **52 functions / 58 cases** | (parametrised tests expand at runtime) |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Server status, model info, feature count |
| POST | `/predict` | Property price prediction (21 features) |
| GET | `/imd/{lsoa_code}` | IMD deprivation rank for a given LSOA |
| GET | `/feature-importance` | Top 20 features by LightGBM gain |
| GET | `/age-bands` | List of valid construction age band strings |
| GET | `/encoders/{column}` | Known label classes for a categorical column |
| GET | `/regions` | All known ONS region codes |
| GET | `/local-authorities` | All known local authority codes |

Full interactive documentation: `http://localhost:8000/docs`

---

## Model Details

| Property | Value |
|---|---|
| Algorithm | LightGBM (GBDT) |
| Trees | 3,000 |
| Features | 21 |
| Training data | HM Land Registry + EPC + ONS (4.5M transactions, 2018–2021) |
| Validation set | 2022 sales (~800K) |
| Test set | 2023–2024 sales (~620K) — never seen during training |
| Test MAE | £65,342 |
| Test MedAPE | 14.75% |
| Within 20% of actual | 66.8% |
| RMSE (log₁p space) | 0.2408 |
| R² | 0.89 |

### Features used (21)

**Property characteristics:** `property_type`, `tenure_type`, `is_new_build`, `floor_area_sqm`, `room_count`, `room_count_was_imputed`, `construction_age_band`, `current_epc_score`

**Location:** `latitude`, `longitude`, `postcode_district`, `local_authority_code`, `region_code`, `imd_value`

**Accessibility (model inputs):** `distance_to_nearest_school_miles`, `distance_to_nearest_station_miles`, `distance_to_nearest_park_miles`

> **Note:** These three accessibility features are the model's trained inputs. The current UI sends sensible national-average defaults (school 0.3 mi, station 0.5 mi, park 0.2 mi) rather than live-fetched values, because Overpass results arrive asynchronously after form submission. The Results page separately displays live OSM distances — to station, school, supermarket, and pharmacy — as contextual location information; **these four displayed distances are not the same as the model's three accessibility inputs.**

**Economic context:** `sale_year`, `sale_month`, `bank_rate_at_sale_pct`, `unemployment_rate_at_sale_pct`

---

## Frontend UX Design

### Postcode-first form (Predict page)

The prediction form enforces a postcode-first flow:

1. The user types a postcode — autocomplete suggestions appear via postcodes.io
2. Selecting a postcode immediately resolves `latitude`, `longitude`, `region_code`, `local_authority_code`, and `imd_value`; the Overpass amenity fetch also starts at this point (background prefetch)
3. Property Basics and Property Details sections are visually locked (`opacity-40`, `pointer-events-none`) until a postcode is confirmed
4. The submit button is disabled until a postcode is confirmed, showing "Select a Postcode First"

### Results page

- **Satellite imagery strip** — Esri World Imagery tile (no API key, free public tile service) centred on the property's lat/lon with a green centre-pin marker
- **Location Snapshot** — live OSM distances to nearest station, school, supermarket, and pharmacy, with place names from the OSM `name` tag
- **Retry button** — appears if the Overpass fetch fails entirely, allowing a one-click re-request
- **Feature contributions** — per-prediction SHAP-equivalent waterfall chart (LightGBM `pred_contrib=True`)
- **Save / history** — predictions saved to Supabase `saved_predictions` table (requires login)
- **Share** — WhatsApp and email share buttons

---

## Overpass Amenity Fetching

The `frontend/src/lib/overpass.js` module handles all OpenStreetMap proximity queries.

**Key design decisions:**
- **Prefetch caching** — `prefetchAmenities(lat, lon)` is called the moment a postcode is selected. The resulting promise is stored in a module-level `Map`. By the time the user completes the form and navigates to Results, the data is already resolved (zero perceived wait).
- **Dual-server fallback** — the module tries `overpass-api.de` first; on timeout or HTTP error it automatically retries on `overpass.kumi.systems`. This eliminates the "Not found" failures caused by the public server's 2-connection-per-IP rate limit.
- **Place names** — each amenity card shows the OSM `name` tag (e.g. "King's Cross St. Pancras", "Boots") as a subtitle below the distance.
- **Single combined query** — all four amenity types (station, school, supermarket, pharmacy) are fetched in one Overpass request to stay within the connection limit.

---

## Supabase Integration

Authentication and prediction history are fully integrated with Supabase:

- **Email/password** and **Google OAuth** login via `Login.jsx` / `Signup.jsx`
- **Session management** via `AuthContext.jsx` (wraps entire app via `<AuthProvider>`, exposed through `useAuth()` hook)
- **History storage** in `saved_predictions` Supabase table with row-level security (RLS) — users can only read and delete their own rows
- **Free tier** supports up to 50,000 monthly active users

Environment variables required (set in Vercel dashboard for production):

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Build Notes — Vite 8 / Rolldown

This project targets **Vite 8** which ships with **Rolldown** as the bundler by default.

The object form of `manualChunks` (e.g. `manualChunks: { vendor: ['react'] }`) was **removed** in Vite 8 / Rolldown. We use the **function form** (`manualChunks(id) { ... }`), which is still supported but is marked as **deprecated** in the Rolldown migration guide. The fully idiomatic Rolldown approach is to use Rolldown's native `codeSplitting` configuration rather than `manualChunks`; however, the function form is a stable interim solution while the Rolldown ecosystem documentation matures.

```js
// vite.config.js — function form (supported, deprecated in Rolldown)
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'vendor-react'
        if (id.includes('node_modules/react-router')) return 'vendor-router'
        if (id.includes('node_modules/@supabase')) return 'vendor-supabase'
      },
    },
  },
},
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated CORS origins for the backend |
| `VITE_SUPABASE_URL` | — | Supabase project URL (required) |
| `VITE_SUPABASE_ANON_KEY` | — | Supabase anonymous key (required) |
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL (set to Render URL in production) |

---

## Data Sources

| Source | Used for |
|---|---|
| [HM Land Registry Price Paid](https://www.gov.uk/government/collections/price-paid-data) | Transaction prices (4.5M records) |
| [MHCLG EPC Register](https://epc.opendatacommunities.org/) | Floor area, rooms, EPC score, construction era |
| [ONS Postcode Directory](https://geoportal.statistics.gov.uk/) | Region codes, local authorities |
| [ONS IMD 2019](https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019) | Deprivation rank per LSOA |
| [postcodes.io](https://postcodes.io/) | Postcode → lat/lng, LSOA, region (free API) |
| [OpenStreetMap Overpass](https://overpass-api.de/) | Live distances to amenities (display only) |
| [Esri World Imagery](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer) | Satellite tile for property location |
| [Bank of England](https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate) | Base rate at time of sale |
| [ONS Labour Market](https://www.ons.gov.uk/employmentandlabourmarket) | Unemployment rate at time of sale |
