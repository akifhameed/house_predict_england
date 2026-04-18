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
async function findNearest(lat, lon, tagKey, tagValue, radius = 3000) {
  const query = `
    [out:json][timeout:12];
    (
      node["${tagKey}"="${tagValue}"](around:${radius},${lat},${lon});
      way["${tagKey}"="${tagValue}"](around:${radius},${lat},${lon});
    );
    out center 1;
  `
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(query),
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.elements || data.elements.length === 0) return null
  const el = data.elements[0]
  const elLat = el.lat ?? el.center?.lat
  const elLon = el.lon ?? el.center?.lon
  if (elLat == null || elLon == null) return null
  return haversine(lat, lon, elLat, elLon)
}

/**
 * Fetch real amenity distances from Overpass API (OpenStreetMap).
 * Falls back to sensible defaults if Overpass is slow / unreachable.
 */
export async function getAmenityDistances(lat, lon) {
  const [station, school, park] = await Promise.allSettled([
    findNearest(lat, lon, 'railway', 'station'),
    findNearest(lat, lon, 'amenity', 'school'),
    findNearest(lat, lon, 'leisure', 'park'),
  ])

  return {
    distance_to_nearest_station_miles:
      station.status === 'fulfilled' && station.value != null
        ? +station.value.toFixed(3)
        : 0.5,
    distance_to_nearest_school_miles:
      school.status === 'fulfilled' && school.value != null
        ? +school.value.toFixed(3)
        : 0.3,
    distance_to_nearest_park_miles:
      park.status === 'fulfilled' && park.value != null
        ? +park.value.toFixed(3)
        : 0.2,
  }
}
