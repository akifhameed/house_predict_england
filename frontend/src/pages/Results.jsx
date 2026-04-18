import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Navigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { savePrediction, getHistory, removePrediction, clearHistory } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getAmenityDistances } from '../lib/overpass'

const LOG_RMSE = 0.2408

/* ── Display-name map for raw feature names ── */
const FEATURE_NAMES = {
  floor_area_sqm:                     'Floor Area (m²)',
  latitude:                           'Latitude',
  longitude:                          'Longitude',
  current_epc_score:                  'EPC Energy Score',
  imd_value:                          'Deprivation Index (IMD)',
  distance_to_nearest_station_miles:  'Distance to Station',
  distance_to_nearest_school_miles:   'Distance to School',
  distance_to_nearest_park_miles:     'Distance to Park',
  bank_rate_at_sale_pct:              'Bank of England Rate',
  unemployment_rate_at_sale_pct:      'Unemployment Rate',
  room_count:                         'Room Count',
  sale_year:                          'Sale Year',
  sale_month:                         'Sale Month',
  is_new_build:                       'New Build Status',
  property_type:                      'Property Type',
  tenure_type:                        'Tenure Type',
  construction_age_band:              'Construction Era',
  region_code:                        'Region',
  local_authority_code:               'Local Authority',
  postcode_district:                  'Postcode District',
  room_count_was_imputed:             'Room Count (Imputed)',
}

const PROPERTY_LABELS = { D: 'Detached', S: 'Semi-Detached', T: 'Terraced', F: 'Flat', O: 'Other' }
const TENURE_LABELS   = { F: 'Freehold', L: 'Leasehold' }

