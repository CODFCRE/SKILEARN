import { useEffect, useState } from 'react'
import { Icon } from '../../shared/components.jsx'
import { navigate } from '../../shared/lib/navigation.js'
import { supabase } from '../../shared/lib/supabase.js'

function getCallbackError() {
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const error = query.get('error') || hash.get('error')
  const code = query.get('error_code') || hash.get('error_code')
  const description = query.get('error_description') || hash.get('error_description')

  if (!error && !code && !description) return null

  let message = description || error || 'Authentication could not be completed.'
  for (let attempt = 0; attempt < 2 && /%[0-9a-f]{2}/i.test(message); attempt += 1) {
    try {
      message = decodeURIComponent(message)
    } catch {
      break
    }
  }

  message = Array.from(message, (character) => {
    const code = character.charCodeAt(0)
    return code < 32 || code === 127 ? ' ' : character
  }).join('')
    .replace(/((?:external|authorization|auth) code\s*:\s*).+$/i, '$1[redacted]')
    .replace(/(?:access_token|refresh_token|id_token|token_hash|code)=\S+/gi, '[redacted]')
    .trim()

  return { code, message }
}

function clearCallbackParameters() {
  window.history.replaceState({}, '', window.location.pathname)
}

export function AuthError() {
  const [details, setDetails] = useState(() => (
    window.history.state?.authError || getCallbackError()
  ))

  useEffect(() => {
    let active = true
    const hasCallbackParameters = Boolean(window.location.search || window.location.hash)
    const { data: authListener } = supabase?.auth.onAuthStateChange((_event, session) => {
      if (active && session && !details) navigate('/profile')
    }) ?? { data: { subscription: { unsubscribe() {} } } }

    if (supabase) {
      supabase.auth.getSession().then(({ data, error }) => {
        if (!active) return
        if (hasCallbackParameters) clearCallbackParameters()
        if (data.session && !details) {
          navigate('/profile')
        } else if (error && !details) {
          setDetails({ message: error.message })
        }
      }).catch((error) => {
        if (active && !details) {
          setDetails({
            message: error instanceof Error
              ? error.message
              : 'Unable to read the current authentication session.',
          })
        }
      })
    } else if (hasCallbackParameters) {
      clearCallbackParameters()
    }

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [details])

  const message = typeof details === 'string' ? details : details?.message
  const code = typeof details === 'object' ? details?.code : null

  return (
    <main className="auth-error-screen">
      <section className="auth-error-card" aria-labelledby="auth-error-title">
        <span className="auth-error-icon"><Icon>error</Icon></span>
        <p className="auth-error-eyebrow">Skilearn account</p>
        <h1 id="auth-error-title">Sign-in failed</h1>
        <p className="auth-error-intro">We couldn’t complete your login or account registration.</p>
        <div className="auth-error-reason" role="alert">
          <strong>Reason</strong>
          <p>{message || 'No detailed error was returned. Try again, or check the Supabase Auth logs for this attempt.'}</p>
          {code && <small>Error code: {code}</small>}
        </div>
        <p className="auth-error-help">
          For Google sign-in issues, verify the Google provider credentials and the callback URL in Supabase.
          Never share authorization codes or tokens from the browser address bar.
        </p>
        <button className="login-submit" onClick={() => navigate('/login')}>
          Return to login <Icon>arrow_forward</Icon>
        </button>
      </section>
    </main>
  )
}
