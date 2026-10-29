import { useState } from 'react'
import { Icon } from '../../shared/components.jsx'
import { goBack } from '../../shared/lib/navigation.js'
export function Verification() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', ''])
  const [file, setFile] = useState('')
  const [sent, setSent] = useState(false)
  const [verified, setVerified] = useState(false)

  const updateCode = (index, value) => {
    setCode((currentCode) => currentCode.map((digit, digitIndex) => (
      digitIndex === index ? value.slice(-1) : digit
    )))
  }

  return (
    <div className="verification-shell">
      <main className="verification-page">
        <header className="verification-header">
          <button className="round-control" onClick={goBack} aria-label="Go back">
            <Icon>arrow_back</Icon>
          </button>
          <div className="verification-brand">
            <i />
            Skilearn
          </div>
          <button className="round-control" aria-label="Help">
            <Icon>help_outline</Icon>
          </button>
        </header>

        <div className="verification-step">
          <div>
            <span>Step 2 of 3</span>
            <strong>Campus Trust & Verification</strong>
          </div>
          <div className="step-bars">
            <i />
            <i />
            <i />
          </div>
        </div>

        <section className="trust-card">
          <div className="trust-icon">
            <Icon filled>verified_user</Icon>
          </div>
          <div>
            <span className="security-label">
              <Icon>lock</Icon>
              Strict Peer Security
            </span>
            <h2>Campus-Restricted Exchange</h2>
            <p>
              Only verified university students can trade time credits. Keep our peer
              skill exchange authentic, safe, and campus-exclusive.
            </p>
          </div>
        </section>

        <section className="reward-card">
          <div>
            <span className="instant-label">Instant Reward</span>
            <strong>Get +3 Free Time Credits</strong>
            <small>Credited immediately upon successful verification</small>
          </div>
          <b>3h</b>
        </section>

        <div className="verification-options">
          <section className="verify-option">
            <div className="option-heading">
              <h3><b>01</b>University .edu Email</h3>
              <span>Fastest (30s)</span>
            </div>
            <div className="email-row">
              <Icon>school</Icon>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student.name@university.edu"
                type="email"
              />
              <button onClick={() => setSent(true)}>
                Send Code <Icon>send</Icon>
              </button>
            </div>
            {sent && (
              <div className="code-row">
                <span>Code sent! Enter 4-digit PIN:</span>
                <div>
                  {code.map((value, index) => (
                    <input
                      key={index}
                      maxLength="1"
                      value={value}
                      onChange={(event) => updateCode(index, event.target.value)}
                      aria-label={`Verification digit ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="or-divider">or alternative</div>

          <section className="verify-option">
            <div className="option-heading">
              <h3><b>02</b>Upload Student ID Card</h3>
              <span>Photo ID</span>
            </div>
            <label className="upload-zone">
              <input
                accept="image/*,.pdf"
                type="file"
                onChange={(event) => setFile(event.target.files?.[0]?.name || '')}
              />
              <Icon>photo_camera</Icon>
              <strong>{file || 'Tap to snap or upload physical ID'}</strong>
              <small>JPG, PNG, or PDF â€¢ Must show valid semester & student name</small>
              <em>
                <Icon filled>shield</Icon>
                Encrypted & deleted after verification
              </em>
            </label>
          </section>
        </div>

        <div className="trust-badges">
          <span><Icon>done_all</Icon>98 Universities</span>
          <span><Icon>security</Icon>FERPA Compliant</span>
          <span><Icon>speed</Icon>Instant Approval</span>
        </div>

        <footer className="verification-footer">
          <button className="primary-action" onClick={() => setVerified(true)}>
            {verified ? 'Verification submitted' : 'Verify & Enter Skilearn'}
            <Icon>arrow_forward</Icon>
          </button>
          <small>By verifying, you accept Skilearn's Student Honor Code & Campus Guidelines.</small>
        </footer>
      </main>
    </div>
  )
}

