import { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

/* ── Three factor categories with visual data ── */
const FACTOR_CATEGORIES = [
  {
    id: 'property',
    icon: 'home',
    title: 'The Property',
    subtitle: 'Physical characteristics',
    color: '#006c49',
    bgLight: 'rgba(0,108,73,0.08)',
    border: 'rgba(0,108,73,0.2)',
    image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=700&q=80',
    insight: 'Floor area is the single strongest signal. A property\'s physical make-up — its size, type and energy efficiency — sets the baseline before location is even considered.',
    factorData: [
      { name: 'Floor Area',       icon: 'straighten',   impact: 95, level: 'High' },
      { name: 'Number of Rooms',  icon: 'meeting_room', impact: 62, level: 'High' },
      { name: 'Property Type',    icon: 'home',         impact: 55, level: 'High' },
      { name: 'Energy Rating',    icon: 'bolt',         impact: 42, level: 'Medium' },
      { name: 'Construction Era', icon: 'history_edu',  impact: 30, level: 'Medium' },
      { name: 'Tenure',           icon: 'key',          impact: 22, level: 'Low' },
      { name: 'New Build Status', icon: 'apartment',    impact: 14, level: 'Low' },
    ],
  },
  {
    id: 'location',
    icon: 'location_on',
    title: 'The Location',
    subtitle: 'Where the property sits',
    color: '#031634',
    bgLight: 'rgba(3,22,52,0.06)',
    border: 'rgba(3,22,52,0.15)',
    image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=700&q=80',
    insight: 'Location drives the majority of price variation. Two identical homes a mile apart can differ by six figures — which is why we use your precise postcode coordinates, not just a city name.',
    factorData: [
      { name: 'Exact Coordinates', icon: 'location_on',  impact: 95, level: 'High' },
      { name: 'Postcode District', icon: 'mail',         impact: 80, level: 'High' },
      { name: 'Borough & Region',  icon: 'map',          impact: 62, level: 'High' },
      { name: 'Deprivation Rank',  icon: 'bar_chart',    impact: 42, level: 'Medium' },
      { name: 'Station Distance',  icon: 'train',        impact: 34, level: 'Medium' },
      { name: 'School Proximity',  icon: 'school',       impact: 26, level: 'Low' },
      { name: 'Nearest Green Space', icon: 'park',       impact: 16, level: 'Low' },
    ],
  },
  {
    id: 'market',
    icon: 'trending_up',
    title: 'Market Conditions',
    subtitle: 'Economic context at time of sale',
    color: '#1a2b4a',
    bgLight: 'rgba(26,43,74,0.06)',
    border: 'rgba(26,43,74,0.15)',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=700&q=80',
    insight: 'The wider economy shapes what buyers can afford. Rising interest rates cool demand and compress prices — so your valuation reflects today\'s conditions, not last year\'s.',
    factorData: [
      { name: 'Interest Rates',    icon: 'percent',        impact: 75, level: 'High' },
      { name: 'Year of Valuation', icon: 'calendar_today', impact: 60, level: 'High' },
      { name: 'Unemployment Rate', icon: 'work',           impact: 28, level: 'Medium' },
      { name: 'Season of Sale',    icon: 'wb_sunny',       impact: 16, level: 'Low' },
    ],
  },
]

const LEVEL_STYLE = {
  High:   { bg: 'rgba(0,108,73,0.10)',   color: '#006c49' },
  Medium: { bg: 'rgba(234,128,0,0.10)',  color: '#b45309' },
  Low:    { bg: 'rgba(68,71,78,0.08)',   color: '#44474e' },
}

const STEPS = [
  { n: '01', title: 'Enter your postcode',        caption: 'Start typing and select your postcode from the dropdown. Your region, local authority and coordinates are filled in automatically — no manual entry needed.' },
  { n: '02', title: 'Describe your property',     caption: 'Tell us the property type, tenure, floor area, number of rooms, energy rating and construction era. Takes under a minute.' },
  { n: '03', title: 'Location data fetched live', caption: 'Distances to your nearest station, school and green space are retrieved in real time from OpenStreetMap at the moment of your valuation.' },
  { n: '04', title: 'Your estimate arrives',      caption: 'All inputs are weighed together to produce your estimated market value and an expected price range, with a full breakdown of contributing factors.' },
]

export default function HowItWorks() {
  const [activeCategory, setActiveCategory] = useState('property')
  const active = FACTOR_CATEGORIES.find(c => c.id === activeCategory)

  return (
    <div className="bg-background text-on-background font-body antialiased">
      <Navbar />
      <main className="pt-[72px]">

        {/* ─── HERO ─── */}
        <section className="bg-primary text-on-primary py-24 px-8 overflow-hidden">
          <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-16">
            <div className="w-full md:w-1/2 space-y-8">
              <span className="text-secondary font-bold tracking-widest uppercase text-xs block font-label">
                How It Works
              </span>
              <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
                From Postcode<br />
                to{' '}
                <span style={{ color: '#6ffbbe' }}>Valuation.</span>
              </h1>
              <p className="text-lg text-primary-fixed-dim max-w-xl leading-relaxed">
                HousePredict analyses your property against millions of real sales across England,
                weighing every relevant factor — from your energy rating to proximity to transport —
                to produce a precise, evidence-based market estimate.
              </p>
              <div className="flex flex-wrap gap-4">
                {[
                  { value: '4.5M+', label: 'Sales records studied' },
                  { value: '620K',  label: 'Independent checks' },
                  { value: 'Live',  label: 'Location data' },
                ].map(({ value, label }) => (
                  <div key={label} className="bg-primary-container px-6 py-4 rounded-xl flex items-center gap-4">
                    <span className="text-3xl font-bold text-on-primary font-headline">{value}</span>
                    <span className="text-xs uppercase tracking-widest text-on-primary-container leading-tight font-label">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div className="w-full md:w-1/2">
              <div className="p-10 rounded-3xl space-y-10" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}>
                {STEPS.map(({ n, title, caption }) => (
                  <div key={n} className="flex gap-6 items-start">
                    <span className="text-secondary-fixed font-bold text-xl font-headline pt-1 shrink-0">{n}</span>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
                      <p className="text-primary-fixed-dim text-sm">{caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── INTERACTIVE FACTOR EXPLORER ─── */}
        <section className="bg-surface-container-low py-24 px-8">
          <div className="max-w-screen-2xl mx-auto">

            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-primary font-headline">What goes into your valuation</h2>
              <p className="text-on-surface-variant mt-4 max-w-lg mx-auto">
                Every valuation weighs three groups of factors. Select a category to explore what influences the price.
              </p>
            </div>

            {/* ── Tab selector ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              {FACTOR_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex-1 flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-200 focus:outline-none font-semibold text-sm"
                  style={{
                    background: activeCategory === cat.id ? cat.color : '#ffffff',
                    color:      activeCategory === cat.id ? '#ffffff' : '#44474e',
                    boxShadow:  activeCategory === cat.id
                      ? `0 8px 24px rgba(0,0,0,0.15)`
                      : '0 2px 8px rgba(25,28,30,0.04)',
                  }}
                >
                  <span className="material-symbols-outlined text-xl">{cat.icon}</span>
                  <div className="text-left">
                    <p className="font-extrabold leading-none">{cat.title}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">{cat.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* ── Main panel ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

              {/* LEFT: Photo + insight card (2/5) */}
              <div className="lg:col-span-2 rounded-3xl overflow-hidden relative" style={{ minHeight: '480px' }}>
                <img
                  src={active.image}
                  alt={active.title}
                  className="absolute inset-0 w-full h-full object-cover transition-all duration-500"
                  onError={e => { e.target.style.display = 'none' }}
                />
                {/* Dark gradient overlay */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(3,22,52,0.92) 40%, rgba(3,22,52,0.30) 100%)' }} />

                {/* Category badge */}
                <div className="absolute top-6 left-6">
                  <span
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-bold backdrop-blur-sm"
                    style={{ background: active.color }}
                  >
                    <span className="material-symbols-outlined text-sm">{active.icon}</span>
                    {active.title}
                  </span>
                </div>

                {/* Bottom insight */}
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="material-symbols-outlined text-2xl shrink-0" style={{ color: '#6ffbbe' }}>tips_and_updates</span>
                    <p className="text-white text-sm leading-relaxed font-medium">{active.insight}</p>
                  </div>
                  {/* Quick stats */}
                  <div className="flex gap-3 mt-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                      <p className="text-white font-extrabold text-lg font-headline">{active.factorData.length}</p>
                      <p className="text-white/60 text-[9px] uppercase tracking-widest">Factors</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                      <p className="text-white font-extrabold text-lg font-headline">
                        {active.factorData.filter(f => f.level === 'High').length}
                      </p>
                      <p className="text-white/60 text-[9px] uppercase tracking-widest">High Impact</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-center flex-1">
                      <p className="font-extrabold text-lg font-headline" style={{ color: '#6ffbbe' }}>
                        {active.factorData[0].name}
                      </p>
                      <p className="text-white/60 text-[9px] uppercase tracking-widest">Top Signal</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Factor bar chart (3/5) */}
              <div className="lg:col-span-3 bg-white rounded-3xl p-8" style={{ boxShadow: '0 4px 24px rgba(25,28,30,0.06)' }}>
                {/* Legend */}
                <div className="flex items-center justify-between mb-8">
                  <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">
                    Factor Impact Analysis
                  </p>
                  <div className="flex items-center gap-3">
                    {['High', 'Medium', 'Low'].map(l => (
                      <span key={l} className="flex items-center gap-1.5 text-[10px] font-bold"
                        style={{ color: LEVEL_STYLE[l].color }}
                      >
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: LEVEL_STYLE[l].color }} />
                        {l}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bars */}
                <div className="space-y-5">
                  {active.factorData.map(({ name, icon, impact, level }) => {
                    const ls = LEVEL_STYLE[level]
                    return (
                      <div key={name}>
                        <div className="flex items-center gap-3 mb-2">
                          {/* Icon */}
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: ls.bg }}
                          >
                            <span className="material-symbols-outlined text-base" style={{ color: ls.color }}>{icon}</span>
                          </div>
                          {/* Label + badge */}
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-sm font-semibold text-primary">{name}</span>
                            <span
                              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full ml-2 shrink-0"
                              style={{ background: ls.bg, color: ls.color }}
                            >
                              {level} Impact
                            </span>
                          </div>
                        </div>
                        {/* Bar */}
                        <div className="flex items-center gap-3 pl-12">
                          <div className="flex-1 h-2.5 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${impact}%`, background: active.color }}
                            />
                          </div>
                          <span className="text-xs font-bold tabular-nums w-8 text-right" style={{ color: active.color }}>
                            {impact}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <p className="text-[10px] text-on-surface-variant/50 mt-8 leading-relaxed">
                  Relative influence scores are derived from the model's feature importance on the held-out test set. Higher scores indicate a stronger average impact on the final valuation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── HOW THE ENGINE WORKS ─── */}
        <section className="bg-white py-24 px-8">
          <div className="max-w-screen-2xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-secondary font-bold tracking-widest uppercase text-xs block font-label mb-3">The Valuation Engine</span>
              <h2 className="text-4xl font-bold text-primary font-headline">Transparent, consistent, evidence-based</h2>
            </div>

            <div className="flex flex-col md:flex-row items-stretch justify-between gap-8 mb-16">
              {[
                {
                  icon: 'dataset',
                  title: 'Data Foundation',
                  bullets: [
                    'Millions of verified residential sales across England',
                    'Linked to energy performance records for floor area and ratings',
                    'Enriched with live location and economic data',
                    'Strictly separated test set — no data leakage',
                  ],
                },
                {
                  icon: 'hub',
                  title: 'Valuation Engine',
                  bullets: [
                    'Trained on historical sales from 2018 to 2021',
                    'Validated on 2022 sales, tested on 2023–2024',
                    'Benchmarked independently against unseen transactions',
                    'Outperforms simpler models on structured property data',
                  ],
                },
                {
                  icon: 'price_check',
                  title: 'Your Result',
                  bullets: [
                    'Point estimate — the most probable market value',
                    'Expected range captures typical transaction spread',
                    "Each factor's contribution shown for your property",
                    'No two valuations produce the same factor weights',
                  ],
                },
              ].map(({ icon, title, bullets }, i, arr) => (
                <div key={title} className="flex items-stretch gap-8 flex-1">
                  <div className="flex-1 bg-surface-container-low p-8 rounded-2xl flex flex-col items-center text-center">
                    <span className="material-symbols-outlined text-secondary mb-4" style={{ fontSize: '2.5rem' }}>{icon}</span>
                    <h4 className="font-bold text-primary mb-4 font-headline">{title}</h4>
                    <ul className="text-sm space-y-2 text-on-surface-variant text-left w-full">
                      {bullets.map(b => (
                        <li key={b} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-secondary rounded-full mt-1.5 shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {i < arr.length - 1 && (
                    <span className="material-symbols-outlined text-surface-variant self-center hidden md:block" style={{ fontSize: '3rem' }}>chevron_right</span>
                  )}
                </div>
              ))}
            </div>

            {/* Why this approach */}
            <div
              className="p-8 rounded-3xl text-on-primary flex flex-col md:flex-row items-center gap-8 shadow-xl"
              style={{ background: 'linear-gradient(135deg, #031634, #1a2b4a)' }}
            >
              <div className="p-4 rounded-full shrink-0" style={{ background: 'rgba(111,251,190,0.1)' }}>
                <span className="material-symbols-outlined text-4xl" style={{ color: '#6ffbbe' }}>lightbulb</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 font-headline">Why this approach produces reliable valuations</h3>
                <p className="text-primary-fixed-dim text-sm leading-relaxed max-w-4xl">
                  Property data is highly structured — each transaction has a consistent set of attributes.
                  Our valuation engine is specifically suited to this kind of data, delivering higher accuracy
                  than approaches designed for images or free text. Crucially, it explains its reasoning:
                  every valuation comes with a breakdown of exactly which factors raised or lowered the
                  estimate for your specific property.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── ACCURACY & COVERAGE ─── */}
        <section className="bg-surface-container py-24 px-8">
          <div className="max-w-screen-2xl mx-auto">
            <div className="mb-12">
              <span className="text-secondary font-bold tracking-widest uppercase text-xs block font-label mb-3">Accuracy &amp; Coverage</span>
              <h2 className="text-4xl font-bold text-primary font-headline mb-2">
                Validated on 620,000 real sales
              </h2>
              <p className="text-on-surface-variant max-w-2xl">
                To ensure the engine performs on properties it has never seen, it was evaluated against
                a dedicated set of England residential sales from 2023 and 2024 — after all training was complete.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {[
                { label: 'Average price difference',        value: '£65,342', caption: 'Average gap between the estimated and actual recorded sale price on the test set' },
                { label: 'Median price error',              value: '14.75%',  caption: 'Half of all test estimates fell within this percentage of the actual sale price' },
                { label: 'Within 20% of actual sale price', value: '66.8%',   caption: 'Share of test valuations that fell within 20% of the real transaction price' },
                { label: 'Independent test sales used',     value: '620K',    caption: 'Real 2023–2024 transactions used only for accuracy measurement — never for training' },
              ].map(({ label, value, caption }) => (
                <div key={label} className="bg-surface-container-lowest p-8 rounded-2xl" style={{ boxShadow: '0px 2px 8px rgba(25,28,30,0.04)' }}>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest block mb-2 font-label">{label}</span>
                  <div className="text-4xl font-extrabold text-primary font-headline">{value}</div>
                  <p className="text-xs text-on-surface-variant mt-2">{caption}</p>
                </div>
              ))}
            </div>

            {/* Data split bar */}
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold text-on-surface-variant uppercase tracking-widest font-label">
                <span>How the data was used</span>
                <span>Total: 4.5M+ transactions</span>
              </div>
              <div className="w-full h-8 bg-surface-container-highest rounded-full flex overflow-hidden">
                <div className="h-full bg-primary flex items-center justify-center text-[10px] text-white font-bold" style={{ width: '68%' }}>TRAINING (3.1M)</div>
                <div className="h-full bg-secondary flex items-center justify-center text-[10px] text-white font-bold" style={{ width: '18%' }}>TUNING (800K)</div>
                <div className="h-full bg-secondary-fixed flex items-center justify-center text-[10px] text-on-secondary-fixed font-bold" style={{ width: '14%' }}>TESTING (620K)</div>
              </div>
              <div className="flex flex-wrap gap-8 mt-4">
                {[
                  { color: 'bg-primary',        label: 'Model Training — sales up to 2021' },
                  { color: 'bg-secondary',       label: 'Parameter Tuning — 2022 sales' },
                  { color: 'bg-secondary-fixed', label: 'Independent Test — 2023–2024 sales' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-sm ${color}`} />
                    <span className="text-xs text-on-surface-variant">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── DATA SOURCES ─── */}
        <section className="bg-white py-24 px-8">
          <div className="max-w-screen-2xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-secondary font-bold tracking-widest uppercase text-xs block font-label mb-3">Data Sources</span>
              <h2 className="text-4xl font-bold text-primary font-headline">Built on authoritative public records</h2>
              <p className="text-on-surface-variant mt-4 max-w-xl mx-auto">
                Every data point behind your valuation comes from an official or open-access source — no proprietary feeds, no estimates.
              </p>
            </div>

            <div className="relative max-w-3xl mx-auto">
              <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-surface-container" />
              {[
                {
                  icon: 'apartment',
                  title: 'HM Land Registry',
                  body: 'Every residential sale registered in England and Wales — the definitive record of actual transaction prices, updated monthly.',
                  tag: '4.5M records used',
                },
                {
                  icon: 'bolt',
                  title: 'Energy Performance Register',
                  body: 'Government register of all Energy Performance Certificates — providing floor area, room count, construction era and energy score for millions of properties.',
                  tag: '24M+ certificates',
                },
                {
                  icon: 'pin_drop',
                  title: 'ONS Postcode Directory',
                  body: 'Office for National Statistics postcode geography — region codes, local authority boundaries and deprivation ranks for every active postcode in England.',
                  tag: '1.7M active postcodes',
                },
                {
                  icon: 'map',
                  title: 'OpenStreetMap',
                  body: 'Live distances to stations, schools and green spaces are queried at the moment of your valuation — so your result reflects current local infrastructure.',
                  tag: 'Live at every valuation',
                },
              ].map(({ icon, title, body, tag }) => (
                <div key={title} className="relative flex gap-8 mb-10">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0 z-10">
                    <span className="material-symbols-outlined text-white">{icon}</span>
                  </div>
                  <div className="bg-surface-container-low rounded-2xl p-6 flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="font-bold text-primary font-headline">{title}</h4>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap font-label" style={{ background: 'rgba(0,108,73,0.1)', color: '#006c49' }}>{tag}</span>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center mt-16">
              <Link
                to="/predict"
                className="inline-flex items-center gap-2 bg-secondary text-on-secondary px-10 py-5 rounded-full font-bold text-lg hover:opacity-90 transition-all shadow-lg"
              >
                <span className="material-symbols-outlined">trending_flat</span>
                Get My Valuation
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}
