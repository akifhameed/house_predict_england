"""
backend/main.py  -- FastAPI UK Property Price Prediction API
Run:  uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import os
import math
import numpy as np
import pandas as pd
import joblib
import lightgbm as lgb
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

# ---------------------------------------------------------------------------
# Paths  (backend/ sits inside ml-dl/, so models are one level up)
# ---------------------------------------------------------------------------
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)
MODEL_LGB  = os.path.join(PARENT_DIR, "model_lgb")

LGB_PATH = os.path.join(MODEL_LGB, "lgb_property_model.txt")
LE_PATH  = os.path.join(MODEL_LGB, "label_encoders.pkl")

# ---------------------------------------------------------------------------
# Load artefacts once at startup
# ---------------------------------------------------------------------------
print(f"[startup] Loading LightGBM model  : {LGB_PATH}")
lgb_model = lgb.Booster(model_file=LGB_PATH)

print(f"[startup] Loading label encoders  : {LE_PATH}")
label_encoders: dict = joblib.load(LE_PATH)

# ---------------------------------------------------------------------------
# IMD lookup  (LSOA code → IMD rank 2019)
# Optional: place imd_lookup.json in the backend folder.
# Generate it once with:  python download_imd.py
# Falls back to national median (15000) if file not found.
# ---------------------------------------------------------------------------
IMD_PATH = os.path.join(BASE_DIR, "imd_lookup.json")
imd_lookup: dict = {}
if os.path.exists(IMD_PATH):
    import json
    with open(IMD_PATH, "r") as f:
        imd_lookup = json.load(f)
    print(f"[startup] IMD lookup loaded        : {len(imd_lookup):,} LSOAs")
else:
    print("[startup] IMD lookup not found — using national median fallback (15000)")

IMD_NATIONAL_MEDIAN = 15000

print("[startup] All artefacts loaded OK")

# ---------------------------------------------------------------------------
# Feature order must exactly match notebook training
# ---------------------------------------------------------------------------
NUMERIC_COLS: list = [
    "is_new_build", "floor_area_sqm", "room_count",
    "room_count_was_imputed", "current_epc_score",
    "latitude", "longitude", "imd_value",
    "distance_to_nearest_school_miles",
    "distance_to_nearest_station_miles",
    "distance_to_nearest_park_miles",
    "bank_rate_at_sale_pct", "unemployment_rate_at_sale_pct",
    "sale_year",
]
CATEGORICAL_COLS: list = [
    "property_type", "tenure_type", "construction_age_band",
    "region_code", "local_authority_code", "postcode_district",
    "sale_month",
]
FEATURE_COLS: list = NUMERIC_COLS + CATEGORICAL_COLS

# Construction age-band string -> integer (matches notebook Cell 30)
AGE_BAND_ORDER: dict = {
    "England and Wales: before 1900": 0,
    "England and Wales: 1900-1929":   1,
    "England and Wales: 1930-1949":   2,
    "England and Wales: 1950-1966":   3,
    "England and Wales: 1967-1975":   4,
    "England and Wales: 1976-1982":   5,
    "England and Wales: 1983-1990":   6,
    "England and Wales: 1991-1995":   7,
    "England and Wales: 1996-2002":   8,
    "England and Wales: 2003-2006":   9,
    "England and Wales: 2007-2011":  10,
    "England and Wales: 2012 onwards": 11,
    "England and Wales: 2007 onwards": 10,
    "Unknown":                          12,
}
AGE_BAND_LABELS: list = [
    k for k in AGE_BAND_ORDER
    if k != "England and Wales: 2007 onwards"
]

# Known test-set RMSE in log1p space (from notebook evaluation)
LOG_RMSE = 0.2408

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="England Property Price Predictor",
    description="LightGBM-based UK residential property price prediction.",
    version="1.0.0",
)

# CORS — restrict to known origins in production, wildcard only for local dev
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"   # dev defaults
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class PropertyInput(BaseModel):
    # --- Property characteristics ---
    property_type: str = Field(
        ..., description="D=Detached  S=Semi-detached  T=Terraced  F=Flat  O=Other")
    tenure_type: str = Field(
        ..., description="F=Freehold  L=Leasehold")
    is_new_build: int = Field(
        0, description="1 = new build, 0 = existing", ge=0, le=1)
    floor_area_sqm: float = Field(
        ..., description="Total floor area in m^2", gt=0)
    room_count: int = Field(
        ..., description="Number of rooms", ge=1, le=30)
    room_count_was_imputed: int = Field(
        0, description="1 if room count was imputed by the tree model", ge=0, le=1)
    construction_age_band: str = Field(
        "Unknown", description="EPC construction age band string")
    current_epc_score: float = Field(
        ..., description="EPC energy efficiency score (1-100)", ge=1, le=100)

    # --- Location ---
    postcode_district: str = Field(
        ..., description="Outward postcode district, e.g. SW1A or M1")
    local_authority_code: str = Field(
        ..., description="ONS local authority code, e.g. E09000033")
    region_code: str = Field(
        ..., description="ONS region code, e.g. E12000007")
    latitude: float = Field(
        ..., description="Latitude of the property", ge=49.0, le=56.0)
    longitude: float = Field(
        ..., description="Longitude of the property", ge=-6.5, le=2.0)
    imd_value: float = Field(
        ..., description="Index of Multiple Deprivation rank (1=most deprived)", ge=1)

    # --- Accessibility ---
    distance_to_nearest_school_miles: float = Field(
        0.30, description="Miles to nearest school", ge=0)
    distance_to_nearest_station_miles: float = Field(
        0.50, description="Miles to nearest train station", ge=0)
    distance_to_nearest_park_miles: float = Field(
        0.20, description="Miles to nearest park", ge=0)

    # --- Sale context ---
    sale_year: int = Field(
        ..., description="Year of sale, e.g. 2025", ge=2000, le=2035)
    sale_month: int = Field(
        ..., description="Month of sale (1=January, 12=December)", ge=1, le=12)
    bank_rate_at_sale_pct: float = Field(
        4.50, description="Bank of England base rate at time of sale (%)", ge=0)
    unemployment_rate_at_sale_pct: float = Field(
        4.20, description="UK unemployment rate at time of sale (%)", ge=0)


class PredictionResponse(BaseModel):
    predicted_price: float
    predicted_price_formatted: str
    lower_bound: float
    lower_bound_formatted: str
    upper_bound: float
    upper_bound_formatted: str
    confidence_level: str
    log_prediction: float
    feature_snapshot: dict
    feature_contributions: list  # per-prediction contributions, sorted by |impact|


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def fmt_gbp(amount: float) -> str:
    return f"£{amount:,.0f}"


def safe_label_encode(col: str, value: str) -> int:
    """Encode a string using its saved LabelEncoder; fall back to 0 for unseen classes."""
    le = label_encoders.get(col)
    if le is None:
        return 0
    try:
        return int(le.transform([str(value)])[0])
    except ValueError:
        return 0


def encode_age_band(value: str) -> int:
    """Map construction age band string to integer code (mirrors notebook Cell 30)."""
    if value in AGE_BAND_ORDER:
        return AGE_BAND_ORDER[value]
    try:
        yr = int(str(value).strip())
        for threshold, code in [
            (1900, 0), (1929, 1), (1949, 2), (1966, 3), (1975, 4),
            (1982, 5), (1990, 6), (1995, 7), (2002, 8), (2006, 9),
            (2011, 10), (2025, 11),
        ]:
            if yr <= threshold:
                return code
        return 12
    except (ValueError, TypeError):
        return 12


def build_feature_row(inp: PropertyInput) -> pd.DataFrame:
    """Convert validated Pydantic input to a 1-row DataFrame in FEATURE_COLS order."""
    prop_type_enc = safe_label_encode("property_type",        inp.property_type.upper())
    tenure_enc    = safe_label_encode("tenure_type",          inp.tenure_type.upper())
    region_enc    = safe_label_encode("region_code",          inp.region_code.upper())
    la_enc        = safe_label_encode("local_authority_code", inp.local_authority_code.upper())
    postcode_enc  = safe_label_encode("postcode_district",    inp.postcode_district.upper())
    age_band_enc  = encode_age_band(inp.construction_age_band)
    month_0idx    = inp.sale_month - 1  # 1-indexed -> 0-indexed (notebook Cell 38)

    row = {
        # NUMERIC_COLS (14)
        "is_new_build":                          float(inp.is_new_build),
        "floor_area_sqm":                        float(inp.floor_area_sqm),
        "room_count":                            float(inp.room_count),
        "room_count_was_imputed":                float(inp.room_count_was_imputed),
        "current_epc_score":                     float(inp.current_epc_score),
        "latitude":                              float(inp.latitude),
        "longitude":                             float(inp.longitude),
        "imd_value":                             float(inp.imd_value),
        "distance_to_nearest_school_miles":      float(inp.distance_to_nearest_school_miles),
        "distance_to_nearest_station_miles":     float(inp.distance_to_nearest_station_miles),
        "distance_to_nearest_park_miles":        float(inp.distance_to_nearest_park_miles),
        "bank_rate_at_sale_pct":                 float(inp.bank_rate_at_sale_pct),
        "unemployment_rate_at_sale_pct":         float(inp.unemployment_rate_at_sale_pct),
        "sale_year":                             float(inp.sale_year),
        # CATEGORICAL_COLS (7, integer-encoded)
        "property_type":                         float(prop_type_enc),
        "tenure_type":                           float(tenure_enc),
        "construction_age_band":                 float(age_band_enc),
        "region_code":                           float(region_enc),
        "local_authority_code":                  float(la_enc),
        "postcode_district":                     float(postcode_enc),
        "sale_month":                            float(month_0idx),
    }
    return pd.DataFrame([row], columns=FEATURE_COLS)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health", summary="Health check")
def health():
    return {
        "status":     "ok",
        "model":      "LightGBM",
        "n_features": len(FEATURE_COLS),
        "encoders":   list(label_encoders.keys()),
    }


@app.post("/predict", response_model=PredictionResponse, summary="Predict property price")
def predict(inp: PropertyInput):
    try:
        df_input = build_feature_row(inp)
        log_pred = float(lgb_model.predict(df_input)[0])
        price    = math.expm1(log_pred)

        # 95 % confidence interval in log1p space, then back-transform
        margin   = 1.96 * LOG_RMSE
        price_lo = math.expm1(log_pred - margin)
        price_hi = math.expm1(log_pred + margin)

        # Per-prediction feature contributions via LightGBM pred_contrib
        # Returns shape (1, n_features + 1); last column is the expected value (bias)
        raw_contribs = lgb_model.predict(df_input, pred_contrib=True)[0]
        contrib_dict = {
            name: float(raw_contribs[i])
            for i, name in enumerate(FEATURE_COLS)
        }
        # Normalise to % of total absolute contribution (excludes bias term)
        total_abs = sum(abs(v) for v in contrib_dict.values()) or 1.0
        contributions_sorted = sorted(
            [
                {
                    "feature":     name,
                    "contribution_pct": round(v / total_abs * 100, 2),
                    "direction":   "up" if v >= 0 else "down",
                }
                for name, v in contrib_dict.items()
            ],
            key=lambda x: abs(x["contribution_pct"]),
            reverse=True,
        )

        return PredictionResponse(
            predicted_price           = round(price,    2),
            predicted_price_formatted = fmt_gbp(price),
            lower_bound               = round(price_lo, 2),
            lower_bound_formatted     = fmt_gbp(price_lo),
            upper_bound               = round(price_hi, 2),
            upper_bound_formatted     = fmt_gbp(price_hi),
            confidence_level          = "95%",
            log_prediction            = round(log_pred, 6),
            feature_contributions     = contributions_sorted[:10],
            feature_snapshot          = {
                "property_type":         inp.property_type,
                "tenure_type":           inp.tenure_type,
                "floor_area_sqm":        inp.floor_area_sqm,
                "room_count":            inp.room_count,
                "current_epc_score":     inp.current_epc_score,
                "construction_age_band": inp.construction_age_band,
                "is_new_build":          inp.is_new_build,
                "sale_year":             inp.sale_year,
                "sale_month":            inp.sale_month,
                "region_code":           inp.region_code,
                "local_authority_code":  inp.local_authority_code,
                "postcode_district":     inp.postcode_district,
                "latitude":              inp.latitude,
                "longitude":             inp.longitude,
                "imd_value":             inp.imd_value,
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/feature-importance", summary="LightGBM feature importance (all 21 features, ranked by gain)")
def feature_importance():
    gains  = lgb_model.feature_importance(importance_type="gain")
    splits = lgb_model.feature_importance(importance_type="split")
    total_gain  = float(gains.sum())  or 1.0
    total_split = float(splits.sum()) or 1.0
    features = [
        {
            "feature":   name,
            "gain_pct":  round(float(g) / total_gain  * 100, 2),
            "split_pct": round(float(s) / total_split * 100, 2),
        }
        for name, g, s in zip(FEATURE_COLS, gains, splits)
    ]
    features.sort(key=lambda x: x["gain_pct"], reverse=True)
    return {"features": features}


@app.get("/encoders/{column}", summary="Return known classes for a label-encoded column")
def get_encoder_classes(column: str):
    if column not in label_encoders:
        raise HTTPException(status_code=404, detail=f"No encoder found for '{column}'")
    classes = label_encoders[column].classes_.tolist()
    return {"column": column, "classes": classes, "count": len(classes)}


@app.get("/imd/{lsoa_code}", summary="IMD rank for a given LSOA code")
def get_imd(lsoa_code: str):
    rank = imd_lookup.get(lsoa_code)
    if rank is not None:
        return {"lsoa_code": lsoa_code, "imd_rank": rank, "source": "ONS IMD 2019"}
    return {"lsoa_code": lsoa_code, "imd_rank": IMD_NATIONAL_MEDIAN, "source": "national_median_fallback"}


@app.get("/age-bands", summary="List all construction age band options")
def get_age_bands():
    return {"age_bands": AGE_BAND_LABELS}


@app.get("/regions", summary="List all known region codes")
def get_regions():
    return get_encoder_classes("region_code")


@app.get("/local-authorities", summary="List all known local authority codes")
def get_local_authorities():
    return get_encoder_classes("local_authority_code")
