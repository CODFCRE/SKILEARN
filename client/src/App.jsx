import { useEffect, useState } from 'react'
import './App.css'
import { supabase, supabaseConfigured } from './lib/supabase'

const skills = []
const exchangeCategories = ['All', 'Tech', 'Arts', 'Academics', 'Languages']
const listingCategories = [
  ['code', 'Tech'],
  ['palette', 'Arts'],
  ['menu_book', 'Academics'],
  ['translate', 'Languages'],
  ['fitness_center', 'Fitness'],
]
const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const navigationItems = [
  ['exchange', 'swap_horiz', 'Exchange'],
  ['sessions', 'event', 'Sessions'],
  ['wallet', 'monetization_on', 'Credits'],
  ['profile', 'person', 'Profile'],
]
const quickActions = [
  ['add_circle', 'Offer New Skill', '/skill-listing'],
  ['search', 'Find Sessions', '/'],
  ['schedule', 'Schedule', '/sessions'],
  ['qr_code_scanner', 'Scan & Pay', '/verification'],
]
const sessionStates = {
  upcoming: ['event_busy', 'No upcoming sessions', 'Your scheduled sessions will appear here.'],
  completed: ['history', 'No completed sessions', 'Your completed sessions will appear here.'],
  messages: ['forum', 'No messages', 'Messages with other users will appear here.'],
}

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function goBack() {
  window.history.back()
}

function Icon({ children, filled = false }) {
  return (
    <span className={`material-symbols-outlined${filled ? ' filled' : ''}`}>
      {children}
    </span>
  )
}

function Header({ back = false, help = false }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-group">
          {back && (
            <button className="icon-button" onClick={goBack} aria-label="Go back">
              <Icon>arrow_back</Icon>
            </button>
          )}
          <div className="brand-mark">
            <Icon>person</Icon>
          </div>
          <span className="brand">Skilearn</span>
        </div>
        <div className="header-actions">
          <button className="icon-button" aria-label={help ? 'Help' : 'Notifications'}>
            <Icon>{help ? 'help_outline' : 'notifications'}</Icon>
          </button>
        </div>
      </div>
    </header>
  )
}

