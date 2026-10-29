import { useState } from 'react'
import { EmptyState, Header, Screen } from '../../shared/components.jsx'

const sessionStates = {
  upcoming: ['event_busy', 'No upcoming sessions', 'Your scheduled sessions will appear here.'],
  completed: ['history', 'No completed sessions', 'Your completed sessions will appear here.'],
  messages: ['forum', 'No messages', 'Messages with other users will appear here.'],
}
export function Sessions() {
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

