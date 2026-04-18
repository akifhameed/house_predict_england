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
    out center 10;
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
    return null // aborted or network error
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) return null
  const data = await res.json()
  if (!data.elements || data.elements.length === 0) return null

  // Find the closest element from up to 10 results
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
 * All queries run in parallel; returns null for any that time-out or aren't found.
 */
export async function getAmenityDistances(lat, lon) {

  // Station — covers full stations AND smaller halts (many UK suburban stations
  // are tagged railway=halt, e.g. Turkey Street, Southbury Road, etc.)
  const stationQuery = `
    node["railway"~"station|halt"](around:RADIUS,LAT,LON);
    way["railway"~"station|halt"](around:RADIUS,LAT,LON);
    node["public_transport"="station"](around:RADIUS,LAT,LON);
  `

  // School
  const schoolQuery = `
    node["amenity"="school"](around:RADIUS,LAT,LON);
    way["amenity"="school"](around:RADIUS,LAT,LON);
  `

  // Supermarket / grocery store
  const supermarketQuery = `
    node["shop"~"supermarket|convenience"](around:RADIUS,LAT,LON);
    way["shop"~"supermarket|convenience"](around:RADIUS,LAT,LON);
  `

  // Pharmacy
  const pharmacyQuery = `
    node["amenity"="pharmacy"](around:RADIUS,LAT,LON);
    way["amenity"="pharmacy"](around:RADIUS,LAT,LON);
  `

  const [station, school, supermarket, pharmacy] = await Promise.allSettled([
    findNearest(lat, lon, stationQuery),
    findNearest(lat, lon, schoolQuery),
    findNearest(lat, lon, supermarketQuery),
    findNearest(lat, lon, pharmacyQuery),
  ])

  const pick = (result) =>
    result.status === 'fulfilled' && result.value != null
      ? +result.value.toFixed(2)
      : null

  return {
    distance_to_nearest_station_miles:    pick(station),
    distance_to_nearest_school_miles:     pick(school),
    distance_to_nearest_supermarket_miles: pick(supermarket),
    distance_to_nearest_pharmacy_miles:    pick(pharmacy),
  }
}
