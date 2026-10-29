import { goBack, navigate } from './lib/navigation.js'

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
          {rightAction || (
            <button className="icon-button" aria-label={help ? 'Help' : 'Notifications'}>
              <Icon>{help ? 'help_outline' : 'notifications'}</Icon>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export function BottomNav({ active }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {navigationItems.map(([key, icon, label]) => (
        <button
          key={key}
          className={active === key ? 'nav-item active' : 'nav-item'}
          onClick={() => navigate(key === 'exchange' ? '/' : key === 'profile' ? '/profile' : `/${key}`)}
        >
          <Icon filled={active === key}>{icon}</Icon>
          <span>{label}</span>
        </button>
      ))}
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