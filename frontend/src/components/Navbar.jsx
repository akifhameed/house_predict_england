import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_LINKS = [
  { to: '/',             label: 'Home' },
  { to: '/predict',      label: 'Predict' },
  { to: '/how-it-works', label: 'How It Works' },
]

export default function Navbar() {
  const { pathname }       = useLocation()
  const { user, signOut }  = useAuth()
  const navigate           = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <nav
      className="fixed top-0 w-full z-50 bg-primary"
      style={{ boxShadow: '0 2px 24px rgba(3,22,52,0.18)' }}
    >
      <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">

        {/* Logo + Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
        >
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 flex-shrink-0">
            <rect width="32" height="32" rx="7" fill="rgba(255,255,255,0.10)"/>
            <path d="M16 5L29 16H3L16 5Z" fill="#6cf8bb"/>
            <rect x="4" y="15" width="24" height="13" rx="1.5" fill="rgba(255,255,255,0.12)"/>
            <rect x="6" y="17" width="6" height="5" rx="1" fill="rgba(255,255,255,0.45)"/>
            <rect x="20" y="17" width="6" height="5" rx="1" fill="rgba(255,255,255,0.45)"/>
            <rect x="13" y="21" width="6" height="7" rx="1" fill="#6cf8bb"/>
          </svg>
          <span className="text-xl font-bold text-on-primary font-headline tracking-tight">
            HousePredict
          </span>
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

        {/* Right side — auth + CTA */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Logged-in user indicator */}
              <span className="hidden sm:flex items-center gap-1.5 text-on-primary/70 text-sm">
                <span className="material-symbols-outlined text-base text-secondary">account_circle</span>
                {user.email?.split('@')[0]}
              </span>

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                className="text-on-primary/70 hover:text-on-primary text-sm font-semibold transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-on-primary/80 hover:text-on-primary text-sm font-semibold transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">login</span>
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}

          {/* Primary CTA */}
          <Link
            to="/predict"
            className="bg-secondary text-on-secondary px-6 py-2 rounded-full text-sm font-semibold font-body hover:opacity-90 active:scale-95 transition-all duration-200"
          >
            Start Prediction →
          </Link>
        </div>

      </div>
    </nav>
  )
}
