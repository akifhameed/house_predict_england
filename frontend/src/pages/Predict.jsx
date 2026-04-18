import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { predict as apiPredict, getImd } from '../lib/api'
import { autocomplete, lookup, extractModelFields } from '../lib/postcodes'
import { getAmenityDistances } from '../lib/overpass'

/* ── Tooltip component ── */
function Tooltip({ text }) {
  const [show, setShow] = useState(false)
  return (
    <span
      className="relative inline-flex items-center ml-1 cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="material-symbols-outlined text-on-surface-variant/50 hover:text-secondary transition-colors" style={{ fontSize: '16px' }}>
        info
      </span>
      {show && (
        <span
          className="absolute left-6 top-1/2 -translate-y-1/2 z-50 w-64 rounded-lg text-xs leading-relaxed font-body font-medium shadow-xl p-3"
          style={{ background: '#031634', color: '#d8e2ff', whiteSpace: 'normal' }}
        >
          {text}
        </span>
      )}
    </span>
  )
}

/* ── Static data ── */
const PROPERTY_TYPES = [
  { value: 'S', label: 'Semi-Detached House' },
  { value: 'D', label: 'Detached House' },
  { value: 'T', label: 'Terraced House' },
  { value: 'F', label: 'Flat / Apartment' },
  { value: 'O', label: 'Other' },
]

const AGE_BANDS = [
  'Unknown',
  'England and Wales: before 1900',
  'England and Wales: 1900-1929',
  'England and Wales: 1930-1949',
  'England and Wales: 1950-1966',
  'England and Wales: 1967-1975',
  'England and Wales: 1976-1982',
  'England and Wales: 1983-1990',
  'England and Wales: 1991-1995',
  'England and Wales: 1996-2002',
  'England and Wales: 2003-2006',
  'England and Wales: 2007-2011',
  'England and Wales: 2012 onwards',
]

function getEpcLetter(score) {
  if (score >= 92) return 'A'
  if (score >= 81) return 'B'
  if (score >= 69) return 'C'
  if (score >= 55) return 'D'
  if (score >= 39) return 'E'
  if (score >= 21) return 'F'
  return 'G'
}

const EPC_GRADIENT = {
  A: 'from-green-600 to-green-500',
  B: 'from-green-500 to-lime-400',
  C: 'from-lime-400 to-yellow-400',
  D: 'from-yellow-400 to-orange-400',
  E: 'from-orange-400 to-orange-500',
  F: 'from-orange-500 to-red-500',
  G: 'from-red-500 to-red-600',
}

const INITIAL_FORM = {
  property_type:     'S',
  tenure_type:       'F',
  is_new_build:      0,
  floor_area_sqm:    80,
  room_count:        4,
  construction_age_band: 'Unknown',
  current_epc_score: 67,
  // Postcode-resolved
  postcode:          '',
  postcode_district: '',
  region_code:       '',
  local_authority_code: '',
  latitude:          null,
  longitude:         null,
  imd_value:         15000,
  // Overpass-resolved
  distance_to_nearest_station_miles: null,
  distance_to_nearest_school_miles:  null,
  distance_to_nearest_park_miles:    null,
  // Auto
  bank_rate_at_sale_pct:         4.50,
  unemployment_rate_at_sale_pct: 4.20,
  sale_year:  new Date().getFullYear(),
  sale_month: new Date().getMonth() + 1,
}

