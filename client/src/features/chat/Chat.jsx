import { useEffect, useState } from 'react'
import { Icon } from '../../shared/components.jsx'
import { goBack, navigate } from '../../shared/lib/navigation.js'
import { supabase } from '../../shared/lib/supabase.js'

export function Chat() {
  const sessionId = window.history.state?.sessionId
  const [userId, setUserId] = useState(null)
  const [session, setSession] = useState(null)
  const [peerName, setPeerName] = useState('Campus member')
  const [settlementDone, setSettlementDone] = useState(false)
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [sending, setSending] = useState(false)
  const [confirmingCompletion, setConfirmingCompletion] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    const loadChat = async () => {
      if (!supabase || !sessionId) {
        setLoading(false)
        setError(!supabase ? 'Supabase is not configured.' : 'No session was selected. Open a chat from My Sessions.')
        return
      }

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!authData.user) throw new Error('Sign in to view session messages.')

        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('id,skill_id,mentor_id,learner_id,starts_at,ends_at,status,credits_reserved,mentor_completed_at,learner_completed_at')
          .eq('id', sessionId)
          .maybeSingle()
        if (sessionError) throw sessionError
        if (!sessionData) throw new Error('This session is unavailable or you do not have access.')

        const peerId = sessionData.mentor_id === authData.user.id
          ? sessionData.learner_id
          : sessionData.mentor_id
        const [profileResult, skillResult, messagesResult, ratingResult, settlementResult] = await Promise.all([
          supabase.from('profiles').select('display_name').eq('id', peerId).maybeSingle(),
          supabase.from('skills').select('title').eq('id', sessionData.skill_id).maybeSingle(),
          supabase.from('session_messages').select('id,sender_id,body,sent_at')
            .eq('session_id', sessionId).order('sent_at', { ascending: true }),
          supabase.from('session_ratings').select('rating')
            .eq('session_id', sessionId).eq('reviewer_id', authData.user.id).maybeSingle(),
          supabase.from('credit_ledger').select('id')
            .eq('session_id', sessionId).eq('user_id', authData.user.id).maybeSingle(),
        ])
        for (const result of [profileResult, skillResult, messagesResult, ratingResult, settlementResult]) {
          if (result.error) throw result.error
        }

        if (active) {
          setUserId(authData.user.id)
          setSession({ ...sessionData, skillTitle: skillResult.data?.title || 'Skill session' })
          setPeerName(profileResult.data?.display_name || 'Campus member')
          setMessages(messagesResult.data || [])
          setRating(ratingResult.data?.rating || 0)
          setSettlementDone(Boolean(settlementResult.data))
        }
      } catch (requestError) {
        console.error('Unable to load session chat:', requestError)
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load session chat.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadChat()
    return () => {
      active = false
    }
  }, [sessionId])

  const sendMessage = async (event) => {
    event?.preventDefault()
    const body = message.trim()
    if (!body || !supabase || !sessionId || !userId || sending) return

    setSending(true)
    setError('')
    try {
      const { data, error: sendError } = await supabase
        .from('session_messages')
        .insert({ session_id: sessionId, sender_id: userId, body })
        .select('id,sender_id,body,sent_at')
        .single()
      if (sendError) throw sendError
      setMessages((current) => [...current, data])
      setMessage('')
    } catch (requestError) {
      console.error('Unable to send session message:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to send message.')
    } finally {
      setSending(false)
    }
  }

  const completeSession = async () => {
    if (!supabase || !session || confirmingCompletion) return
    setError('')
    setNotice('')
    setConfirmingCompletion(true)
    try {
      const { data, error: completionError } = await supabase.rpc('complete_session', {
        p_session_id: session.id,
      })
      if (completionError) throw completionError
      if (!data || typeof data.status !== 'string' || typeof data.settled !== 'boolean') {
        throw new Error('The session completion response was invalid. Please reload and try again.')
      }

      setSession((current) => ({ ...current, ...data }))
      setSettlementDone(data.settled)
      setNotice(data.settled
        ? `${Number(session.credits_reserved).toFixed(2)} credits transferred to the session giver.`
        : 'Your confirmation is saved. The session will settle after the other participant confirms.')
    } catch (requestError) {
      console.error('Unable to complete session:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to complete this session.')
    } finally {
      setConfirmingCompletion(false)
    }
  }

  const isMentor = session?.mentor_id === userId
  const currentUserConfirmed = isMentor
    ? Boolean(session?.mentor_completed_at)
    : Boolean(session?.learner_completed_at)
  const otherParticipantConfirmed = isMentor
    ? Boolean(session?.learner_completed_at)
    : Boolean(session?.mentor_completed_at)

  const submitRating = async (value) => {
    if (!supabase || !session || !userId) return
    setError('')
    try {
      const revieweeId = session.mentor_id === userId ? session.learner_id : session.mentor_id
      const { error: ratingError } = await supabase.from('session_ratings').insert({
        session_id: session.id,
        reviewer_id: userId,
        reviewee_id: revieweeId,
        rating: value,
      })
      if (ratingError) throw ratingError
      setRating(value)
      setNotice('Your rating was saved.')
    } catch (requestError) {
      console.error('Unable to save session rating:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to save your rating.')
    }
  }

  if (loading) {
    return <main className="chat-state"><div className="profile-loading">Loading session...</div></main>
  }

  if (!session) {
    return (
      <main className="chat-state">
        <div className="profile-error" role="alert">{error || 'Session unavailable.'}</div>
        <button className="login-submit" onClick={() => navigate('/sessions')}>Back to sessions</button>
      </main>
    )
  }

  return (
    <div className="chat-shell">
      <header className="chat-header">
        <button className="round-control" onClick={goBack} aria-label="Go back"><Icon>arrow_back</Icon></button>
        <div className="chat-person">
          <div className="generic-avatar"><Icon>person</Icon><i /></div>
          <div>
            <h1>{peerName}</h1>
            <span>{session.skillTitle} · {session.status.replaceAll('_', ' ')}</span>
          </div>
        </div>
      </header>

      <div className="session-chip">
        <Icon>schedule</Icon>
        <span>{new Date(session.starts_at).toLocaleString()}</span>
        <b>{Number(session.credits_reserved).toFixed(2)} Cr</b>
      </div>

      <main className="chat-stream">
        {error && <div className="profile-error" role="alert">{error}</div>}
        {notice && <p className="listing-feedback success" role="status">{notice}</p>}
        {messages.length ? messages.map((item) => {
          const mine = item.sender_id === userId
          return (
            <div className={mine ? 'outgoing-bubble user-message' : 'incoming-bubble'} key={item.id}>
              <p>{item.body}</p>
              <small>{new Date(item.sent_at).toLocaleString()}</small>
            </div>
          )
        }) : (
          <div className="empty-state">
            <Icon>forum</Icon>
            <h2>No messages yet</h2>
            <p>Messages sent in this session will appear here.</p>
          </div>
        )}

        {session.status !== 'cancelled' && (session.status !== 'completed' || !settlementDone) && (
          <section className="escrow-card">
            <div className="escrow-heading">
              <span><Icon filled>verified</Icon></span>
              <div>
                <h3>Session status</h3>
                <p>{session.status.replaceAll('_', ' ')}</p>
                <small>
                  {currentUserConfirmed
                    ? 'Your completion is confirmed; waiting for the other participant.'
                    : otherParticipantConfirmed
                      ? 'The other participant confirmed. Confirm to settle the credits.'
                      : 'Both participants must confirm before credits are transferred.'}
                </small>
              </div>
              <b>{Number(session.credits_reserved).toFixed(2)} Cr</b>
            </div>
            <button
              className="complete-button"
              onClick={completeSession}
              disabled={confirmingCompletion || currentUserConfirmed}
            >
              <Icon>check_circle</Icon>
              {confirmingCompletion
                ? 'Saving confirmation...'
                : currentUserConfirmed
                  ? 'Completion confirmed'
                  : 'Confirm session complete'}
            </button>
          </section>
        )}

        {session.status === 'completed' && settlementDone && !rating && (
          <section className="escrow-card">
            <div className="rating-row">
              <span>Rate {peerName}:</span>
              <div>
                {[1, 2, 3, 4, 5].map((item) => (
                  <button key={item} onClick={() => submitRating(item)} aria-label={`Rate ${item} stars`}>
                    <Icon filled={item <= rating}>star</Icon>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <form className="chat-composer" onSubmit={sendMessage}>
        <div className="composer-row">
          <div>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type a message..."
              aria-label="Message"
              maxLength={5000}
            />
          </div>
          <button className="send-button" type="submit" disabled={sending || !message.trim()} aria-label="Send message">
            <Icon>send</Icon>
          </button>
        </div>
      </form>
    </div>
  )
}
