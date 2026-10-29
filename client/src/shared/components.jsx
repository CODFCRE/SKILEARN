import { useEffect, useState } from 'react'
import { goBack, navigate } from './lib/navigation.js'
import { applyTheme, getThemePreference } from './lib/theme.js'
import { supabase } from './lib/supabase.js'

const navigationItems = [
  ['exchange', 'swap_horiz', 'Exchange'],
  ['sessions', 'event', 'Sessions'],
  ['wallet', 'monetization_on', 'Credits'],
  ['profile', 'person', 'Profile'],
]

export function Icon({ children, filled = false }) {
  return (
    <span className={`material-symbols-outlined${filled ? ' filled' : ''}`}>
      {children}
    </span>
  )
}

export function Header({ back = false, help = false, rightAction }) {
  const [theme, setTheme] = useState(getThemePreference)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    const updateTheme = (event) => setTheme(event.detail)
    window.addEventListener('skilearn-theme-change', updateTheme)
    return () => window.removeEventListener('skilearn-theme-change', updateTheme)
  }, [])

  useEffect(() => {
    if (!notificationsOpen) return undefined

    let active = true
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setNotificationsOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    const loadNotifications = async () => {
      setNotificationsLoading(true)
      setNotificationsError('')

      if (!supabase) {
        setNotificationsError('Supabase is not configured.')
        setNotificationsLoading(false)
        return
      }

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!authData.user) {
          if (active) {
            setSignedIn(false)
            setNotifications([])
          }
          return
        }

        const { data: sessionRows, error: sessionsError } = await supabase
          .from('sessions')
          .select('id,skill_id,mentor_id,learner_id,status,starts_at,created_at')
          .or(`mentor_id.eq.${authData.user.id},learner_id.eq.${authData.user.id}`)
          .order('created_at', { ascending: false })
          .limit(30)
        if (sessionsError) throw sessionsError

        const skillIds = [...new Set((sessionRows || []).map((session) => session.skill_id))]
        const peerIds = [...new Set((sessionRows || []).map((session) => (
          session.mentor_id === authData.user.id ? session.learner_id : session.mentor_id
        )))]
        const [skillsResult, profilesResult] = await Promise.all([
          skillIds.length
            ? supabase.from('skills').select('id,title').in('id', skillIds)
            : Promise.resolve({ data: [], error: null }),
          peerIds.length
            ? supabase.from('profiles').select('id,display_name').in('id', peerIds)
            : Promise.resolve({ data: [], error: null }),
        ])
        if (skillsResult.error) throw skillsResult.error
        if (profilesResult.error) throw profilesResult.error

        const skills = Object.fromEntries((skillsResult.data || []).map((skill) => [skill.id, skill]))
        const profiles = Object.fromEntries((profilesResult.data || []).map((profile) => [profile.id, profile]))
        if (active) {
          setSignedIn(true)
          setNotifications((sessionRows || []).map((session) => {
            const peerId = session.mentor_id === authData.user.id
              ? session.learner_id
              : session.mentor_id
            return {
              ...session,
              skillTitle: skills[session.skill_id]?.title || 'Skill session',
              peerName: profiles[peerId]?.display_name || 'Campus member',
            }
          }))
        }
      } catch (error) {
        console.error('Unable to load notifications:', error)
        if (active) {
          setNotificationsError(error instanceof Error ? error.message : 'Unable to load notifications.')
          setNotifications([])
        }
      } finally {
        if (active) setNotificationsLoading(false)
      }
    }

    loadNotifications()
    return () => {
      active = false
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [notificationsOpen])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    applyTheme(nextTheme)
  }

  const notificationGroups = notifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const notificationDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const daysAgo = (today - notificationDay) / 86400000
    const group = daysAgo < 1 ? 'Today' : daysAgo < 7 ? 'This week' : 'Earlier'
    groups[group].push(notification)
    return groups
  }, { Today: [], 'This week': [], Earlier: [] })

  return (
    <>
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
            <button
              className="icon-button theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              aria-pressed={theme === 'dark'}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              <span className="theme-toggle-icon sun"><Icon>light_mode</Icon></span>
              <span className="theme-toggle-icon moon"><Icon>dark_mode</Icon></span>
              <span className="theme-toggle-thumb" />
            </button>
            {rightAction || (
              <button
                className="icon-button notification-trigger"
                type="button"
                aria-label={help ? 'Help' : 'Notifications'}
                aria-expanded={!help && notificationsOpen}
                onClick={() => {
                  if (!help) setNotificationsOpen(true)
                }}
              >
                <Icon>{help ? 'help_outline' : 'notifications'}</Icon>
              </button>
            )}
          </div>
        </div>
      </header>
      {notificationsOpen && (
        <div
          className="notification-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setNotificationsOpen(false)
          }}
        >
          <section
            className="notification-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-panel-title"
          >
            <header className="notification-panel-header">
              <button
                className="notification-back"
                type="button"
                onClick={() => setNotificationsOpen(false)}
                aria-label="Close notifications"
              >
                <Icon>arrow_back</Icon>
              </button>
              <div>
                <h1 id="notification-panel-title">Notifications</h1>
                <p>Recent activity from your sessions</p>
              </div>
            </header>
            <div className="notification-panel-content" aria-live="polite">
              {notificationsLoading ? (
                <p className="notification-state" role="status">Loading your activity...</p>
              ) : notificationsError ? (
                <div className="notification-state notification-error" role="alert">
                  <p>{notificationsError}</p>
                  <button type="button" onClick={() => setNotificationsOpen(false)}>Close</button>
                </div>
              ) : !signedIn ? (
                <div className="notification-state">
                  <Icon>notifications_none</Icon>
                  <h2>Sign in to view activity</h2>
                  <p>Your session updates will appear here.</p>
                  <button type="button" onClick={() => navigate('/login')}>Sign in</button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="notification-state">
                  <Icon>notifications_none</Icon>
                  <h2>No notifications yet</h2>
                  <p>Updates about your skill sessions will appear here.</p>
                </div>
              ) : (
                ['Today', 'This week', 'Earlier'].map((group) => (
                  notificationGroups[group].length > 0 && (
                    <section className="notification-group" key={group} aria-label={group}>
                      <h2>{group}</h2>
                      <div className="notification-list">
                        {notificationGroups[group].map((notification) => (
                          <button
                            className="notification-row"
                            type="button"
                            key={notification.id}
                            onClick={() => {
                              setNotificationsOpen(false)
                              navigate('/sessions')
                            }}
                          >
                            <span className="notification-icon">
                              <Icon>
                                {notification.status === 'confirmed'
                                  ? 'event_available'
                                  : notification.status === 'completed'
                                    ? 'task_alt'
                                    : notification.status === 'cancelled'
                                      ? 'event_busy'
                                      : 'event'}
                              </Icon>
                            </span>
                            <span className="notification-copy">
                              <strong>{notification.skillTitle}</strong>
                              <span>
                                Session {notification.status.replaceAll('_', ' ')} with {notification.peerName}
                              </span>
                              <time dateTime={notification.created_at}>
                                {new Date(notification.created_at).toLocaleString()}
                              </time>
                            </span>
                            <Icon>chevron_right</Icon>
                          </button>
                        ))}
                      </div>
                    </section>
                  )
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}

export function BottomNav({ active }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <div className="nav-brand" aria-label="Skilearn">
        <span className="nav-brand-icon"><Icon>auto_stories</Icon></span>
        <span className="nav-brand-name">Skilearn</span>
      </div>
      <div className="bottom-nav-inner">
        {navigationItems.map(([key, icon, label]) => (
          <button
            key={key}
            type="button"
            className={active === key ? 'nav-item active' : 'nav-item'}
            aria-label={label}
            aria-current={active === key ? 'page' : undefined}
            onClick={() => navigate(key === 'exchange' ? '/' : key === 'profile' ? '/profile' : `/${key}`)}
          >
            <Icon filled={active === key}>{icon}</Icon>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export function Screen({ children, active, className = '' }) {
  return (
    <div className={`app-shell ${className}`.trim()}>
      {children}
      {active && <BottomNav active={active} />}
    </div>
  )
}

export function EmptyState({ icon, title, text }) {
  return (
    <div className="empty-state">
      <Icon>{icon}</Icon>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )
}