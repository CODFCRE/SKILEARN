import { useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '../../shared/lib/supabase.js'
import { Icon } from '../../shared/components.jsx'
import { navigate } from '../../shared/lib/navigation.js'

export function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email')
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

  const handleSendCode = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!supabaseConfigured) {
      setError('Supabase is not configured. Add the client VITE_SUPABASE variables to continue.')
      return
    }

    setLoading(true)
    try {
      const { data, error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      })

      if (otpError) {
        navigate('/auth/error', { authError: { message: otpError.message } })
        return
      }

      if (data.session) {
        navigate('/profile')
        return
      }

      setStep('code')
      setCode('')
      setNotice(`A sign-in code was sent to ${email.trim()}.`)
    } catch (requestError) {
      navigate('/auth/error', {
        authError: {
          message: requestError instanceof Error ? requestError.message : 'Unable to send the sign-in code.',
        },
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!supabaseConfigured) {
      setError('Supabase is not configured. Add the client VITE_SUPABASE variables to continue.')
      return
    }

    setLoading(true)
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
      })

      if (verifyError) {
        navigate('/auth/error', { authError: { message: verifyError.message } })
        return
      }

      if (!data.session) {
        navigate('/auth/error', {
          authError: { message: 'The code was accepted but no active session was created. Try requesting a new code.' },
        })
        return
      }

      navigate('/profile')
    } catch (requestError) {
      navigate('/auth/error', {
        authError: {
          message: requestError instanceof Error ? requestError.message : 'Unable to verify the sign-in code.',
        },
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChangeEmail = () => {
    setStep('email')
    setCode('')
    setError('')
    setNotice('')
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
              <h2>{step === 'email' ? 'Login or sign up' : 'Check your email'}</h2>
              <p>
                {step === 'email'
                  ? 'Enter your email and we’ll send you a one-time sign-in code.'
                  : 'Enter the 6-digit code we sent to your inbox.'}
              </p>
            </div>

            {step === 'email' ? (
              <form className="login-form" onSubmit={handleSendCode}>
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
                <button className="login-submit" type="submit" disabled={loading}>
                  {loading ? 'Sending code...' : 'Email me a code'}
                  <Icon>arrow_forward</Icon>
                </button>
              </form>
            ) : (
              <>
                <div className="otp-recipient">
                  <span>{email.trim()}</span>
                  <button type="button" className="forgot-link" onClick={handleChangeEmail}>
                    Change email
                  </button>
                </div>
                <form className="login-form" onSubmit={handleVerifyCode}>
                  <label className="login-input-wrap" htmlFor="email-code">
                    <Icon>pin</Icon>
                    <input
                      id="email-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                      aria-label="Email sign-in code"
                      required
                    />
                  </label>
                  <button className="login-submit" type="submit" disabled={loading}>
                    {loading ? 'Verifying code...' : 'Verify and continue'}
                    <Icon>arrow_forward</Icon>
                  </button>
                </form>
                <button className="forgot-link otp-resend" type="button" onClick={handleSendCode} disabled={loading}>
                  {loading ? 'Sending...' : 'Resend code'}
                </button>
              </>
            )}

            {(error || notice) && (
              <p className={error ? 'login-feedback error' : 'login-feedback'} role={error ? 'alert' : 'status'}>
                {error || notice}
              </p>
            )}
          </div>

          <footer className="login-signup">
            <span>Passwordless sign-in with a one-time email code</span>
          </footer>
        </section>
      </main>
    </div>
  )
}
