import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Home() {
  return (
    <div className="bg-background text-on-background font-body antialiased">
      <Navbar />
      <main className="pt-24">

        {/* ─── HERO ─── */}
        <section className="relative px-8 py-16 lg:py-24 max-w-[1440px] mx-auto grid lg:grid-cols-2 gap-12 items-center overflow-hidden">
          <div className="z-10">
            <h1 className="font-headline text-5xl lg:text-7xl font-extrabold tracking-tight text-primary leading-[1.1] mb-6">
              Professional Property Valuation{' '}
              <br />
              <span className="text-secondary">for Homes Across England</span>
            </h1>
            <p className="text-lg text-on-surface-variant max-w-xl mb-10 leading-relaxed">
              Receive an instant estimate informed by transaction history, property features,
              neighbourhood context, and wider market conditions. Designed to make residential
              pricing more transparent, evidence-based, and easy to understand.
            </p>
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-xl flex gap-4">
              <Link
                to="/predict"
                className="flex-1 bg-secondary text-on-secondary py-4 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">trending_flat</span>
                Get My Valuation
              </Link>
              <Link
                to="/how-it-works"
                className="flex-1 bg-surface-container text-primary py-4 rounded-xl font-bold hover:bg-surface-container-high transition-all flex items-center justify-center"
              >
                How It Works
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl bg-primary-container flex items-center justify-center">
              <img
                alt="England Residential Property"
                className="w-full h-full object-cover"
                src="https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80"
                onError={e => {
                  e.target.style.display = 'none'
                  e.target.parentElement.style.background = 'linear-gradient(135deg, #031634, #1a2b4a)'
                }}
              />
            </div>
            {/* Floating summary card */}
            <div className="absolute -bottom-6 -left-6 md:-left-12 glass-panel-light p-6 rounded-2xl shadow-2xl border border-white/40 w-72">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-outline mb-1">
                    Estimated Value
                  </p>
                  <h3 className="text-3xl font-black text-primary">£342,500</h3>
                </div>
                <div className="bg-secondary-fixed text-on-secondary-fixed-variant px-2 py-1 rounded text-[10px] font-bold">
                  England
                </div>
              </div>
              <div className="h-12 w-full flex items-end gap-1 mb-4">
                <div className="w-full h-4 rounded-t" style={{ background: 'rgba(0,108,73,0.2)' }} />
                <div className="w-full h-6 rounded-t" style={{ background: 'rgba(0,108,73,0.3)' }} />
                <div className="w-full h-8 rounded-t" style={{ background: 'rgba(0,108,73,0.4)' }} />
                <div className="w-full h-12 rounded-t bg-secondary" />
                <div className="w-full h-10 rounded-t" style={{ background: 'rgba(0,108,73,0.8)' }} />
              </div>
              <div className="flex justify-between items-center text-[11px] font-semibold text-on-surface-variant">
                <span>Confidence: High</span>
                <span>Based on local sales</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── WHY HOUSEPREDICT ─── */}
        <section className="bg-surface-container-low py-12 px-8">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: 'location_city',
                title: 'Covers All of England',
                body: 'Every active postcode, from central London to rural Yorkshire — using verified sale records updated regularly.',
              },
              {
                icon: 'bolt',
                title: 'Ready in Seconds',
                body: 'Enter your postcode and property details to receive your valuation in under a minute.',
              },
              {
                icon: 'visibility',
                title: 'Clearly Explained',
                body: 'See which features raised or lowered your estimate — no guesswork, no black box, no jargon.',
              },
              {
                icon: 'show_chart',
                title: 'Market-Aware',
                body: 'Every valuation reflects current interest rates, seasonal trends and local market conditions.',
              },
            ].map(({ icon, title, body }) => (
              <div key={title} className="bg-surface-container-lowest p-6 rounded-xl hover:shadow-md transition-all" style={{ boxShadow: '0px 2px 8px rgba(25,28,30,0.04)' }}>
                <span className="material-symbols-outlined text-secondary mb-3 block" style={{ fontSize: '2rem' }}>{icon}</span>
                <h4 className="font-bold text-primary mb-1">{title}</h4>
                <p className="text-xs text-on-surface-variant">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="py-24 px-8 max-w-[1440px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-4">
              Three steps to your valuation
            </h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto">
              No estate agent appointment. No waiting days for a callback.
              Your estimate is ready the moment you submit.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-12 relative">
            {[
              {
                icon: 'edit_location',
                bg: 'bg-primary',
                title: '1. Enter your postcode',
                body: 'Start typing and select your postcode from the dropdown. Your region, local authority and nearby amenities are filled in automatically.',
              },
              {
                icon: 'tune',
                bg: 'bg-primary',
                title: '2. Describe the property',
                body: 'Choose your property type, tenure, floor area, number of rooms and energy rating. The whole form takes under a minute to complete.',
              },
              {
                icon: 'verified',
                bg: 'bg-secondary',
                title: '3. Receive your estimate',
                body: 'Get your estimated market value, an expected price range, and a clear breakdown of the factors specific to your property.',
              },
            ].map(({ icon, bg, title, body }) => (
              <div key={title} className="flex flex-col items-center text-center group">
                <div className={`w-16 h-16 rounded-2xl ${bg} flex items-center justify-center text-on-primary mb-6 group-hover:scale-110 transition-transform`}>
                  <span className="material-symbols-outlined">{icon}</span>
                </div>
                <h3 className="font-bold text-xl text-primary mb-3">{title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── TRUST SECTION ─── */}
        <section className="py-24 px-8 overflow-hidden" style={{ background: 'rgba(231,232,234,0.30)' }}>
          <div className="max-w-[1440px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-headline text-3xl font-bold text-primary mb-4">
                Why homeowners choose HousePredict
              </h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto">
                Built on authoritative public records — not automated guesswork.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: 'gavel',
                  title: 'Grounded in Real Sales',
                  body: 'Every estimate draws on verified property transactions from HM Land Registry — the definitive public record of what homes actually sold for across England.',
                },
                {
                  icon: 'search',
                  title: 'Nothing Hidden',
                  body: 'Unlike traditional valuations, HousePredict shows you exactly which features influenced your estimate and whether they raised or lowered the figure.',
                },
                {
                  icon: 'free_breakfast',
                  title: 'Free, Fast, No Sign-up',
                  body: 'Get as many valuations as you need at no cost. No registration, no waiting — results arrive in seconds and your history is saved automatically.',
                },
              ].map(({ icon, title, body }) => (
                <div key={title} className="bg-surface-container-lowest rounded-2xl p-8" style={{ boxShadow: '0px 2px 8px rgba(25,28,30,0.04)' }}>
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-on-primary">{icon}</span>
                  </div>
                  <h4 className="font-bold text-primary text-lg mb-3">{title}</h4>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
                </div>
              ))}
            </div>

            {/* Accuracy strip */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: '4.5M+', label: 'Sales records studied' },
                { value: '620K',  label: 'Independent checks run' },
                { value: '66.8%', label: 'Within 20% of actual price' },
                { value: '< 60s', label: 'To receive your valuation' },
              ].map(({ value, label }) => (
                <div key={label} className="bg-surface-container-lowest rounded-xl p-6 text-center" style={{ boxShadow: '0px 2px 8px rgba(25,28,30,0.04)' }}>
                  <p className="text-3xl font-extrabold text-secondary font-headline">{value}</p>
                  <p className="text-xs text-on-surface-variant mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="px-8 py-24">
          <div className="max-w-[1280px] mx-auto bg-primary rounded-[2.5rem] p-12 lg:p-24 relative overflow-hidden text-center">
            <div className="absolute inset-0 dot-matrix" style={{ opacity: 0.05 }} />
            <div className="relative z-10">
              <h2 className="font-headline text-4xl lg:text-6xl font-extrabold text-on-primary mb-6 leading-tight">
                Find out what your <br /> property is worth.
              </h2>
              <p className="text-on-primary/70 text-lg mb-12 max-w-xl mx-auto">
                No registration required. No estate agent fees.
                Your instant valuation is one postcode away.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/predict"
                  className="bg-secondary text-on-secondary px-10 py-5 rounded-full font-bold text-lg hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">trending_flat</span>
                  Get My Valuation
                </Link>
                <Link
                  to="/how-it-works"
                  className="text-on-primary px-10 py-5 rounded-full font-bold text-lg transition-all flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.10)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.20)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
                >
                  How It Works
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}
