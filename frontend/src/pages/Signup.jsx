import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Signup() {
  async function handleGoogle() {
    setError('')
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/predict` },
    })
    if (authError) setError(authError.message)
  }

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    const { error: authError } = await supabase.auth.signUp({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="bg-background text-on-background font-body antialiased min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 pt-24 pb-16">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-10 shadow-xl text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-on-secondary text-4xl">mark_email_read</span>
            </div>
            <h2 className="font-headline text-2xl font-extrabold text-primary mb-3">Check your inbox</h2>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
              We've sent a confirmation link to <strong className="text-primary">{email}</strong>.
              Click the link to activate your account, then come back to sign in.
            </p>
            <Link
              to="/login"
              className="inline-block bg-secondary text-on-secondary px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all"
            >
              Go to Sign In
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="bg-background text-on-background font-body antialiased min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 pt-24 pb-16">
        <div className="w-full max-w-md">

          <div className="bg-surface-container-lowest rounded-2xl p-10 shadow-xl">

            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-on-secondary text-3xl">person_add</span>
              </div>
              <h1 className="font-headline text-3xl font-extrabold text-primary">Create account</h1>
              <p className="text-on-surface-variant text-sm mt-2">
                Free forever — save and revisit your valuations
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-6 px-4 py-3 rounded-xl text-sm font-semibold text-error bg-error-container flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </div>
            )}

            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-outline-variant bg-surface-container hover:bg-surface-container-high font-bold text-sm text-on-surface transition-all active:scale-95 mb-6"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-outline-variant" />
              <span className="text-xs text-on-surface-variant font-semibold">or create account with email</span>
              <div className="flex-1 h-px bg-outline-variant" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold text-base hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading
                  ? <><span className="material-symbols-outlined animate-spin text-lg">progress_activity</span> Creating account…</>
                  : <><span className="material-symbols-outlined">how_to_reg</span> Create Account</>
                }
              </button>
            </form>

            <p className="text-center text-sm text-on-surface-variant mt-8">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-secondary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
