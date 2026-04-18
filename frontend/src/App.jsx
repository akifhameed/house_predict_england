import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Predict from './pages/Predict'
import Results from './pages/Results'
import HowItWorks from './pages/HowItWorks'

function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-8 font-body">
      <p className="text-9xl font-headline font-extrabold text-surface-container-highest">404</p>
      <h1 className="text-3xl font-headline font-extrabold text-primary mt-4 mb-2">Page not found</h1>
      <p className="text-on-surface-variant mb-8 max-w-sm">
        The page you're looking for doesn't exist. It may have been moved or the URL might be incorrect.
      </p>
      <div className="flex gap-4">
        <Link to="/" className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all">
          Go Home
        </Link>
        <Link to="/predict" className="bg-secondary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all">
          Start a Valuation
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/"             element={<Home />} />
      <Route path="/predict"      element={<Predict />} />
      <Route path="/results"      element={<Results />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="*"             element={<NotFound />} />
    </Routes>
  )
}
