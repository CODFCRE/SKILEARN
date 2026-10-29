import { useEffect, useState } from 'react'
import { Icon } from '../../shared/components.jsx'
import { goBack, navigate } from '../../shared/lib/navigation.js'
import { supabase } from '../../shared/lib/supabase.js'

export function Verification() {
  const [method, setMethod] = useState('academic_email')
  const [email, setEmail] = useState('')
  const [file, setFile] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(Boolean(supabase))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    let active = true
    const loadSubmissions = async () => {
      if (!supabase) return
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!authData.user) {
          if (active) setSignedIn(false)
          return
        }
        const { data, error: submissionError } = await supabase
          .from('verification_submissions')
          .select('id,method,academic_email,document_path,status,rejection_reason,created_at')
          .eq('user_id', authData.user.id)
          .order('created_at', { ascending: false })
        if (submissionError) throw submissionError
        if (active) {
          setSignedIn(true)
          setSubmissions(data || [])
        }
      } catch (requestError) {
        console.error('Unable to load verification submissions:', requestError)
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load verification status.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSubmissions()
    return () => {
      active = false
    }
  }, [])

  const submitVerification = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }
    if (!signedIn) {
      setError('Sign in before submitting verification.')
      return
    }
    if (method === 'academic_email' && !email.trim()) {
      setError('Enter your university email.')
      return
    }
    if (method === 'student_id' && !file) {
      setError('Choose a student ID image or PDF to upload.')
      return
    }

    setSaving(true)
    let uploadedPath = null
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error('Your session expired. Sign in again.')

      let documentPath = null
      if (method === 'student_id') {
        const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
        uploadedPath = `${authData.user.id}/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage
          .from('student-verification')
          .upload(uploadedPath, file, { upsert: false })
        if (uploadError) throw uploadError
        documentPath = uploadedPath
      }

      const { data, error: insertError } = await supabase
        .from('verification_submissions')
        .insert({
          user_id: authData.user.id,
          method,
          academic_email: method === 'academic_email' ? email.trim() : null,
          document_path: documentPath,
        })
        .select('id,method,academic_email,document_path,status,rejection_reason,created_at')
        .single()

      if (insertError) {
        if (uploadedPath) {
          const { error: cleanupError } = await supabase.storage
            .from('student-verification')
            .remove([uploadedPath])
          if (cleanupError) console.error('Unable to remove unreferenced verification upload:', cleanupError)
        }
        throw insertError
      }

      setSubmissions((current) => [data, ...current])
      setEmail('')
      setFile(null)
      setNotice('Verification submitted for review. Your account status will update after review.')
    } catch (requestError) {
      console.error('Unable to submit verification:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to submit verification.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="verification-shell">
      <main className="verification-page">
        <header className="verification-header">
          <button className="round-control" onClick={goBack} aria-label="Go back"><Icon>arrow_back</Icon></button>
          <div className="verification-brand"><i />Skilearn</div>
          <button className="round-control" aria-label="Help"><Icon>help_outline</Icon></button>
        </header>

        <div className="verification-step">
          <div><span>Campus account</span><strong>Verification status</strong></div>
          <div className="step-bars"><i /><i /><i /></div>
        </div>

        <section className="trust-card">
          <div className="trust-icon"><Icon filled>verified_user</Icon></div>
          <div>
            <span className="security-label"><Icon>lock</Icon>Private submission</span>
            <h2>Campus Verification</h2>
            <p>Submit a university email or student ID for review. Your submission status is stored with your account.</p>
          </div>
        </section>

        {!signedIn && !loading && (
          <div className="profile-error" role="alert">
            Sign in to submit and view verification requests.
            <button type="button" onClick={() => navigate('/login')}>Login</button>
          </div>
        )}
        {error && <div className="profile-error" role="alert">{error}</div>}
        {notice && <p className="listing-feedback success" role="status">{notice}</p>}

        {loading ? (
          <div className="profile-loading" role="status">Loading verification status...</div>
        ) : signedIn && (
          <>
            <div className="verification-options">
              <section className="verify-option">
                <div className="option-heading">
                  <h3><b>01</b>University email</h3>
                  <span>Email review</span>
                </div>
                <form className="verification-submit-form" onSubmit={submitVerification}>
                  <div className="verification-method-switch">
                    <button type="button" className={method === 'academic_email' ? 'active' : ''} onClick={() => setMethod('academic_email')}>
                      Email
                    </button>
                    <button type="button" className={method === 'student_id' ? 'active' : ''} onClick={() => setMethod('student_id')}>
                      Student ID
                    </button>
                  </div>
                  {method === 'academic_email' ? (
                    <label className="verification-field">
                      <span>University email address</span>
                      <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="student@university.edu"
                        type="email"
                        required
                      />
                    </label>
                  ) : (
                    <label className="verification-upload">
                      <input
                        accept="image/*,.pdf"
                        type="file"
                        onChange={(event) => setFile(event.target.files?.[0] || null)}
                        required
                      />
                      <Icon>photo_camera</Icon>
                      <strong>{file?.name || 'Choose student ID image or PDF'}</strong>
                      <small>Uploaded privately for review.</small>
                    </label>
                  )}
                  <button className="primary-action" type="submit" disabled={saving}>
                    {saving ? 'Submitting...' : 'Submit for review'} <Icon>arrow_forward</Icon>
                  </button>
                </form>
              </section>
            </div>

            <section className="verification-history">
              <h2>Previous submissions</h2>
              {submissions.length ? submissions.map((submission) => (
                <article key={submission.id}>
                  <div>
                    <strong>{submission.method === 'academic_email' ? submission.academic_email : 'Student ID document'}</strong>
                    <small>{new Date(submission.created_at).toLocaleString()}</small>
                    {submission.rejection_reason && <p>{submission.rejection_reason}</p>}
                  </div>
                  <span className={`verification-result ${submission.status}`}>{submission.status}</span>
                </article>
              )) : <p>No verification submissions yet.</p>}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
