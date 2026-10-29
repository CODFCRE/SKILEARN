import { useEffect, useState } from 'react'
import { EmptyState, Header, Icon, Screen } from '../../shared/components.jsx'
import { navigate } from '../../shared/lib/navigation.js'
import { supabase } from '../../shared/lib/supabase.js'

const sessionStates = {
  upcoming: ['event_busy', 'No upcoming sessions', 'Your scheduled sessions will appear here.'],
  completed: ['history', 'No completed sessions', 'Your completed sessions will appear here.'],
  messages: ['forum', 'No messages', 'Messages with other users will appear here.'],
}

export function Sessions() {
  const [tab, setTab] = useState('upcoming')
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadSessions = async () => {
      if (!supabase) return
      setLoading(true)
      setError('')

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!authData.user) {
          if (active) setSessions([])
          return
        }

        const { data: sessionRows, error: sessionsError } = await supabase
          .from('sessions')
          .select('id,skill_id,mentor_id,learner_id,starts_at,ends_at,status,credits_reserved,session_format')
          .or(`mentor_id.eq.${authData.user.id},learner_id.eq.${authData.user.id}`)
          .order('starts_at', { ascending: false })
        if (sessionsError) throw sessionsError

        const ids = [...new Set((sessionRows || []).flatMap((session) => [
          session.mentor_id,
          session.learner_id,
        ]))]
        const skillIds = [...new Set((sessionRows || []).map((session) => session.skill_id))]
        const sessionIds = (sessionRows || []).map((session) => session.id)
        const [profilesResult, skillsResult, messagesResult] = await Promise.all([
          ids.length
            ? supabase.from('profiles').select('id,display_name').in('id', ids)
            : Promise.resolve({ data: [], error: null }),
          skillIds.length
            ? supabase.from('skills').select('id,title').in('id', skillIds)
            : Promise.resolve({ data: [], error: null }),
          sessionIds.length
            ? supabase.from('session_messages').select('id,session_id,sender_id,body,sent_at')
              .in('session_id', sessionIds).order('sent_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
        ])
        if (profilesResult.error) throw profilesResult.error
        if (skillsResult.error) throw skillsResult.error
        if (messagesResult.error) throw messagesResult.error

        const profiles = Object.fromEntries((profilesResult.data || []).map((profile) => [profile.id, profile]))
        const skills = Object.fromEntries((skillsResult.data || []).map((skill) => [skill.id, skill]))
        const latestMessages = new Map()
        for (const message of messagesResult.data || []) {
          if (!latestMessages.has(message.session_id)) latestMessages.set(message.session_id, message)
        }
        const relatedSessions = (sessionRows || []).map((session) => ({
          ...session,
          skillTitle: skills[session.skill_id]?.title || 'Skill session',
          latestMessage: latestMessages.get(session.id) || null,
          peerName: profiles[
            session.mentor_id === authData.user.id ? session.learner_id : session.mentor_id
          ]?.display_name || 'Campus member',
        }))

        if (active) setSessions(relatedSessions)
      } catch (requestError) {
        console.error('Unable to load sessions:', requestError)
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load sessions.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSessions()
    return () => {
      active = false
    }
  }, [])

  const visibleSessions = sessions.filter((session) => {
    if (tab === 'completed') return session.status === 'completed'
    if (tab === 'messages') return ['confirmed', 'in_progress', 'completed'].includes(session.status)
    return !['completed', 'cancelled'].includes(session.status)
  })
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
        {error && <div className="profile-error" role="alert">{error}</div>}
        {loading ? (
          <div className="profile-loading" role="status">Loading your sessions...</div>
        ) : visibleSessions.length ? (
          <div className="session-list">
            {visibleSessions.map((session) => (
              <article className="session-data-card" key={session.id}>
                <div className="session-data-icon"><Icon>event</Icon></div>
                <div className="session-data-copy">
                  <h2>{session.skillTitle}</h2>
                  <p>
                    {tab === 'messages'
                      ? session.latestMessage?.body || `No messages yet · Chat with ${session.peerName}`
                      : `With ${session.peerName}`}
                  </p>
                  <span>
                    {tab === 'messages' && session.latestMessage
                      ? new Date(session.latestMessage.sent_at).toLocaleString()
                      : new Date(session.starts_at).toLocaleString()}
                    {' · '}{session.status.replaceAll('_', ' ')}
                  </span>
                </div>
                <div className="session-data-actions">
                  <strong>{Number(session.credits_reserved).toFixed(2)} Cr</strong>
                  <button type="button" onClick={() => navigate('/chat', { sessionId: session.id })}>
                    <Icon>forum</Icon>{tab === 'messages' ? 'Open chat' : 'Message'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={icon}
            title={title}
            text={supabase ? text : 'Configure Supabase to load your sessions.'}
          />
        )}
      </main>
    </Screen>
  )
}
