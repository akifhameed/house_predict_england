const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * POST /predict — send 21-feature payload, receive price + CI
 */
export async function predict(payload) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Prediction failed (${res.status})`)
  }
  return res.json()
}

/**
 * GET /imd/{lsoaCode} — real IMD rank for a given LSOA
 * Falls back to 15000 (national median) if not found or backend missing data
 */
export async function getImd(lsoaCode) {
  if (!lsoaCode) return 15000
  try {
    const res = await fetch(`${API_BASE}/imd/${encodeURIComponent(lsoaCode)}`)
    if (!res.ok) return 15000
    const data = await res.json()
    return data.imd_rank ?? 15000
  } catch {
    return 15000
  }
}

/**
 * GET /feature-importance — top 20 features by gain
 * Returns: { features: [{ feature, gain_pct, split_pct }] }
 */
export async function getFeatureImportance() {
  const res = await fetch(`${API_BASE}/feature-importance`)
  if (!res.ok) throw new Error(`Feature importance failed (${res.status})`)
  return res.json()
}

/**
 * GET /health
 */
export async function healthCheck() {
  const res = await fetch(`${API_BASE}/health`)
  if (!res.ok) throw new Error('Backend unreachable')
  return res.json()
}