export default function Predict() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [query, setQuery]           = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [lookupDone, setLookupDone]   = useState(false)
  const [amenitiesLoading, setAmenitiesLoading] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const dropdownRef = useRef(null)

  /* ── Postcode autocomplete (debounced 300ms) ── */
  useEffect(() => {
    if (lookupDone) return
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        const results = await autocomplete(query)
        setSuggestions(results)
      } else {
        setSuggestions([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, lookupDone])

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  /* ── Select a postcode from the dropdown ── */
  async function handlePostcodeSelect(postcode) {
    setQuery(postcode)
    setSuggestions([])
    setLookupDone(true)
    setAmenitiesLoading(true)
    setError('')
    try {
      const result = await lookup(postcode)
      const fields = extractModelFields(result)
      setForm(prev => ({ ...prev, ...fields, postcode }))
      // Fetch real IMD rank and amenity distances in parallel
      const [distances, imdRank] = await Promise.all([
        getAmenityDistances(fields.latitude, fields.longitude),
        getImd(fields.lsoa_code),
      ])
      setForm(prev => ({ ...prev, ...distances, imd_value: imdRank }))
    } catch (err) {
      setError('Could not look up postcode — please try another.')
      setLookupDone(false)
    } finally {
      setAmenitiesLoading(false)
    }
  }

  /* ── Form field helpers ── */
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  /* ── Submit ── */
  async function handleSubmit(e) {
    e.preventDefault()
    // ── Frontend validation ──
    if (!form.postcode_district) {
      setError('Please select a postcode from the suggestions before continuing.')
      return
    }
    const area = Number(form.floor_area_sqm)
    if (!area || area < 10 || area > 2000) {
      setError('Floor area must be between 10 m² and 2,000 m².')
      return
    }
    const rooms = Number(form.room_count)
    if (!rooms || rooms < 1 || rooms > 30) {
      setError('Room count must be between 1 and 30.')
      return
    }
    const epc = Number(form.current_epc_score)
    if (!epc || epc < 1 || epc > 100) {
      setError('EPC score must be between 1 and 100.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const payload = {
        property_type:          form.property_type,
        tenure_type:            form.tenure_type,
        is_new_build:           form.is_new_build,
        floor_area_sqm:         Number(form.floor_area_sqm),
        room_count:             Number(form.room_count),
        room_count_was_imputed: 0,
        construction_age_band:  form.construction_age_band,
        current_epc_score:      Number(form.current_epc_score),
        postcode_district:      form.postcode_district,
        local_authority_code:   form.local_authority_code || 'E09000032',
        region_code:            form.region_code          || 'E12000007',
        latitude:               form.latitude             ?? 51.5,
        longitude:              form.longitude            ?? -0.1,
        imd_value:              form.imd_value            ?? 15000,
        distance_to_nearest_school_miles:  form.distance_to_nearest_school_miles  ?? 0.3,
        distance_to_nearest_station_miles: form.distance_to_nearest_station_miles ?? 0.5,
        distance_to_nearest_park_miles:    form.distance_to_nearest_park_miles    ?? 0.2,
        sale_year:               form.sale_year,
        sale_month:              form.sale_month,
        bank_rate_at_sale_pct:         form.bank_rate_at_sale_pct,
        unemployment_rate_at_sale_pct: form.unemployment_rate_at_sale_pct,
      }
      const prediction = await apiPredict(payload)
      navigate('/results', { state: { prediction, formData: form } })
    } catch (err) {
      setError(`Prediction failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const epcLetter = getEpcLetter(form.current_epc_score)
  const propTypeLabel = PROPERTY_TYPES.find(p => p.value === form.property_type)?.label || ''

  return (
    <div className="bg-background text-on-background font-body antialiased">
      <Navbar />

      {/* ─── HERO BAND ─── */}
      <header
        className="w-full pt-32 pb-24 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #031634 0%, #1a2b4a 100%)' }}
      >
        <div className="absolute inset-0 dot-matrix" style={{ opacity: 0.1 }} />
        <div className="max-w-[1440px] mx-auto px-12 grid grid-cols-1 md:grid-cols-2 items-center relative z-10">
          <div>
            <span className="text-secondary-fixed font-bold tracking-widest text-xs uppercase mb-4 block font-label">
              Step-by-step Valuation
            </span>
            <h1 className="text-5xl md:text-6xl font-headline font-extrabold text-white tracking-tight mb-6">
              Predict Your Property's Value
            </h1>
            <p className="text-on-primary-container text-lg max-w-md">
              Three simple sections. Your postcode does the rest.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex justify-end items-center">
            <div className="flex items-center gap-6">
              {[
                { n: '1', label: 'Basics',   active: true },
                { n: '2', label: 'Location', active: false },
                { n: '3', label: 'Details',  active: false },
              ].map(({ n, label, active }, i) => (
                <div key={n} className="flex items-center gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${active ? 'bg-secondary text-on-secondary' : 'border-2 border-white/20 text-white'}`}>
                      {n}
                    </div>
                    <span className="text-xs text-white/60 font-medium">{label}</span>
                  </div>
                  {i < 2 && <div className="w-12 h-[2px] bg-white/10" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="max-w-[1440px] mx-auto px-12 py-16 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">
        <form onSubmit={handleSubmit} className="space-y-12">

          {/* SECTION 01: Property Basics */}
          <section className="bg-surface-container-lowest p-8 rounded-xl space-y-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-1 h-8 bg-secondary rounded-full" />
              <h2 className="text-2xl font-headline font-bold text-primary">01. Property Basics</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Property Type */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant block">Property Type</label>
                <select
                  value={form.property_type}
                  onChange={e => set('property_type', e.target.value)}
                  className="w-full bg-surface-container-highest rounded-lg p-4 font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  style={{ border: 'none' }}
                >
                  {PROPERTY_TYPES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Tenure */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant block">Tenure</label>
                <div className="flex bg-surface-container-highest rounded-lg p-1">
                  {[{ v: 'F', l: 'Freehold' }, { v: 'L', l: 'Leasehold' }].map(({ v, l }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set('tenure_type', v)}
                      className={`flex-1 py-3 px-4 rounded-md text-sm font-semibold transition-all ${form.tenure_type === v ? 'bg-white text-primary shadow-sm font-bold' : 'text-on-surface-variant'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Floor Area */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant block">Floor Area</label>
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    max="2000"
                    value={form.floor_area_sqm}
                    onChange={e => set('floor_area_sqm', e.target.value)}
                    className="w-full bg-surface-container-highest rounded-lg p-4 pr-14 font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    style={{ border: 'none' }}
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">m²</span>
                </div>
              </div>

              {/* Room Count */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant block">Number of Rooms</label>
                <div className="flex items-center bg-surface-container-highest rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => set('room_count', Math.max(1, form.room_count - 1))}
                    className="p-4 text-primary hover:bg-black/5 transition-colors"
                  >
                    <span className="material-symbols-outlined">remove</span>
                  </button>
                  <span className="flex-1 text-center font-bold text-primary text-lg">{form.room_count}</span>
                  <button
                    type="button"
                    onClick={() => set('room_count', Math.min(30, form.room_count + 1))}
                    className="p-4 text-primary hover:bg-black/5 transition-colors"
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
              </div>

              {/* New Build */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant block">New Build?</label>
                <div className="flex bg-surface-container-highest rounded-lg p-1">
                  {[{ v: 1, l: 'Yes — New Build' }, { v: 0, l: 'No — Existing' }].map(({ v, l }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set('is_new_build', v)}
                      className={`flex-1 py-3 px-4 rounded-md text-sm font-semibold transition-all ${form.is_new_build === v ? 'bg-white text-primary shadow-sm font-bold' : 'text-on-surface-variant'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 02: Location */}
          <section className="bg-surface-container-lowest p-8 rounded-xl space-y-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-1 h-8 bg-secondary rounded-full" />
              <h2 className="text-2xl font-headline font-bold text-primary">02. Location</h2>
            </div>

            <div className="space-y-2" ref={dropdownRef}>
              <label className="text-sm font-semibold text-on-surface-variant block">Postcode Search</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                <input
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setLookupDone(false) }}
                  placeholder="Start typing your postcode — e.g. E18, SW11…"
                  className="w-full bg-surface-container-highest rounded-lg p-4 pl-12 font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  style={{ border: 'none' }}
                  autoComplete="off"
                />

                {/* Autocomplete dropdown — absolutely positioned so it floats over page content */}
                {suggestions.length > 0 && (
                  <div
                    className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden z-50"
                    style={{ background: '#f3f4f6', borderTop: '4px solid #006c49', boxShadow: '0 8px 24px rgba(3,22,52,0.15)' }}
                  >
                    {suggestions.map(pc => (
                      <button
                        key={pc}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => handlePostcodeSelect(pc)}
                        className="w-full p-4 hover:bg-white cursor-pointer flex justify-between items-center transition-colors text-left"
                      >
                        <span className="font-bold text-primary">{pc}</span>
                        <span className="text-xs bg-secondary text-on-secondary px-2 py-0.5 rounded uppercase font-bold">Select</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-on-surface-variant/70 italic">
                Postcode data auto-fills region, local authority, coordinates and amenity distances.
              </p>

              {/* Loading amenities */}
              {amenitiesLoading && (
                <div className="flex items-center gap-2 text-secondary text-sm mt-2">
                  <span className="material-symbols-outlined animate-spin" style={{ animationDuration: '1s' }}>refresh</span>
                  Fetching nearby amenities…
                </div>
              )}

              {/* Auto-filled location chips */}
              {lookupDone && form.region_code && (
                <div className="flex flex-wrap gap-4 pt-4">
                  {[
                    { icon: 'map',              label: 'Region',          value: form.region_code },
                    { icon: 'account_balance',  label: 'Local Authority', value: form.local_authority_code },
                    { icon: 'location_on',      label: 'Coordinates',     value: form.latitude ? `${form.latitude.toFixed(4)}, ${form.longitude.toFixed(4)}` : '—' },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="bg-surface-variant/40 px-4 py-3 rounded-lg flex items-center gap-3">
                      <span className="material-symbols-outlined text-sm text-secondary">{icon}</span>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">{label}</span>
                        <span className="text-sm font-bold text-primary">{value}</span>
                      </div>
                    </div>
                  ))}
                  {form.distance_to_nearest_station_miles != null && (
                    <div className="bg-surface-variant/40 px-4 py-3 rounded-lg flex items-center gap-3">
                      <span className="material-symbols-outlined text-sm text-secondary">train</span>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Nearest Station</span>
                        <span className="text-sm font-bold text-primary">{form.distance_to_nearest_station_miles} mi</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* SECTION 03: Property Details */}
          <section className="bg-surface-container-lowest p-8 rounded-xl space-y-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-1 h-8 bg-secondary rounded-full" />
              <h2 className="text-2xl font-headline font-bold text-primary">03. Property Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Construction Age Band */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant flex items-center">
                  Construction Age Band
                  <Tooltip text="The decade your property was built, taken from its EPC certificate. This affects insulation standards, structural type and therefore value. Select 'Don't know' if you're unsure — it defaults to the most common band." />
                </label>
                <select
                  value={form.construction_age_band}
                  onChange={e => set('construction_age_band', e.target.value)}
                  className="w-full bg-surface-container-highest rounded-lg p-4 font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  style={{ border: 'none' }}
                >
                  {AGE_BANDS.map(band => (
                    <option key={band} value={band}>
                      {band === 'Unknown' ? "Don't know" : band.replace('England and Wales: ', '')}
                    </option>
                  ))}
                </select>
              </div>

              {/* EPC Score */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-on-surface-variant flex items-center">
                    EPC Energy Score
                    <Tooltip text="Energy Performance Certificate score from 1–100. A = 92–100 (most efficient), G = 1–20 (least efficient). Found on your EPC certificate or at epcregister.com. Higher scores typically add value, especially post-2023." />
                  </label>
                  <div className={`px-3 py-1 bg-gradient-to-r ${EPC_GRADIENT[epcLetter]} text-white rounded-full text-xs font-bold shadow-sm`}>
                    {form.current_epc_score} — Rating {epcLetter}
                  </div>
                </div>
                {/* Slider: visual gradient bar with invisible range input overlaid on top */}
                <div className="relative h-6 flex items-center">
                  {/* Visual gradient track */}
                  <div
                    className="absolute left-0 right-0 h-4 rounded-full pointer-events-none"
                    style={{ background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)' }}
                  >
                    {/* Visual thumb */}
                    <div
                      className="absolute w-6 h-6 bg-white border-4 border-primary rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-md"
                      style={{ left: `${form.current_epc_score}%` }}
                    />
                  </div>
                  {/* Transparent range input sits on top and captures all drag events */}
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={form.current_epc_score}
                    onChange={e => set('current_epc_score', Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-on-surface-variant font-bold uppercase">
                  <span>G (1)</span><span>F</span><span>E</span><span>D</span><span>C</span><span>B</span><span>A (100)</span>
                </div>
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="bg-error-container text-on-error-container px-6 py-4 rounded-xl text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-secondary text-white py-6 rounded-xl flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.99] transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin" style={{ animationDuration: '1s' }}>refresh</span>
                <span className="text-xl font-headline font-extrabold uppercase tracking-widest">Running Model…</span>
              </>
            ) : (
              <>
                <span className="text-xl font-headline font-extrabold uppercase tracking-widest">Get the Price</span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">trending_up</span>
              </>
            )}
          </button>
        </form>

        {/* ─── STICKY SIDEBAR ─── */}
        <aside>
          <div className="sticky top-28 bg-surface-container-lowest p-8 rounded-xl" style={{ boxShadow: '0px 2px 12px rgba(25,28,30,0.06)', borderTop: '8px solid #031634' }}>
            <h3 className="text-lg font-headline font-bold text-primary mb-8 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container">fact_check</span>
              Your Property Summary
            </h3>
            <div className="space-y-5">
              {[
                { label: 'Property Type', value: propTypeLabel || '—' },
                { label: 'Tenure',        value: form.tenure_type === 'F' ? 'Freehold' : 'Leasehold' },
                { label: 'Postcode',      value: form.postcode || '—', highlight: true },
                { label: 'Floor Area',    value: form.floor_area_sqm ? `${form.floor_area_sqm} m²` : '—' },
                { label: 'Rooms',         value: form.room_count },
                { label: 'Age Band',      value: form.construction_age_band === 'Unknown' ? "Don't know" : form.construction_age_band.replace('England and Wales: ', '') },
                { label: 'EPC Score',     value: `${form.current_epc_score} (${epcLetter})` },
                { label: 'New Build',     value: form.is_new_build ? 'Yes' : 'No' },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">{label}</span>
                  <span className={`font-bold ${highlight ? 'text-secondary' : 'text-primary'}`}>{value}</span>
                </div>
              ))}
            </div>

            <div className="my-8 h-[2px] bg-surface-container" />

            <div className="bg-surface-container-low p-6 rounded-lg text-center" style={{ border: '2px dashed #c5c6cf' }}>
              <span className="material-symbols-outlined text-3xl text-outline-variant mb-2 block">lock</span>
              <p className="text-[10px] uppercase font-bold text-outline tracking-[0.2em] mb-1">Predicted Value</p>
              <div className="text-4xl font-headline font-black text-outline-variant tracking-tighter">— — —</div>
              <p className="text-[10px] text-on-surface-variant/60 mt-4 leading-relaxed">
                Submit the form to unlock your AI valuation.
              </p>
            </div>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  )
}
