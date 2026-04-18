"""
test_main.py  --  Pytest suite for the HousePredict FastAPI backend
Run:  pytest test_main.py -v
"""
import pytest
from fastapi.testclient import TestClient
from main import app, FEATURE_COLS, imd_lookup, IMD_NATIONAL_MEDIAN

client = TestClient(app)

# ---------------------------------------------------------------------------
# Shared valid payload (all 21 features)
# ---------------------------------------------------------------------------
VALID_PAYLOAD = {
    "property_type":          "S",
    "tenure_type":            "F",
    "is_new_build":           0,
    "floor_area_sqm":         85.0,
    "room_count":             5,
    "room_count_was_imputed": 0,
    "construction_age_band":  "England and Wales: 1983-1990",
    "current_epc_score":      67.0,
    "postcode_district":      "E18",
    "local_authority_code":   "E09000006",
    "region_code":            "E12000007",
    "latitude":               51.5931,
    "longitude":              0.0188,
    "imd_value":              15000.0,
    "distance_to_nearest_school_miles":  0.25,
    "distance_to_nearest_station_miles": 0.45,
    "distance_to_nearest_park_miles":    0.15,
    "sale_year":              2025,
    "sale_month":             4,
    "bank_rate_at_sale_pct":         4.50,
    "unemployment_rate_at_sale_pct": 4.20,
}


# ===========================================================================
# 1. Health check
# ===========================================================================
class TestHealth:
    def test_health_returns_200(self):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_status_ok(self):
        data = client.get("/health").json()
        assert data["status"] == "ok"

    def test_health_reports_21_features(self):
        data = client.get("/health").json()
        assert data["n_features"] == 21

    def test_health_model_is_lightgbm(self):
        data = client.get("/health").json()
        assert data["model"] == "LightGBM"

    def test_health_encoders_present(self):
        data = client.get("/health").json()
        assert isinstance(data["encoders"], list)
        assert len(data["encoders"]) > 0


# ===========================================================================
# 2. Predict endpoint — happy path
# ===========================================================================
class TestPredictHappyPath:
    def setup_method(self):
        self.response = client.post("/predict", json=VALID_PAYLOAD)
        self.data = self.response.json()

    def test_returns_200(self):
        assert self.response.status_code == 200

    def test_predicted_price_is_positive(self):
        assert self.data["predicted_price"] > 0

    def test_predicted_price_in_plausible_range(self):
        # UK residential: very unlikely below £20k or above £10M
        price = self.data["predicted_price"]
        assert 20_000 < price < 10_000_000, f"Implausible price: £{price:,.0f}"

    def test_confidence_interval_is_ordered(self):
        assert self.data["lower_bound"] < self.data["predicted_price"] < self.data["upper_bound"]

    def test_confidence_level_is_95(self):
        assert self.data["confidence_level"] == "95%"

    def test_formatted_price_contains_pound(self):
        assert "£" in self.data["predicted_price_formatted"]

    def test_log_prediction_is_finite(self):
        import math
        assert math.isfinite(self.data["log_prediction"])

    def test_feature_contributions_present(self):
        contribs = self.data["feature_contributions"]
        assert isinstance(contribs, list)
        assert len(contribs) > 0

    def test_feature_contributions_have_required_keys(self):
        for c in self.data["feature_contributions"]:
            assert "feature"           in c
            assert "contribution_pct"  in c
            assert "direction"         in c

    def test_feature_contributions_direction_valid(self):
        for c in self.data["feature_contributions"]:
            assert c["direction"] in ("up", "down")

    def test_feature_snapshot_present(self):
        snapshot = self.data["feature_snapshot"]
        assert "property_type"   in snapshot
        assert "floor_area_sqm"  in snapshot
        assert "latitude"        in snapshot

    def test_at_most_10_contributions_returned(self):
        assert len(self.data["feature_contributions"]) <= 10


# ===========================================================================
# 3. Predict endpoint — property type variants
# ===========================================================================
class TestPredictPropertyTypes:
    @pytest.mark.parametrize("ptype", ["D", "S", "T", "F", "O"])
    def test_all_property_types_accepted(self, ptype):
        payload = {**VALID_PAYLOAD, "property_type": ptype}
        response = client.post("/predict", json=payload)
        assert response.status_code == 200
        assert response.json()["predicted_price"] > 0

    def test_detached_typically_more_than_flat(self):
        """Detached houses should generally predict higher than flats (same postcode)."""
        det  = client.post("/predict", json={**VALID_PAYLOAD, "property_type": "D", "floor_area_sqm": 150}).json()
        flat = client.post("/predict", json={**VALID_PAYLOAD, "property_type": "F", "floor_area_sqm": 50 }).json()
        assert det["predicted_price"] > flat["predicted_price"]


