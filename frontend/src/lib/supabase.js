/**
 * Prediction history storage.
 *
 * Currently uses localStorage as a zero-config stub.
 * To upgrade to Supabase, replace the two functions below with:
 *
 *   import { createClient } from '@supabase/supabase-js'
 *   const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
 *
 * and replace savePrediction / getHistory with Supabase insert / select.
 */

const STORAGE_KEY = 'housepredict_history'

/**
 * Save a prediction record to history.
 * @param {Object} record  { postcode, property_type, floor_area_sqm,
 *                           predicted_price, confidence_low, confidence_high }
 */
export function savePrediction(record) {
  const history = getHistory()
  const entry = {
    id: Date.now(),
    created_at: new Date().toISOString(),
    ...record,
  }
  history.unshift(entry)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50)))
  } catch {
    // localStorage full — ignore
  }
  return entry
}

/**
 * Retrieve all saved predictions (newest first).
 * @returns {Array}
 */
export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * Remove a single prediction record by id.
 * @param {number} id
 */
export function removePrediction(id) {
  const updated = getHistory().filter(r => r.id !== id)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch { }
}

/**
 * Clear all prediction history.
 */
export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY)
}
