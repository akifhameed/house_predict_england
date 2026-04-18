const BASE = 'https://api.postcodes.io'

/** ONS standard region name → ONS region code */
export const REGION_CODE_MAP = {
  'North East':                 'E12000001',
  'North West':                 'E12000002',
  'Yorkshire and The Humber':   'E12000003',
  'East Midlands':              'E12000004',
  'West Midlands':              'E12000005',
  'East of England':            'E12000006',
  'London':                     'E12000007',
  'South East':                 'E12000008',
  'South West':                 'E12000009',
}

/**
 * Autocomplete: returns array of postcode strings matching the query.
 * postcodes.io GET /postcodes?q={query}&limit=8
 */
export async function autocomplete(query) {
  if (!query || query.trim().length < 2) return []
  try {
    const res = await fetch(
      `${BASE}/postcodes?q=${encodeURIComponent(query.trim())}&limit=8`
    )
    if (!res.ok) return []
    const data = await res.json()
    // postcodes.io returns an array of full postcode objects — extract just the string
    const raw = data.result || []
    return raw.map(r => (typeof r === 'string' ? r : r.postcode)).filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Full lookup for a postcode.
 * Returns the postcodes.io result object with:
 *   outcode, latitude, longitude, region, codes.admin_district, lsoa
 */
export async function lookup(postcode) {
  const clean = postcode.replace(/\s+/g, '')
  const res = await fetch(`${BASE}/postcodes/${encodeURIComponent(clean)}`)
  if (!res.ok) throw new Error(`Postcode not found: ${postcode}`)
  const data = await res.json()
  return data.result
}

/**
 * Extract the fields our model needs from a postcodes.io result object.
 */
export function extractModelFields(result) {
  const regionName = result.region || 'London'
  const regionCode = REGION_CODE_MAP[regionName] || 'E12000007'
  const laCode     = result.codes?.admin_district || 'E09000032'
  // postcodes.io returns the LSOA code which maps to IMD rank
  const lsoaCode   = result.codes?.lsoa || null
  return {
    postcode_district:      result.outcode || result.postcode?.split(' ')[0] || 'SW1A',
    region_code:            regionCode,
    local_authority_code:   laCode,
    latitude:               result.latitude,
    longitude:              result.longitude,
    lsoa_code:              lsoaCode,
    // resolved via backend /imd/{lsoa_code} after postcode lookup
    imd_value:              15000,
  }
}
