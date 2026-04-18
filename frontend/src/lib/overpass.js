// Primary and fallback Overpass endpoints
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

/**
 * Module-level promise cache keyed by "lat,lon".
 * Survives page navigation within the SPA — so if Predict.jsx kicks off the
 * fetch when the postcode is selected, Results.jsx just reads the cached
 * promise instead of waiting for a brand-new request.
 */
const _cache = new Map()

/** Haversine distance in miles between two lat/lon points */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Return distance in miles AND the OSM name of the nearest element,
 * or { miles: null, name: null } if the array is empty.
 */
function nearestInfo(lat, lon, elements) {
  let bestDist = Infinity
  let bestName = null
  for (const el of elements) {
    const elLat = el.lat ?? el.center?.lat
    const elLon = el.lon ?? el.center?.lon
    if (elLat == null || elLon == null) continue
    const d = haversine(lat, lon, elLat, elLon)
    if (d < bestDist) {
      bestDist = d
      bestName = el.tags?.name || null
    }
  }
  if (bestDist === Infinity) return { miles: null, name: null }
  return { miles: +bestDist.toFixed(2), name: bestName }
}

/** Try one Overpass endpoint, returning parsed elements or throwing */
async function tryFetch(url, query, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.elements || []
  } finally {
    clearTimeout(timer)
  }
}

const NULL_RESULT = {
  distance_to_nearest_station_miles:     null, nearest_station_name:     null,
  distance_to_nearest_school_miles:      null, nearest_school_name:      null,
  distance_to_nearest_supermarket_miles: null, nearest_supermarket_name: null,
  distance_to_nearest_pharmacy_miles:    null, nearest_pharmacy_name:    null,
}

async function _doFetch(lat, lon) {
  const radius    = 5000  // 5 km for stations/schools
  const nearRadius = 2000 // 2 km for shops/pharmacies

  const query = `
    [out:json][timeout:25];
    (
      node["railway"~"station|halt"](around:${radius},${lat},${lon});
      way["railway"~"station|halt"](around:${radius},${lat},${lon});
      node["public_transport"="station"](around:${radius},${lat},${lon});
      node["amenity"="school"](around:${radius},${lat},${lon});
      way["amenity"="school"](around:${radius},${lat},${lon});
      node["shop"~"supermarket|convenience"](around:${nearRadius},${lat},${lon});
      way["shop"~"supermarket|convenience"](around:${nearRadius},${lat},${lon});
      node["amenity"="pharmacy"](around:${nearRadius},${lat},${lon});
      way["amenity"="pharmacy"](around:${nearRadius},${lat},${lon});
    );
    out center tags 60;
  `

  let els = null
  for (const url of OVERPASS_URLS) {
    try {
      els = await tryFetch(url, query, 25000)
      break
    } catch {
      // try next mirror
    }
  }
  if (!els) return NULL_RESULT

  const stations = els.filter(el =>
    el.tags?.railway === 'station' || el.tags?.railway === 'halt' ||
    el.tags?.public_transport === 'station'
  )
  const schools      = els.filter(el => el.tags?.amenity === 'school')
  const supermarkets = els.filter(el =>
    el.tags?.shop === 'supermarket' || el.tags?.shop === 'convenience'
  )
  const pharmacies   = els.filter(el => el.tags?.amenity === 'pharmacy')

  const si = nearestInfo(lat, lon, stations)
  const sc = nearestInfo(lat, lon, schools)
  const sm = nearestInfo(lat, lon, supermarkets)
  const ph = nearestInfo(lat, lon, pharmacies)

  return {
    distance_to_nearest_station_miles:     si.miles, nearest_station_name:     si.name,
    distance_to_nearest_school_miles:      sc.miles, nearest_school_name:      sc.name,
    distance_to_nearest_supermarket_miles: sm.miles, nearest_supermarket_name: sm.name,
    distance_to_nearest_pharmacy_miles:    ph.miles, nearest_pharmacy_name:    ph.name,
  }
}

/**
 * Start fetching amenities in the background and cache the promise.
 * Call this as soon as lat/lon is known (e.g. on postcode select in
 * Predict.jsx) so the data is ready by the time Results.jsx mounts.
 */
export function prefetchAmenities(lat, lon) {
  const key = `${lat},${lon}`
  if (!_cache.has(key)) {
    _cache.set(key, _doFetch(lat, lon))
  }
}

/**
 * Returns cached amenity distances + names (starts fetch if not yet cached).
 * If prefetchAmenities() was already called for these coordinates the
 * returned promise resolves immediately with the cached result.
 */
export async function getAmenityDistances(lat, lon) {
  const key = `${lat},${lon}`
  if (!_cache.has(key)) {
    _cache.set(key, _doFetch(lat, lon))
  }
  return _cache.get(key)
}
