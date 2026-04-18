const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

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

/** Query Overpass for the nearest element matching a tag, within `radius` metres */
async function findNearest(lat, lon, query, radius = 5000) {
  const fullQuery = `
    [out:json][timeout:15];
    (
      ${query.replace(/RADIUS/g, radius).replace(/LAT/g, lat).replace(/LON/g, lon)}
    );
    out center 5;
  `
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 16000) // 16 s JS-side cap
  let res
  try {
    res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(fullQuery),
      signal: controller.signal,
    })
  } catch {
    return null // aborted or network error → use fallback
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) return null
  const data = await res.json()
  if (!data.elements || data.elements.length === 0) return null

  // Find the closest element from up to 5 results
  let minDist = Infinity
  for (const el of data.elements) {
    const elLat = el.lat ?? el.center?.lat
    const elLon = el.lon ?? el.center?.lon
    if (elLat == null || elLon == null) continue
    const d = haversine(lat, lon, elLat, elLon)
    if (d < minDist) minDist = d
  }
  return minDist === Infinity ? null : minDist
}

/**
 * Fetch real amenity distances from Overpass API (OpenStreetMap).
 * Falls back to sensible defaults if Overpass is slow / unreachable.
 */
export async function getAmenityDistances(lat, lon) {
  // Station query
  const stationQuery = `
    node["railway"="station"](around:RADIUS,LAT,LON);
    way["railway"="station"](around:RADIUS,LAT,LON);
  `

  // School query
  const schoolQuery = `
    node["amenity"="school"](around:RADIUS,LAT,LON);
    way["amenity"="school"](around:RADIUS,LAT,LON);
  `

  const [station, school] = await Promise.allSettled([
    findNearest(lat, lon, stationQuery),
    findNearest(lat, lon, schoolQuery),
  ])

  return {
    distance_to_nearest_station_miles:
      station.status === 'fulfilled' && station.value != null
        ? +station.value.toFixed(3)
        : null,                          // null = not found, caller decides fallback
    distance_to_nearest_school_miles:
      school.status === 'fulfilled' && school.value != null
        ? +school.value.toFixed(3)
        : null,
  }
}