# ===========================================================================
# 4. Predict endpoint — validation errors
# ===========================================================================
class TestPredictValidation:
    def test_missing_required_field_returns_422(self):
        payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "floor_area_sqm"}
        response = client.post("/predict", json=payload)
        assert response.status_code == 422

    def test_floor_area_zero_returns_422(self):
        response = client.post("/predict", json={**VALID_PAYLOAD, "floor_area_sqm": 0})
        assert response.status_code == 422

    def test_floor_area_negative_returns_422(self):
        response = client.post("/predict", json={**VALID_PAYLOAD, "floor_area_sqm": -10})
        assert response.status_code == 422

    def test_room_count_zero_returns_422(self):
        response = client.post("/predict", json={**VALID_PAYLOAD, "room_count": 0})
        assert response.status_code == 422

    def test_room_count_over_30_returns_422(self):
        response = client.post("/predict", json={**VALID_PAYLOAD, "room_count": 31})
        assert response.status_code == 422

    def test_epc_score_zero_returns_422(self):
        response = client.post("/predict", json={**VALID_PAYLOAD, "current_epc_score": 0})
        assert response.status_code == 422

    def test_epc_score_over_100_returns_422(self):
        response = client.post("/predict", json={**VALID_PAYLOAD, "current_epc_score": 101})
        assert response.status_code == 422

    def test_latitude_out_of_range_returns_422(self):
        response = client.post("/predict", json={**VALID_PAYLOAD, "latitude": 60.0})
        assert response.status_code == 422

    def test_longitude_out_of_range_returns_422(self):
        response = client.post("/predict", json={**VALID_PAYLOAD, "longitude": 10.0})
        assert response.status_code == 422

    def test_sale_year_too_early_returns_422(self):
        response = client.post("/predict", json={**VALID_PAYLOAD, "sale_year": 1999})
        assert response.status_code == 422

    def test_sale_month_zero_returns_422(self):
        response = client.post("/predict", json={**VALID_PAYLOAD, "sale_month": 0})
        assert response.status_code == 422

    def test_sale_month_13_returns_422(self):
        response = client.post("/predict", json={**VALID_PAYLOAD, "sale_month": 13})
        assert response.status_code == 422

    def test_is_new_build_out_of_range_returns_422(self):
        response = client.post("/predict", json={**VALID_PAYLOAD, "is_new_build": 2})
        assert response.status_code == 422


# ===========================================================================
# 5. IMD endpoint
# ===========================================================================
class TestImd:
    def test_known_lsoa_returns_real_rank(self):
        """E01000001 should be in the lookup when imd_lookup.json is present."""
        if not imd_lookup:
            pytest.skip("imd_lookup.json not loaded — run download_imd.py first")
        response = client.get("/imd/E01000001")
        assert response.status_code == 200
        data = response.json()
        assert data["imd_rank"] != IMD_NATIONAL_MEDIAN
        assert data["source"] == "ONS IMD 2019"

    def test_unknown_lsoa_returns_median_fallback(self):
        response = client.get("/imd/XXNONEXISTENT")
        assert response.status_code == 200
        data = response.json()
        assert data["imd_rank"] == IMD_NATIONAL_MEDIAN
        assert data["source"] == "national_median_fallback"

    def test_imd_rank_in_valid_range(self):
        """IMD ranks run 1 (most deprived) to 32,844 (least deprived)."""
        if not imd_lookup:
            pytest.skip("imd_lookup.json not loaded")
        response = client.get("/imd/E01000001")
        rank = response.json()["imd_rank"]
        assert 1 <= rank <= 32_844


# ===========================================================================
# 6. Feature importance endpoint
# ===========================================================================
class TestFeatureImportance:
    def test_returns_200(self):
        assert client.get("/feature-importance").status_code == 200

    def test_returns_features_list(self):
        data = client.get("/feature-importance").json()
        assert "features" in data
        assert isinstance(data["features"], list)

    def test_at_most_20_features_returned(self):
        data = client.get("/feature-importance").json()
        assert len(data["features"]) <= 20

    def test_gain_pcts_sum_to_100(self):
        data = client.get("/feature-importance").json()
        total = sum(f["gain_pct"] for f in data["features"])
        # May not sum to exactly 100 if top-20 only, but should be <= 100
        assert total <= 100.5

    def test_each_feature_has_required_keys(self):
        data = client.get("/feature-importance").json()
        for f in data["features"]:
            assert "feature"   in f
            assert "gain_pct"  in f
            assert "split_pct" in f


# ===========================================================================
# 7. Age bands endpoint
# ===========================================================================
class TestAgeBands:
    def test_returns_200(self):
        assert client.get("/age-bands").status_code == 200

    def test_returns_age_bands_list(self):
        data = client.get("/age-bands").json()
        assert "age_bands" in data
        assert isinstance(data["age_bands"], list)

    def test_contains_expected_band(self):
        data = client.get("/age-bands").json()
        assert "England and Wales: before 1900" in data["age_bands"]

    def test_unknown_band_present(self):
        data = client.get("/age-bands").json()
        assert "Unknown" in data["age_bands"]


# ===========================================================================
# 8. Encoders endpoint
# ===========================================================================
class TestEncoders:
    @pytest.mark.parametrize("col", ["property_type", "tenure_type", "region_code"])
    def test_known_column_returns_200(self, col):
        assert client.get(f"/encoders/{col}").status_code == 200

    def test_unknown_column_returns_404(self):
        assert client.get("/encoders/nonexistent_column").status_code == 404

    def test_property_type_classes_include_standard_codes(self):
        data = client.get("/encoders/property_type").json()
        classes = data["classes"]
        for code in ("D", "F", "S", "T"):
            assert code in classes

    def test_region_code_classes_include_london(self):
        data = client.get("/encoders/region_code").json()
        assert "E12000007" in data["classes"]


# ===========================================================================
# 9. Feature column order
# ===========================================================================
class TestFeatureCols:
    def test_exactly_21_feature_cols(self):
        assert len(FEATURE_COLS) == 21

    def test_no_duplicate_feature_cols(self):
        assert len(FEATURE_COLS) == len(set(FEATURE_COLS))

    def test_imd_value_in_feature_cols(self):
        assert "imd_value" in FEATURE_COLS

    def test_sale_year_in_feature_cols(self):
        assert "sale_year" in FEATURE_COLS