function BottomNav({ active }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {navigationItems.map(([key, icon, label]) => (
        <button
          key={key}
          className={active === key ? 'nav-item active' : 'nav-item'}
          onClick={() => navigate(key === 'exchange' ? '/' : key === 'profile' ? '/login' : `/${key}`)}
        >
          <Icon filled={active === key}>{icon}</Icon>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

function Screen({ children, active, className = '' }) {
  return (
    <div className={`app-shell ${className}`.trim()}>
      {children}
      {active && <BottomNav active={active} />}
    </div>
  )
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="empty-state">
      <Icon>{icon}</Icon>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )
}

function Exchange() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const normalizedQuery = query.trim().toLowerCase()
  const filteredSkills = skills.filter((skill) => {
    const matchesCategory = category === 'All' || skill.category === category
    const matchesQuery = `${skill.title} ${skill.person}`.toLowerCase().includes(normalizedQuery)
    return matchesCategory && matchesQuery
  })

  return (
    <Screen active="exchange">
      <Header />
      <main className="page exchange-page">
        <div className="search-wrap">
          <Icon>search</Icon>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search available skills..."
            aria-label="Search available skills"
          />
        </div>
        <div className="filter-row" role="group" aria-label="Skill categories">
          {exchangeCategories.map((item) => (
            <button
              key={item}
              className={category === item ? 'filter active' : 'filter'}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {filteredSkills.length ? (
          <div className="skills-grid" />
        ) : (
          <EmptyState
            icon="search_off"
            title="No skills available yet"
            text="Published skill listings will appear here when they are available."
          />
        )}
      </main>
    </Screen>
  )
}

function Sessions() {
  const [tab, setTab] = useState('upcoming')
  const [icon, title, text] = sessionStates[tab]

  return (
    <Screen active="sessions">
      <Header />
      <main className="page sessions-page">
        <div className="page-intro">
          <h1>My Sessions & Messages</h1>
          <p>Manage your scheduled mentoring, feedback history, and peer chats.</p>
        </div>
        <div className="tabs" role="tablist" aria-label="Session views">
          {Object.keys(sessionStates).map((item) => (
            <button
              key={item}
              className={tab === item ? 'active' : ''}
              onClick={() => setTab(item)}
              role="tab"
              aria-selected={tab === item}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <EmptyState icon={icon} title={title} text={text} />
      </main>
    </Screen>
  )
}

function Stat({ title, text, value }) {
  return (
    <article className="stat-card">
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <span>{value}</span>
    </article>
  )
}

function Wallet() {
  return (
    <Screen active="wallet">
      <Header />
      <main className="page wallet-page">
        <section className="balance-card">
          <div>
            <span className="eyebrow">Time-Credit Balance</span>
            <h1>Balance: -- Credits</h1>
          </div>
          <div className="coin">
            <Icon filled>monetization_on</Icon>
          </div>
          <div className="balance-footer">
            <span>● Connect an account to view your balance</span>
            <button className="button button-lime">Redeem Hours</button>
          </div>
        </section>

        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions">
          {quickActions.map(([icon, label, path]) => (
            <button key={label} onClick={() => navigate(path)}>
              <span>
                <Icon>{icon}</Icon>
              </span>
              <b>{label}</b>
            </button>
          ))}
        </div>

        <div className="stat-grid">
          <Stat
            title="Daily Goal"
            text="Your progress will appear after your account is connected."
            value="--"
          />
          <Stat
            title="Skill Standing"
            text="Your reviews and standing will appear here."
            value="--"
          />
          <Stat
            title="Active Listing"
            text="Your published skills will appear here."
            value="--"
          />
        </div>

        <h2 className="section-title">Recent Transactions</h2>
        <EmptyState
          icon="receipt_long"
          title="No transactions yet"
          text="Your credit activity will appear here."
        />
      </main>
    </Screen>
  )
}

function SkillDetail() {
  return (
    <Screen active="exchange">
      <Header back />
      <main className="page detail-page">
        <section className="detail-hero">
          <div className="detail-top">
            <span className="category">Skill details</span>
            <span className="price-pill">
              <Icon filled>monetization_on</Icon>
              Credit rate unavailable
            </span>
          </div>
          <h1>Skill details unavailable</h1>
          <p>
            This skill has not been loaded yet. Connect the app to your skill service to
            view its description, mentor details, and available time slots.
          </p>
        </section>

        <section className="mentor-card">
          <div className="mentor-info">
            <div className="mentor-avatar">
              <Icon>person</Icon>
            </div>
            <div>
              <h2>Mentor details unavailable</h2>
              <p>Profile information will appear when the skill is loaded.</p>
            </div>
          </div>
          <button className="button button-outline" disabled>
            <Icon>chat</Icon>
            Message Mentor
          </button>
        </section>

        <EmptyState
          icon="event_busy"
          title="No time slots available"
          text="Available booking times will appear here when this skill is connected."
        />
      </main>
    </Screen>
  )
}

function SkillListing() {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Tech')
  const [rate, setRate] = useState('1.5')
  const [format, setFormat] = useState('online')
  const [activeDays, setActiveDays] = useState([0, 2, 3])
  const [published, setPublished] = useState(false)

  const toggleDay = (index) => {
    setActiveDays((currentDays) => (
      currentDays.includes(index)
        ? currentDays.filter((day) => day !== index)
        : [...currentDays, index]
    ))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setPublished(true)
  }

  return (
    <Screen active="exchange" className="design-shell">
      <Header back />
      <main className="design-page listing-page">
        <section className="design-heading">
          <div>
            <div className="step-line">
              <span>Step 1 of 3</span>
              <small>Community Exchange</small>
            </div>
            <h1>Offer a New Skill</h1>
          </div>
          <div className="heading-icon">
            <Icon>school</Icon>
          </div>
        </section>

        <section className="listing-card">
          <div className="listing-card-top">
            <span className="credit-badge">
              <Icon filled>monetization_on</Icon>
              Earn Time Credits
            </span>
            <span className="verified-state">
              <i />
              Peer Verified
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="skill-title">
              <span>Skill Title</span>
              <small>Max 60 chars</small>
            </label>
            <div className="input-with-icon">
              <input
                id="skill-title"
                value={title}
                maxLength="60"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Python Backend & Data Structures"
              />
              <Icon filled>verified</Icon>
            </div>

            <div className="field-group">
              <div className="field-label">
                <span>Category</span>
                <small>Selected: {category}</small>
              </div>
              <div className="choice-row">
                {listingCategories.map(([icon, item]) => (
                  <button
                    type="button"
                    key={item}
                    className={category === item ? 'choice active' : 'choice'}
                    onClick={() => setCategory(item)}
                  >
                    <Icon>{icon}</Icon>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <div className="field-label">
                <span>Time-Credit Rate</span>
                <small>Fair campus benchmark</small>
              </div>
              <div className="rate-grid">
                {['1.0', '1.5', '2.0'].map((item, index) => (
                  <button
                    type="button"
                    key={item}
                    className={rate === item ? 'rate-choice active' : 'rate-choice'}
                    onClick={() => setRate(item)}
                  >
                    {index === 1 && (
                      <b>
                        <Icon filled>star</Icon>
                        Popular
                      </b>
                    )}
                    <strong>{item}</strong>
                    <small>Credits/hr</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <div className="field-label">
                <span>Session Format</span>
              </div>
              <div className="format-grid">
                {[
                  ['online', 'videocam', 'Online Session', 'via CampusMeet'],
                  ['in-person', 'local_library', 'In-Person Space', 'Library Study Pod'],
                ].map(([value, icon, label, detail]) => (
                  <button
                    type="button"
                    key={value}
                    className={format === value ? 'format-choice active' : 'format-choice'}
                    onClick={() => setFormat(value)}
                  >
                    <span>
                      <Icon>{icon}</Icon>
                    </span>
                    <div>
                      <strong>{label}</strong>
                      <small>{detail}</small>
                    </div>
                    {format === value && <Icon filled>check_circle</Icon>}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <div className="field-label">
                <span>Weekly Availability</span>
                <small>{activeDays.length} Days Active</small>
              </div>
              <div className="day-row">
                {weekDays.map((day, index) => (
                  <button
                    type="button"
                    key={`${day}-${index}`}
                    className={activeDays.includes(index) ? 'day active' : 'day'}
                    onClick={() => toggleDay(index)}
                  >
                    <span>{day}</span>
                    {activeDays.includes(index) && <i />}
                  </button>
                ))}
              </div>
            </div>

            <div className="listing-summary">
              <span>
                <Icon>schedule</Icon>
                Recommended session: 45-60 min
              </span>
              <b>Skill listing</b>
            </div>

            <button className="primary-action" type="submit">
              {published ? 'Listing saved' : 'Publish Skill Listing (+1 Bonus Credit)'}
              <Icon>arrow_forward</Icon>
            </button>
          </form>
        </section>

        <section className="guarantee">
          <Icon>workspace_premium</Icon>
          <div>
            <h3>Campus Escrow Guarantee</h3>
            <p>Time credits are deposited right after mutual completion confirmation.</p>
          </div>
        </section>
      </main>
    </Screen>
  )
}

function Verification() {
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
              <small>JPG, PNG, or PDF • Must show valid semester & student name</small>
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

function Chat() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [rating, setRating] = useState(4)
  const [completed, setCompleted] = useState(false)

  const sendMessage = () => {
    const nextMessage = message.trim()
    if (!nextMessage) return
    setMessages((currentMessages) => [...currentMessages, nextMessage])
    setMessage('')
  }

  return (
    <div className="chat-shell">
      <header className="chat-header">
        <button className="round-control" onClick={goBack} aria-label="Go back">
          <Icon>arrow_back</Icon>
        </button>
        <div className="chat-person">
          <div className="generic-avatar">
            <Icon>person</Icon>
            <i />
          </div>
          <div>
            <h1>Direct Mentorship</h1>
            <span>Active session</span>
          </div>
        </div>
        <div className="chat-actions">
          <button aria-label="Call"><Icon>call</Icon></button>
          <button aria-label="More options"><Icon>more_vert</Icon></button>
        </div>
      </header>

      <div className="session-chip">
        <Icon>schedule</Icon>
        <span>Current mentorship session</span>
        <b>45m left</b>
      </div>

      <main className="chat-stream">
        <div className="date-stamp">Today</div>
        <div className="incoming-bubble">
          <p>Welcome to your mentorship session. Share a question or code note to get started.</p>
          <small>Session chat</small>
        </div>
        <div className="outgoing-bubble">
          <p>Your conversation will appear here.</p>
          <span>Ready <Icon>done_all</Icon></span>
        </div>

        <section className="video-card">
          <div className="video-heading">
            <span><Icon>video_camera_front</Icon></span>
            <div>
              <h3>CampusMeet Video Room</h3>
              <p>Live encrypted peer call</p>
            </div>
            <b>Active</b>
          </div>
          <p>
            Join the secure video room when you are ready. Screen sharing and a coding
            workspace are available during the session.
          </p>
          <div>
            <button onClick={() => setMessage('Joined the video session')}>
              <Icon>login</Icon>
              Join Video Session
            </button>
            <button aria-label="Copy room link"><Icon>content_copy</Icon></button>
          </div>
        </section>

        <section className="escrow-card">
          <div className="escrow-heading">
            <span><Icon filled>verified</Icon></span>
            <div>
              <h3>Session Escrow Hold</h3>
              <p>Time credits reserved for this session</p>
            </div>
            <b>{completed ? 'Released' : 'In Progress'}</b>
          </div>
          <div className="ledger-row">
            <span>
              <Icon>monetization_on</Icon>
              Time Credit Balance: <strong>-- hrs</strong>
            </span>
            <button>View ledger</button>
          </div>
          <div className="rating-row">
            <span>Rate this session:</span>
            <div>
              {[1, 2, 3, 4, 5].map((item) => (
                <button
                  key={item}
                  onClick={() => setRating(item)}
                  className={item <= rating ? 'selected' : ''}
                  aria-label={`Rate ${item} stars`}
                >
                  <Icon filled={item <= rating}>star</Icon>
                </button>
              ))}
            </div>
          </div>
          <button className="complete-button" onClick={() => setCompleted(true)} disabled={completed}>
            <Icon>check_circle</Icon>
            {completed ? 'Session completed' : 'Complete Session & Release Credits'}
          </button>
        </section>

        {messages.map((item, index) => (
          <div className="outgoing-bubble user-message" key={`${item}-${index}`}>
            <p>{item}</p>
            <span>Sent <Icon>done_all</Icon></span>
          </div>
        ))}
      </main>

      <footer className="chat-composer">
        <div className="quick-pills">
          <button onClick={() => setMessage('Sharing a code snippet')}>
            <Icon>code</Icon>Send Code Snippet
          </button>
          <button onClick={() => setMessage('Sharing a terminal log')}>
            <Icon>share</Icon>Share Terminal Log
          </button>
          <button onClick={() => setMessage('Add 15 minutes')}>
            <Icon>history</Icon>Add 15 mins
          </button>
        </div>
        <div className="composer-row">
          <button aria-label="Add attachment"><Icon>attach_file</Icon></button>
          <div>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
              placeholder="Type a message or code note..."
              aria-label="Message"
            />
            <button aria-label="Insert emoji"><Icon>sentiment_satisfied</Icon></button>
          </div>
          <button aria-label="Record voice note"><Icon>mic</Icon></button>
          <button className="send-button" onClick={sendMessage} aria-label="Send message">
            <Icon>send</Icon>
          </button>
        </div>
      </footer>
      <BottomNav active="sessions" />
    </div>
  )
}

function Login() {
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
      if (active && session) navigate('/')
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

    let signInError
    try {
      ({ error: signInError } = await supabase.auth.signInWithPassword({ email, password }))
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

    navigate('/')
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

  const handleOAuth = async (provider) => {
    setError('')
    setNotice('')

    if (!supabaseConfigured) {
      setError('Supabase is not configured. Add the client VITE_SUPABASE variables to continue.')
      return
    }

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
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
              <button onClick={() => setNotice('Campus SSO is not configured yet.')} aria-label="Campus SSO" title="Campus SSO">
                <Icon>school</Icon>
              </button>
              <button onClick={() => handleOAuth('google')} aria-label="Log in with Google" title="Google">
                <Icon>account_circle</Icon>
              </button>
              <button onClick={() => handleOAuth('apple')} aria-label="Log in with Apple" title="Apple">
                <Icon>phone_iphone</Icon>
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

function App() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const updatePath = () => setPath(window.location.pathname)
    window.addEventListener('popstate', updatePath)
    return () => window.removeEventListener('popstate', updatePath)
  }, [])

  if (path === '/sessions') return <Sessions />
  if (path === '/wallet') return <Wallet />
  if (path === '/skill-detail') return <SkillDetail />
  if (path === '/skill-listing') return <SkillListing />
  if (path === '/verification') return <Verification />
  if (path === '/chat') return <Chat />
  if (path === '/login') return <Login />
  return <Exchange />
}

export default App
