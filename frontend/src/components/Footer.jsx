import { Link } from 'react-router-dom'

const NAV_COL = [
  { to: '/',             label: 'Home' },
  { to: '/predict',      label: 'Predict' },
  { to: '/how-it-works', label: 'How It Works' },
]

const RESOURCE_COL = [
  { href: 'https://landregistry.data.gov.uk/app/ppd', label: 'Data Sources' },
  { to: '/how-it-works', label: 'Model Performance' },
  { href: 'https://github.com', label: 'GitHub Repository' },
]

export default function Footer() {
  return (
    <footer className="bg-primary text-on-primary px-8 py-12">
      <div className="max-w-screen-2xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Brand */}
        <div>
          <span className="text-xl font-bold font-headline block mb-2">
            HousePredict
          </span>
          <p className="text-on-primary/40 text-xs font-body mt-1">
            © HousePredict. All rights reserved.
          </p>
        </div>

        {/* Navigate */}
        <div>
          <p className="text-on-primary/60 text-xs uppercase tracking-widest font-label mb-4">
            Navigate
          </p>
          <div className="flex flex-col gap-3">
            {NAV_COL.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-on-primary/80 text-sm font-body hover:text-on-primary transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div>
          <p className="text-on-primary/60 text-xs uppercase tracking-widest font-label mb-4">
            Resources
          </p>
          <div className="flex flex-col gap-3">
            {RESOURCE_COL.map(({ to, href, label }) =>
              to ? (
                <Link
                  key={label}
                  to={to}
                  className="text-on-primary/80 text-sm font-body hover:text-on-primary transition-colors"
                >
                  {label}
                </Link>
              ) : (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-on-primary/80 text-sm font-body hover:text-on-primary transition-colors"
                >
                  {label}
                </a>
              )
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
