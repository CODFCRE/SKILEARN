import { useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '../../shared/lib/supabase.js'
import { Icon } from '../../shared/components.jsx'
import { navigate } from '../../shared/lib/navigation.js'
export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    const redirectIfAuthenticated = (session) => {
      if (active && session) navigate('/profile')
    }

    supabase.auth.getSession().then(({ data }) => redirectIfAuthenticated(data.session))
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      redirectIfAuthenticated(session)
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!supabaseConfigured) {
      setError('Supabase is not configured. Add the client VITE_SUPABASE variables to continue.')
      return
    }

    setLoading(true)

    let signInData
    let signInError
    try {
      ({ data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password }))
    } catch (requestError) {
      setLoading(false)
      setError(requestError instanceof Error ? requestError.message : 'Unable to reach Supabase Auth.')
      return
    }

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    if (!signInData.session) {
      setError('Sign-in did not create an active session. Confirm your email and try again.')
      return
    }

    navigate('/profile')
  }

  const handlePasswordReset = async () => {
    setError('')
    setNotice('')

    if (!email) {
      setError('Enter your campus email first.')
      return
    }

    if (!supabaseConfigured) {
      setError('Supabase is not configured. Add the client VITE_SUPABASE variables to continue.')
      return
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })

    if (resetError) {
      setError(resetError.message)
      return
    }

    setNotice('Password reset instructions were sent if this account exists.')
  }

  const handleGoogleOAuth = async () => {
    setError('')
    setNotice('')

    if (!supabaseConfigured) {
      setError('Supabase is not configured. Add the client VITE_SUPABASE variables to continue.')
      return
    }

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/profile` },
    })

    if (oauthError) setError(oauthError.message)
  }

  return (
    <div className="login-screen">
      <main className="login-frame">
        <header className="login-hero">
          <div className="login-hero-copy">
            <span className="login-eyebrow"><i />Campus skill exchange</span>
            <h1>Hello!</h1>
            <p>Welcome to <strong>Skilearn</strong></p>
          </div>
          <div className="login-illustration" aria-hidden="true">
            <Icon>local_florist</Icon>
            <Icon>menu_book</Icon>
          </div>
        </header>

        <section className="login-card">
          <div>
            <div className="login-heading">
              <h2>Login</h2>
              <p>Connect with peers & exchange campus skills</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label className="login-input-wrap" htmlFor="campus-email">
                <Icon>mail</Icon>
                <input
                  id="campus-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="student@university.edu"
                  autoComplete="email"
                  required
                />
              </label>
              <div className="login-input-wrap">
                <Icon>lock</Icon>
                <input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon>{showPassword ? 'visibility_off' : 'visibility'}</Icon>
                </button>
              </div>
              <button type="button" className="forgot-link" onClick={handlePasswordReset}>
                Forgot Password?
              </button>
              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Login'}
                <Icon>arrow_forward</Icon>
              </button>
            </form>

            {(error || notice) && (
              <p className={error ? 'login-feedback error' : 'login-feedback'} role="status">
                {error || notice}
              </p>
            )}

            <div className="login-divider"><span>Or login with</span></div>
            <div className="social-auth" aria-label="Social sign in options">
              <button onClick={handleGoogleOAuth} aria-label="Log in with Google" title="Google">
                <Icon>account_circle</Icon>
              </button>
            </div>
          </div>

          <footer className="login-signup">
            <span>Don't have an account?</span>
            <button onClick={() => navigate('/verification')}>Sign Up</button>
          </footer>
        </section>
      </main>
    </div>
  )
}

