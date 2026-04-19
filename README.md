# HousePredict AI

A full-stack machine learning application for UK residential property price prediction.  
Built with **React + Vite** (frontend), **FastAPI + LightGBM** (backend), and trained on **4.5 million** HM Land Registry transactions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router v7 |
| Backend | Python 3.11+, FastAPI, Uvicorn |
| ML Model | LightGBM (3,000 trees, 21 features) |
| Postcode API | postcodes.io (free, no key required) |
| Amenity distances | OpenStreetMap Overpass API |
| IMD data | ONS Indices of Deprivation 2019 |
| Authentication | Supabase (email/password + Google OAuth) |
| History storage | Supabase PostgreSQL (saved_predictions table, row-level security) |

---

## Project Structure

```
ml-dl/
├── backend/
│   ├── main.py               # FastAPI app — all endpoints
│   ├── test_main.py          # Pytest test suite (58 test cases)
│   ├── download_imd.py       # One-time script to build IMD lookup
│   ├── imd_lookup.json       # 32,844 LSOA → IMD rank entries
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx          # Landing page
│       │   ├── Predict.jsx       # Prediction form
│       │   ├── Results.jsx       # Results + history
│       │   └── HowItWorks.jsx    # Interactive explainer
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── Footer.jsx
│       └── lib/
│           ├── api.js            # Backend API calls
│           ├── postcodes.js      # postcodes.io integration
│           ├── overpass.js       # OpenStreetMap distances
│           └── supabase.js       # localStorage history (Supabase-ready)
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

cd "SSE - CW2 - 10 April 2026/ml-dl/frontend"

npm install

npm run dev
```

Frontend is now available at: **http://localhost:5173**

---

## Running Tests

```bash
# Backend tests (requires uvicorn NOT running — TestClient spins up its own server)
cd backend
conda activate akifenv
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
| **Total** | **52 functions / 58 cases** | (parametrized tests expand at runtime) |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Server status, model info, feature count |
| POST | `/predict` | Property price prediction (21 features) |
| GET | `/imd/{lsoa_code}` | IMD deprivation rank for a given LSOA |
| GET | `/feature-importance` | Top 20 features by gain |
| GET | `/age-bands` | List of valid construction age band strings |
| GET | `/encoders/{column}` | Known label classes for a categorical column |
| GET | `/regions` | All known ONS region codes |
| GET | `/local-authorities` | All known local authority codes |

Full interactive documentation available at `http://localhost:8000/docs` when running.

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

### Features used

**Property characteristics:** property type, tenure, is_new_build, floor_area_sqm, room_count, construction_age_band, current_epc_score

**Location:** latitude, longitude, postcode_district, local_authority_code, region_code, imd_value (ONS IMD rank)

**Accessibility:** distance_to_nearest_school_miles, distance_to_nearest_station_miles, distance_to_nearest_park_miles

**Economic context:** sale_year, sale_month, bank_rate_at_sale_pct, unemployment_rate_at_sale_pct

---

## Environment Variables (optional, production)

| Variable | Default | Description |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated CORS origins |

Set via system environment or a `.env` file before starting uvicorn.

---

## Supabase Integration

Authentication and prediction history are fully integrated with Supabase:

- **Email/password** and **Google OAuth** login via `Login.jsx` / `Signup.jsx`
- **Session management** via `AuthContext.jsx` (wraps entire app, `useAuth()` hook)
- **History storage** in `saved_predictions` Supabase table with row-level security (RLS)
- Environment variables required (set in Vercel dashboard for production):

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Data Sources

| Source | Used for |
|---|---|
| [HM Land Registry Price Paid](https://www.gov.uk/government/collections/price-paid-data) | Transaction prices (4.5M records) |
| [MHCLG EPC Register](https://epc.opendatacommunities.org/) | Floor area, rooms, EPC score, construction era |
| [ONS Postcode Directory](https://geoportal.statistics.gov.uk/) | Region codes, local authorities |
| [ONS IMD 2019](https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019) | Deprivation rank per LSOA |
| [postcodes.io](https://postcodes.io/) | Postcode → lat/lng, LSOA, region (free API) |
| [OpenStreetMap Overpass](https://overpass-api.de/) | Live distances to amenities |
| [Bank of England](https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate) | Base rate at time of sale |
| [ONS Labour Market](https://www.ons.gov.uk/employmentandlabourmarket) | Unemployment rate at time of sale |
