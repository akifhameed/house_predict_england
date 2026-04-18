import { Link, useLocation } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/',             label: 'Home' },
  { to: '/predict',      label: 'Predict' },
  { to: '/how-it-works', label: 'How It Works' },
]

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed top-0 w-full z-50 bg-primary"
      style={{ boxShadow: '0 2px 24px rgba(3,22,52,0.18)' }}
    >
      <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">
        {/* Wordmark */}
        <Link
          to="/"
          className="text-xl font-bold text-on-primary font-headline tracking-tight hover:opacity-90 transition-opacity"
        >
          HousePredict
        </Link>

        {/* Centre links */}
        <div className="hidden md:flex items-center space-x-8">
          {NAV_LINKS.map(({ to, label }) => {
            const isActive = pathname === to || (to !== '/' && pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                className={[
                  'text-sm font-body transition-colors duration-200',
                  isActive
                    ? 'text-on-primary border-b-2 border-secondary pb-0.5'
                    : 'text-on-primary/70 hover:text-on-primary',
                ].join(' ')}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* CTA */}
        <Link
          to="/predict"
          className="bg-secondary text-on-secondary px-6 py-2 rounded-full text-sm font-semibold font-body hover:opacity-90 active:scale-95 transition-all duration-200"
        >
          Start Prediction →
        </Link>
      </div>
    </nav>
  )
}
