import { useState } from 'react'
import { BottomNav, Icon } from '../../shared/components.jsx'
import { goBack } from '../../shared/lib/navigation.js'
export function Chat() {
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

