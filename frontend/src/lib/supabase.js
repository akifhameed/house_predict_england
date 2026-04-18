import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

/* ─── Prediction history ─────────────────────────────────── */

/**
 * Save a prediction for the currently logged-in user.
 * Throws if not authenticated.
 */
export async function savePrediction(record) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('saved_predictions')
    .insert({
      user_id:         user.id,
      postcode:        record.postcode,
      property_type:   record.property_type,
      predicted_price: record.predicted_price,
      price_low:       record.price_low,
      price_high:      record.price_high,
      inputs:          record.inputs ?? {},
      contributions:   record.contributions ?? [],
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch all saved predictions for the current user, newest first.
 */
export async function getHistory() {
  const { data, error } = await supabase
    .from('saved_predictions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
}

/**
 * Delete a single saved prediction by id.
 */
export async function removePrediction(id) {
  await supabase.from('saved_predictions').delete().eq('id', id)
}

/**
 * Delete all saved predictions for the current user.
 */
export async function clearHistory() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('saved_predictions').delete().eq('user_id', user.id)
}
