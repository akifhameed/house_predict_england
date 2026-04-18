"""
download_imd.py  --  build the LSOA → IMD rank lookup from ONS open data

Run once:
    python download_imd.py

Saves imd_lookup.json in the backend folder.
Restart uvicorn after running this.
"""
import json, csv, io, os, sys

OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "imd_lookup.json")

# ---------------------------------------------------------------------------
# Try to download automatically
# ---------------------------------------------------------------------------
URLS = [
    # Current DLUHC / GOV.UK asset (2019 IoD File 7)
    "https://assets.publishing.service.gov.uk/media/5d8b3b51ed915d037a61e399/File_7_-_All_IoD2019_Scores__Ranks__Deciles_and_Population_Denominators_3.csv",
    # Alternative mirror via Open Geography Portal (paginated JSON — handled below)
    "https://opendata.arcgis.com/datasets/1ef53df1571840c2b66741a0ea4e4dbb_0.csv",
]

# Possible column name variants across file versions
LSOA_COLS = ["LSOA code (2011)", "LSOA Code", "lsoa11cd", "FeatureCode", "LSOA_code"]
RANK_COLS  = [
    "Index of Multiple Deprivation (IMD) Rank (where 1 is most deprived)",
    "IMD Rank",
    "IMDRank",
    "imd_rank",
    "Index of Multiple Deprivation (IMD) Rank",
]


def try_parse_csv(text: str) -> dict:
    """Try to extract LSOA → IMD rank from CSV text. Returns {} on failure."""
    reader = csv.DictReader(io.StringIO(text))
    headers = reader.fieldnames or []

    lsoa_col = next((c for c in LSOA_COLS if c in headers), None)
    rank_col  = next((c for c in RANK_COLS  if c in headers), None)

    if not lsoa_col or not rank_col:
        print(f"  Column scan: {headers[:8]} …")
        return {}

    lookup = {}
    for row in reader:
        lsoa = row.get(lsoa_col, "").strip()
        rank = row.get(rank_col, "").strip()
        if lsoa and rank:
            try:
                lookup[lsoa] = int(float(rank))
            except ValueError:
                pass
    return lookup


def download_and_build():
    try:
        import urllib.request
    except ImportError:
        return {}

    for url in URLS:
        print(f"  Trying: {url[:80]}…")
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; HousePredict/1.0)"
            })
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw = resp.read()
                # Detect encoding
                for enc in ("utf-8-sig", "utf-8", "latin-1"):
                    try:
                        text = raw.decode(enc)
                        break
                    except UnicodeDecodeError:
                        continue
                else:
                    text = raw.decode("latin-1", errors="replace")

            if "<html" in text[:200].lower():
                print("  → Got an HTML page instead of CSV, skipping.")
                continue

            result = try_parse_csv(text)
            if len(result) >= 30000:
                return result
            print(f"  → Parsed only {len(result)} rows, skipping.")
        except Exception as e:
            print(f"  → Failed: {e}")

    return {}


# ---------------------------------------------------------------------------
# Check for a manually downloaded file first
# ---------------------------------------------------------------------------
def find_local_file():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        f for f in os.listdir(backend_dir)
        if f.lower().endswith(".csv") and "iod" in f.lower() or "imd" in f.lower()
    ]
    for name in candidates:
        path = os.path.join(backend_dir, name)
        print(f"  Found local file: {name}")
        try:
            with open(path, encoding="utf-8-sig", errors="replace") as f:
                text = f.read()
            result = try_parse_csv(text)
            if len(result) >= 30000:
                return result
            print(f"  → Only {len(result)} rows, skipping.")
        except Exception as e:
            print(f"  → Could not read: {e}")
    return {}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
print("=" * 60)
print("HousePredict — IMD 2019 Lookup Builder")
print("=" * 60)

# 1. Try local CSV first (fastest)
print("\n[1] Looking for a local CSV file in the backend folder …")
lookup = find_local_file()

# 2. Try automatic download
if not lookup:
    print("\n[2] Trying automatic download …")
    lookup = download_and_build()

# 3. Manual instructions if both fail
if not lookup:
    print("\n❌ Could not build the lookup automatically.")
    print()
    print("MANUAL STEPS (takes 2 minutes):")
    print("  1. Open this link in your browser:")
    print("     https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019")
    print()
    print("  2. Download:  'File 7: all IoD2019 scores, ranks, deciles and")
    print("                population denominators'  (the CSV version)")
    print()
    print("  3. Place the downloaded .csv file in this folder:")
    print(f"     {os.path.dirname(os.path.abspath(__file__))}")
    print()
    print("  4. Run this script again:  python download_imd.py")
    print()
    print("The app works fine without it (uses national median fallback).")
    sys.exit(1)

# 4. Save
with open(OUTPUT, "w") as f:
    json.dump(lookup, f)

print(f"\n✅ Saved {len(lookup):,} LSOA → IMD rank entries to imd_lookup.json")
print("   Restart the backend (Ctrl+C then python -m uvicorn ...) to activate.")