function fmt(n) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()

  // All hooks MUST be called unconditionally before any early return
  const { user }              = useAuth()
  const [history, setHistory] = useState([])
  const [saved,   setSaved]   = useState(false)
  const [savedId, setSavedId] = useState(null)
  const [saving,  setSaving]  = useState(false)

  const prediction = location.state?.prediction
  const formData   = location.state?.formData

  /* ── Amenity distances — fetched in background on Results page ── */
  const [amenities, setAmenities]               = useState(null)
  const [amenitiesLoading, setAmenitiesLoading] = useState(true)
  const [amenitiesFailed, setAmenitiesFailed]   = useState(false)

  function fetchAmenities() {
    if (!formData?.latitude || !formData?.longitude) {
      setAmenitiesLoading(false)
      return () => {}
    }
    setAmenitiesLoading(true)
    setAmenitiesFailed(false)
    let live = true
    getAmenityDistances(formData.latitude, formData.longitude)
      .then(d => {
        if (!live) return
        setAmenities(d)
        setAmenitiesLoading(false)
        // If every value is null the request silently failed — flag it so the
        // user can see a Retry button instead of permanent "Not found" cards.
        const allNull = Object.values(d).every(v => v === null)
        setAmenitiesFailed(allNull)
      })
      .catch(() => {
        if (!live) return
        setAmenitiesLoading(false)
        setAmenitiesFailed(true)
      })
    return () => { live = false }
  }

  useEffect(fetchAmenities, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Load history from Supabase ── */
  useEffect(() => {
    let live = true
    if (user) {
      getHistory().then(rows => { if (live) setHistory(rows) })
    } else {
      setHistory([])
    }
    return () => { live = false }
  }, [user?.id])

  // Per-prediction contributions come directly from the /predict response
  const contributions = prediction?.feature_contributions || []

  // Redirect AFTER all hooks
  if (!location.state) {
    return <Navigate to="/predict" replace />
  }

  /* ── Delete one history row ── */
  async function handleDelete(id) {
    await removePrediction(id)
    setHistory(prev => prev.filter(r => r.id !== id))
    if (id === savedId) { setSaved(false); setSavedId(null) }
  }

  /* ── Clear all history ── */
  async function handleClearAll() {
    await clearHistory()
    setHistory([])
    setSaved(false)
    setSavedId(null)
  }

  /* ── Share via WhatsApp ── */
  function shareWhatsApp() {
    const msg = [
      `🏠 *Property Valuation — ${formData.postcode}*`,
      ``,
      `Estimated Value: *${fmt(prediction.predicted_price)}*`,
      `Expected Range: ${fmt(typical_lo)} – ${fmt(typical_hi)}`,
      ``,
      `Property: ${propLabel} · ${formData.floor_area_sqm} m²`,
      `Tenure: ${tenureLabel}`,
      `EPC Score: ${formData.current_epc_score}`,
      ``,
      `Valuation by HousePredict`,
    ].join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  /* ── Share via Email ── */
  function shareEmail() {
    const subject = `Property Valuation — ${formData.postcode}`
    const body = [
      `Hi,`,
      ``,
      `Here are the results of my HousePredict property valuation:`,
      ``,
      `Postcode:        ${formData.postcode}`,
      `Estimated Value: ${fmt(prediction.predicted_price)}`,
      `Expected Range:  ${fmt(typical_lo)} – ${fmt(typical_hi)}`,
      ``,
      `Property Type:   ${propLabel}`,
      `Floor Area:      ${formData.floor_area_sqm} m²`,
      `Tenure:          ${tenureLabel}`,
      `EPC Score:       ${formData.current_epc_score}`,
      `Construction:    ${ageBandDisplay}`,
      ``,
      `Valuation provided by HousePredict`,
    ].join('\n')
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  /* ── Save prediction ── */
  async function handleSave() {
    if (!user) { navigate('/login'); return }
    setSaving(true)
    try {
      const entry = await savePrediction({
        postcode:        formData.postcode,
        property_type:   PROPERTY_LABELS[formData.property_type] || formData.property_type,
        predicted_price: prediction.predicted_price,
        price_low:       typical_lo,
        price_high:      typical_hi,
        inputs:          { floor_area_sqm: formData.floor_area_sqm },
        contributions:   contributions,
      })
      setHistory(prev => [entry, ...prev])
      setSaved(true)
      setSavedId(entry.id)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  /* ── 68% Typical Range — ±1σ in log-space, back-transformed ── */
  const logPred    = prediction.log_prediction
  const typical_lo = Math.round(Math.expm1(logPred - LOG_RMSE))
  const typical_hi = Math.round(Math.expm1(logPred + LOG_RMSE))

  const propLabel      = PROPERTY_LABELS[formData.property_type] || formData.property_type
  const tenureLabel    = TENURE_LABELS[formData.tenure_type]     || formData.tenure_type
  const ageBandDisplay = formData.construction_age_band === 'Unknown'
    ? 'Not available'
    : (formData.construction_age_band || '').replace('England and Wales: ', '')

  return (
    <div className="bg-background text-on-background font-body antialiased">
      <Navbar />
      <main className="pt-16 min-h-screen">

        {/* ─── HERO BAND ─── */}
        <section
          className="relative w-full py-16 px-8 overflow-hidden text-white"
          style={{ background: 'linear-gradient(135deg, #031634 0%, #1a2b4a 100%)' }}
        >
          <div className="absolute inset-0 dot-matrix" style={{ opacity: 0.12 }} />
          <div className="relative z-10 max-w-7xl mx-auto">

            {/* Full width */}
            <div className="space-y-6 max-w-3xl">
              <span className="inline-block px-3 py-1 bg-secondary text-white text-[10px] font-bold tracking-widest uppercase rounded font-label">
                Estimated Market Value · England
              </span>
              <h1 className="text-6xl font-headline font-extrabold tracking-tighter">
                {fmt(prediction.predicted_price)}
              </h1>
              <p className="text-primary-fixed-dim text-sm">
                {formData?.postcode && <span className="font-semibold text-white">{formData.postcode} · </span>}
                {propLabel} · Valued {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>

            </div>
          </div>
        </section>

        {/* ─── MAIN GRID ─── */}
        <section className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT 8-col */}
          <div className="lg:col-span-8 space-y-8">

            {/* Per-prediction Feature Contributions */}
            <div className="bg-surface-container-lowest rounded-xl p-8" style={{ boxShadow: '0px 2px 8px rgba(25,28,30,0.04)' }}>
              <h2 className="text-2xl font-headline font-extrabold text-primary mb-1">What's Driving This Valuation?</h2>
              <p className="text-sm text-on-surface-variant mb-2">
                The factors below are specific to <strong className="text-primary">{formData?.postcode || 'this property'}</strong> — each one shows how much it raised or lowered the estimated value.
              </p>
              <div className="flex items-center gap-4 mb-8 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#006c49' }} />
                  <span className="text-on-surface-variant">Added value</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#ba1a1a' }} />
                  <span className="text-on-surface-variant">Reduced value</span>
                </span>
              </div>

              {contributions.length > 0 ? (
                <div className="space-y-4">
                  {contributions.map(({ feature, contribution_pct, direction }) => {
                    const absVal = Math.abs(contribution_pct)
                    const isUp   = direction === 'up'
                    const maxPct = Math.abs(contributions[0]?.contribution_pct) || 1
                    const barWidth = Math.round((absVal / maxPct) * 100)
                    return (
                      <div key={feature} className="space-y-1.5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-semibold text-on-surface">{FEATURE_NAMES[feature] || feature}</span>
                          <span
                            className="font-bold tabular-nums"
                            style={{ color: isUp ? '#006c49' : '#ba1a1a' }}
                          >
                            {isUp ? '+' : '−'}{absVal.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${barWidth}%`,
                              background: isUp ? '#006c49' : '#ba1a1a',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">No contribution data available.</p>
              )}
              <p className="text-[10px] text-on-surface-variant/50 mt-6 leading-relaxed">
                Each factor's contribution is calculated specifically for this property — the same feature can add or reduce value depending on your location and property profile.
              </p>
            </div>

            {/* Local Context */}
            <div className="bg-surface-container-lowest rounded-xl p-8" style={{ boxShadow: '0px 2px 8px rgba(25,28,30,0.04)' }}>
              <h2 className="text-2xl font-headline font-extrabold text-primary mb-2">Location Snapshot</h2>
              <p className="text-sm text-on-surface-variant mb-6 flex flex-wrap items-center gap-2">
                <span>
                  Distances sourced live from OpenStreetMap for <strong className="text-primary">{formData?.postcode || 'this postcode'}</strong>.
                </span>
                {amenitiesLoading && (
                  <span className="inline-flex items-center gap-1 text-secondary text-xs font-semibold">
                    <span className="material-symbols-outlined animate-spin text-sm" style={{ animationDuration: '1s' }}>refresh</span>
                    Fetching nearby places…
                  </span>
                )}
                {!amenitiesLoading && amenitiesFailed && (
                  <button
                    onClick={fetchAmenities}
                    className="inline-flex items-center gap-1 text-xs font-bold text-secondary border border-secondary/40 rounded-full px-3 py-0.5 hover:bg-secondary/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Retry
                  </button>
                )}
              </p>
              {/* Satellite imagery strip */}
              {formData?.latitude && formData?.longitude && (() => {
                const lat = formData.latitude
                const lon = formData.longitude
                const dLon = 0.007, dLat = 0.005
                const bbox = `${(lon-dLon).toFixed(6)},${(lat-dLat).toFixed(6)},${(lon+dLon).toFixed(6)},${(lat+dLat).toFixed(6)}`
                const src  = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=800,260&format=png&f=image`
                return (
                  <div className="mb-4 rounded-lg overflow-hidden relative" style={{ height: '180px' }}>
                    <img
                      src={src}
                      alt={`Satellite view of ${formData.postcode}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* centre-pin marker */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full border-2 border-white shadow-lg" style={{ background: '#6cf8bb' }} />
                        <div className="w-0.5 h-3 bg-white shadow" />
                      </div>
                    </div>
                    <span className="absolute bottom-2 right-2 text-[9px] text-white/60 font-medium">
                      © Esri, Maxar, Earthstar Geographics
                    </span>
                  </div>
                )
              })()}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                {/* — OSM-sourced distances (loading → real value → "Not found") — */}
                {[
                  { distKey: 'distance_to_nearest_station_miles',     nameKey: 'nearest_station_name',     icon: 'train',          label: 'Nearest Station'  },
                  { distKey: 'distance_to_nearest_school_miles',      nameKey: 'nearest_school_name',      icon: 'school',         label: 'Nearest School'   },
                  { distKey: 'distance_to_nearest_supermarket_miles', nameKey: 'nearest_supermarket_name', icon: 'shopping_cart',  label: 'Supermarket'      },
                  { distKey: 'distance_to_nearest_pharmacy_miles',    nameKey: 'nearest_pharmacy_name',    icon: 'local_pharmacy', label: 'Pharmacy'         },
                ].map(({ distKey, nameKey, icon, label }) => (
                  <div key={distKey} className="bg-surface-container-low p-5 rounded-lg">
                    <span className="material-symbols-outlined text-secondary mb-2 block">{icon}</span>
                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider font-label mb-1">{label}</p>
                    {amenitiesLoading ? (
                      <p className="text-sm font-medium text-on-surface-variant animate-pulse">Fetching…</p>
                    ) : amenities?.[distKey] != null ? (
                      <>
                        <p className="text-lg font-headline font-bold text-primary leading-tight">{amenities[distKey]} mi</p>
                        {amenities[nameKey] && (
                          <p className="text-xs text-on-surface-variant mt-0.5 truncate" title={amenities[nameKey]}>
                            {amenities[nameKey]}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm font-medium text-on-surface-variant">Not found</p>
                    )}
                  </div>
                ))}

                {/* — Always-available context data — */}
                <div className="bg-surface-container-low p-5 rounded-lg">
                  <span className="material-symbols-outlined text-secondary mb-2 block">account_balance</span>
                  <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider font-label mb-1">Bank of England Rate</p>
                  <p className="text-lg font-headline font-bold text-primary">{formData.bank_rate_at_sale_pct}%</p>
                </div>

                <div className="bg-surface-container-low p-5 rounded-lg">
                  <span className="material-symbols-outlined text-secondary mb-2 block">bar_chart</span>
                  <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider font-label mb-1">Deprivation Rank (IMD)</p>
                  <p className="text-lg font-headline font-bold text-primary">
                    {formData.imd_value != null
                      ? `${formData.imd_value.toLocaleString('en-GB')} / 32,844`
                      : '—'}
                  </p>
                </div>

              </div>
            </div>

            {/* Property Details Submitted */}
            <div className="bg-surface-container-lowest rounded-xl p-8" style={{ boxShadow: '0px 2px 8px rgba(25,28,30,0.04)' }}>
              <h2 className="text-2xl font-headline font-extrabold text-primary mb-8">Valuation Input Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-12">
                {[
                  { label: 'Postcode',          value: formData.postcode     || '—' },
                  { label: 'Property Type',      value: propLabel },
                  { label: 'Floor Area',         value: `${formData.floor_area_sqm} m²` },
                  { label: 'Rooms',              value: formData.room_count },
                  { label: 'Tenure',             value: tenureLabel },
                  { label: 'Construction Era',   value: ageBandDisplay },
                  { label: 'EPC Score',          value: formData.current_epc_score },
                  { label: 'New Build',          value: formData.is_new_build ? 'Yes' : 'No' },
                  { label: 'Valuation Date',     value: new Date(formData.sale_year, formData.sale_month - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 font-label">{label}</p>
                    <p className="font-bold text-primary">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT 4-col sticky */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">

              {/* Valuation Breakdown */}
              <div className="bg-surface-container-lowest rounded-xl p-8" style={{ boxShadow: '0px 2px 8px rgba(25,28,30,0.04)' }}>
                <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6 font-label">
                  Estimated Value
                </h3>
                <div className="p-6 rounded-lg mb-6" style={{ background: 'rgba(108,248,187,0.15)' }}>
                  <p className="text-xs font-bold text-on-secondary-container uppercase mb-1 font-label">Our Estimate</p>
                  <p className="text-3xl font-headline font-extrabold text-secondary">
                    {fmt(prediction.predicted_price)}
                  </p>
                </div>
                {/* Typical Range ±1σ */}
                <div className="rounded-lg p-4" style={{ background: 'rgba(0,108,73,0.08)', border: '1px solid rgba(0,108,73,0.2)' }}>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-3 font-label">
                    Expected Range
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-[9px] text-on-surface-variant uppercase font-bold mb-0.5">Low</p>
                      <p className="text-lg font-headline font-extrabold text-primary">{fmt(typical_lo)}</p>
                    </div>
                    <div className="flex-1 mx-3 h-[2px]" style={{ background: 'linear-gradient(to right, #006c49, #6cf8bb, #006c49)' }} />
                    <div className="text-center">
                      <p className="text-[9px] text-on-surface-variant uppercase font-bold mb-0.5">High</p>
                      <p className="text-lg font-headline font-extrabold text-primary">{fmt(typical_hi)}</p>
                    </div>
                  </div>
                  <p className="text-[9px] text-on-surface-variant/50 mt-3 leading-relaxed">
                    Most comparable properties transact within this range.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/predict')}
                  className="w-full bg-secondary text-white py-4 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  Predict Another Property
                </button>

                {user ? (
                  <button
                    onClick={handleSave}
                    disabled={saved || saving}
                    className="w-full bg-surface-container-highest text-primary py-4 rounded-xl font-bold hover:bg-surface-container-high transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined">
                      {saving ? 'progress_activity' : saved ? 'check_circle' : 'bookmark'}
                    </span>
                    {saving ? 'Saving…' : saved ? 'Saved to History' : 'Save to History'}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="w-full bg-surface-container-highest text-primary py-4 rounded-xl font-bold hover:bg-surface-container-high transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">login</span>
                    Sign in to Save
                  </Link>
                )}

                {/* Share row */}
                <div className="pt-1">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 text-center">
                    Share this valuation
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={shareWhatsApp}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 active:scale-95 transition-all"
                      style={{ background: '#25D366' }}
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.118 1.523 5.847L0 24l6.344-1.508A11.948 11.948 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.374l-.36-.213-3.767.896.953-3.671-.234-.376A9.818 9.818 0 1112 21.818z"/>
                      </svg>
                      WhatsApp
                    </button>

                    <button
                      onClick={shareEmail}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-surface-container text-primary hover:bg-surface-container-high active:scale-95 transition-all border border-outline-variant"
                    >
                      <span className="material-symbols-outlined text-base">mail</span>
                      Email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── PREDICTION HISTORY ─── */}
        <section className="max-w-7xl mx-auto px-8 pb-24">
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden" style={{ boxShadow: '0px 2px 8px rgba(25,28,30,0.04)' }}>
            <div
              className="p-8 flex justify-between items-center"
              style={{ borderBottom: '1px solid #edeef0' }}
            >
              <h2 className="text-2xl font-headline font-extrabold text-primary">Previous Valuations</h2>
              {history.length > 0 && (
                <div className="flex items-center gap-4">
                  <span className="text-secondary font-bold text-sm">{history.length} record{history.length !== 1 ? 's' : ''}</span>
                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-1 text-xs font-bold text-error hover:text-error/80 transition-colors px-3 py-1.5 rounded-lg hover:bg-error-container transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">delete_sweep</span>
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {history.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl text-outline-variant mb-4 block">history</span>
                <p className="font-semibold">No saved valuations yet.</p>
                <p className="text-sm mt-1">
                  {user
                    ? 'Click "Save to History" to keep a record of this valuation.'
                    : <><Link to="/login" className="text-secondary font-bold hover:underline">Sign in</Link> to save and revisit your valuations.</>
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label">
                    <tr>
                      {['Date', 'Postcode', 'Type', 'Floor Area', 'Prediction', 'PI Range', ''].map(h => (
                        <th key={h} className="px-6 py-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(row => (
                      <tr
                        key={row.id}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid #edeef0' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <td className="px-6 py-5 text-sm">{fmtDate(row.created_at)}</td>
                        <td className="px-6 py-5 text-sm font-bold">{row.postcode || '—'}</td>
                        <td className="px-6 py-5 text-sm">{row.property_type || '—'}</td>
                        <td className="px-6 py-5 text-sm">{row.inputs?.floor_area_sqm ? `${row.inputs.floor_area_sqm} m²` : '—'}</td>
                        <td className="px-6 py-5 text-sm font-bold text-secondary">{fmt(row.predicted_price)}</td>
                        <td className="px-6 py-5 text-sm text-on-surface-variant">
                          {fmt(row.price_low)} – {fmt(row.price_high)}
                        </td>
                        <td className="px-6 py-5">
                          <button
                            onClick={() => handleDelete(row.id)}
                            title="Remove this record"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container transition-all"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}
