// Primary and fallback Overpass endpoints — if the main server is overloaded
// the fallback (kumi) is often available.
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

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

/** Return the distance in miles to the nearest element in an array, or null */
function nearestMiles(lat, lon, elements) {
  let best = Infinity
  for (const el of elements) {
    const elLat = el.lat ?? el.center?.lat
    const elLon = el.lon ?? el.center?.lon
    if (elLat == null || elLon == null) continue
    const d = haversine(lat, lon, elLat, elLon)
    if (d < best) best = d
  }
  return best === Infinity ? null : +best.toFixed(2)
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

/**
 * Fetch all amenity distances in ONE Overpass request.
 *
 * Tries the primary Overpass server first; if that fails or times out,
 * automatically retries on a mirror server. This handles the common case
 * where overpass-api.de is temporarily overloaded.
 */
export async function getAmenityDistances(lat, lon) {
  const radius = 5000     // 5 km for stations/schools
  const nearRadius = 2000 // 2 km for shops/pharmacies (more urban)

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

  const NULL_RESULT = {
    distance_to_nearest_station_miles:     null,
    distance_to_nearest_school_miles:      null,
    distance_to_nearest_supermarket_miles: null,
    distance_to_nearest_pharmacy_miles:    null,
  }

  let els = null

  // Try each endpoint in order; stop as soon as one succeeds
  for (const url of OVERPASS_URLS) {
    try {
      els = await tryFetch(url, query, 25000) // 25 s per attempt
      break
    } catch {
      // try next server
    }
  }

  if (!els) return NULL_RESULT

  // Partition elements by type using their OSM tags
  const stations = els.filter(el =>
    el.tags?.railway === 'station' || el.tags?.railway === 'halt' ||
    el.tags?.public_transport === 'station'
  )
  const schools = els.filter(el => el.tags?.amenity === 'school')
  const supermarkets = els.filter(el =>
    el.tags?.shop === 'supermarket' || el.tags?.shop === 'convenience'
  )
  const pharmacies = els.filter(el => el.tags?.amenity === 'pharmacy')

  return {
    distance_to_nearest_station_miles:     nearestMiles(lat, lon, stations),
    distance_to_nearest_school_miles:      nearestMiles(lat, lon, schools),
    distance_to_nearest_supermarket_miles: nearestMiles(lat, lon, supermarkets),
    distance_to_nearest_pharmacy_miles:    nearestMiles(lat, lon, pharmacies),
  }
}
