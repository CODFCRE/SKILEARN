import { useEffect, useState } from 'react'
import { Header, Icon, Screen } from '../../shared/components.jsx'
import { navigate } from '../../shared/lib/navigation.js'
import { supabase } from '../../shared/lib/supabase.js'

export function MessagesInbox() {
  const [threads, setThreads] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const loadThreads = async () => {
      if (!supabase) {
        setError('Supabase is not configured.')
        setLoading(false)
        return
      }

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!authData.user) throw new Error('Sign in to view your messages.')

        const { data: threadRows, error: threadError } = await supabase
          .from('direct_message_threads')
          .select('id,user_one,user_two,created_at')
          .or(`user_one.eq.${authData.user.id},user_two.eq.${authData.user.id}`)
          .order('created_at', { ascending: false })
        if (threadError) throw threadError

        const peerIds = [...new Set((threadRows || []).map((thread) => (
          thread.user_one === authData.user.id ? thread.user_two : thread.user_one
        )))]
        const [profilesResult, messagesResult] = await Promise.all([
          peerIds.length
            ? supabase.from('profiles').select('id,display_name,avatar_path').in('id', peerIds)
            : Promise.resolve({ data: [], error: null }),
          threadRows?.length
            ? supabase.from('direct_messages')
              .select('id,thread_id,sender_id,body,sent_at,message_type')
              .in('thread_id', threadRows.map((thread) => thread.id))
              .order('sent_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
        ])
        if (profilesResult.error) throw profilesResult.error
        if (messagesResult.error) throw messagesResult.error

        const profiles = Object.fromEntries((profilesResult.data || []).map((profile) => [profile.id, profile]))
        const latestByThread = {}
        for (const message of messagesResult.data || []) {
          if (!latestByThread[message.thread_id]) latestByThread[message.thread_id] = message
        }

        const avatarEntries = await Promise.all((profilesResult.data || []).map(async (profile) => {
          if (!profile.avatar_path) return [profile.id, '']
          const { data } = await supabase.storage.from('files').createSignedUrl(profile.avatar_path, 3600)
          return [profile.id, data?.signedUrl || '']
        }))
        const avatars = Object.fromEntries(avatarEntries)

        if (active) {
          setThreads((threadRows || []).map((thread) => {
            const peerId = thread.user_one === authData.user.id ? thread.user_two : thread.user_one
            const peer = profiles[peerId] || {}
            const latest = latestByThread[thread.id]
            return {
              ...thread,
              peerId,
              peerName: peer.display_name || 'Campus member',
              avatarUrl: avatars[peerId] || '',
              latest,
            }
          }).sort((a, b) => {
            const aTime = a.latest ? new Date(a.latest.sent_at).getTime() : new Date(a.created_at).getTime()
            const bTime = b.latest ? new Date(b.latest.sent_at).getTime() : new Date(b.created_at).getTime()
            return bTime - aTime
          }))
        }
      } catch (requestError) {
        console.error('Unable to load messages:', requestError)
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load messages.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadThreads()
    return () => { active = false }
  }, [])

  const normalizedQuery = query.trim().toLowerCase()
  const filteredThreads = threads.filter((thread) =>
    `${thread.peerName} ${thread.latest?.body || ''}`.toLowerCase().includes(normalizedQuery),
  )

  return (
    <Screen active="messages" className="messages-inbox-shell">
      <Header />
      <main className="messages-inbox">
        <div className="messages-inbox-heading">
          <div>
            <p className="messages-eyebrow">Skilearn community</p>
            <h1>Messages</h1>
          </div>
          <button
            className="round-control"
            type="button"
            aria-label="Find people"
            onClick={() => navigate('/')}
          >
            <Icon>person_add</Icon>
          </button>
        </div>

        <div className="messages-search">
          <Icon>search</Icon>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
          />
        </div>

        {error && <div className="profile-error" role="alert">{error}</div>}
        {loading ? (
          <div className="profile-loading" role="status">Loading conversations...</div>
        ) : filteredThreads.length ? (
          <div className="messages-thread-list">
            {filteredThreads.map((thread) => (
              <button
                className="messages-thread-row"
                type="button"
                key={thread.id}
                onClick={() => navigate(`/direct-message?memberId=${encodeURIComponent(thread.peerId)}`, {
                  memberId: thread.peerId,
                  threadId: thread.id,
                })}
              >
                {thread.avatarUrl
                  ? <img className="messages-avatar" src={thread.avatarUrl} alt="" />
                  : <span className="messages-avatar messages-avatar-placeholder"><Icon>person</Icon></span>}
                <span className="messages-thread-copy">
                  <strong>{thread.peerName}</strong>
                  <span>
                    {thread.latest?.message_type === 'voice'
                      ? 'Voice note'
                      : thread.latest?.message_type === 'image'
                        ? 'Photo'
                        : thread.latest?.message_type === 'file'
                          ? 'File'
                          : thread.latest?.body || 'Start a conversation'}
                  </span>
                </span>
                {thread.latest && (
                  <time dateTime={thread.latest.sent_at}>
                    {new Date(thread.latest.sent_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </time>
                )}
                <Icon>chevron_right</Icon>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state messages-inbox-empty">
            <Icon>forum</Icon>
            <h2>{query ? 'No conversations found' : 'No messages yet'}</h2>
            <p>{query ? 'Try another name or phrase.' : 'Open someone’s profile to start a direct message.'}</p>
          </div>
        )}
      </main>
    </Screen>
  )
}
