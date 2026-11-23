import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../shared/components.jsx'
import { goBack, navigate } from '../../shared/lib/navigation.js'
import { supabase } from '../../shared/lib/supabase.js'
import { sendPushNotification } from '../../shared/lib/notifications.js'

function orderedParticipants(firstId, secondId) {
  return firstId < secondId
    ? { user_one: firstId, user_two: secondId }
    : { user_one: secondId, user_two: firstId }
}

function mergeMessages(current, incoming) {
  const messagesById = new Map(current.map((item) => [item.id, item]))
  incoming.forEach((item) => messagesById.set(item.id, item))
  return [...messagesById.values()].sort(
    (first, second) => new Date(first.sent_at).getTime() - new Date(second.sent_at).getTime(),
  )
}

export function DirectMessage() {
  const memberId = window.history.state?.memberId
    || new URLSearchParams(window.location.search).get('memberId')
  const [userId, setUserId] = useState(null)
  const [thread, setThread] = useState(null)
  const [peerName, setPeerName] = useState('Campus member')
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [requestingCall, setRequestingCall] = useState(false)
  const [recording, setRecording] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [error, setError] = useState('')
  const streamRef = useRef(null)
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const recorderRef = useRef(null)
  const recorderChunksRef = useRef([])
  const recordingStartedRef = useRef(0)

  const hydrateAttachments = async (rows) => {
    if (!supabase) return rows
    return Promise.all((rows || []).map(async (item) => {
      if (!item.attachment_path) return item
      const { data, error: signedUrlError } = await supabase.storage
        .from('files')
        .createSignedUrl(item.attachment_path, 3600)
      if (signedUrlError) {
        console.error('Unable to create attachment URL:', signedUrlError)
        return item
      }
      return { ...item, attachmentUrl: data?.signedUrl || '' }
    }))
  }

  useEffect(() => {
    let active = true
    const loadDirectMessage = async () => {
      if (!supabase || !memberId) {
        setError(!supabase ? 'Supabase is not configured.' : 'No member was selected.')
        setLoading(false)
        return
      }

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!authData.user) throw new Error('Sign in to send a direct message.')
        if (authData.user.id === memberId) throw new Error('You cannot message your own profile.')

        const peerResult = await supabase.from('profiles')
          .select('id,display_name')
          .eq('id', memberId)
          .maybeSingle()
        if (peerResult.error) throw peerResult.error
        if (!peerResult.data) throw new Error('This profile is unavailable.')

        const participants = orderedParticipants(authData.user.id, memberId)
        let { data: threadData, error: threadError } = await supabase
          .from('direct_message_threads')
          .select('id,user_one,user_two')
          .eq('user_one', participants.user_one)
          .eq('user_two', participants.user_two)
          .maybeSingle()
        if (threadError) throw threadError

        if (!threadData) {
          const createdThread = await supabase
            .from('direct_message_threads')
            .insert(participants)
            .select('id,user_one,user_two')
            .single()
          if (createdThread.error?.code === '23505') {
            const existingThread = await supabase
              .from('direct_message_threads')
              .select('id,user_one,user_two')
              .eq('user_one', participants.user_one)
              .eq('user_two', participants.user_two)
              .single()
            if (existingThread.error) throw existingThread.error
            threadData = existingThread.data
          } else {
            if (createdThread.error) throw createdThread.error
            threadData = createdThread.data
          }
        }

        const { data: messageRows, error: messagesError } = await supabase
          .from('direct_messages')
          .select('id,sender_id,body,sent_at,message_type,attachment_path,attachment_name,attachment_mime,attachment_size,voice_duration_seconds')
          .eq('thread_id', threadData.id)
          .order('sent_at', { ascending: true })
        if (messagesError) throw messagesError

        if (active) {
          setUserId(authData.user.id)
          setPeerName(peerResult.data.display_name || 'Campus member')
          setThread(threadData)
          const hydrated = await hydrateAttachments(messageRows || [])
          setMessages(hydrated)
        }
      } catch (requestError) {
        console.error('Unable to open direct messages:', requestError)
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to open this conversation.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadDirectMessage()
    return () => {
      active = false
    }
  }, [memberId])

  useEffect(() => {
    if (!thread || !supabase) return undefined

    let active = true
    let checking = false
    const refreshMessages = async () => {
      if (checking) return
      checking = true
      try {
        const { data, error: messagesError } = await supabase
          .from('direct_messages')
          .select('id,sender_id,body,sent_at,message_type,attachment_path,attachment_name,attachment_mime,attachment_size,voice_duration_seconds')
          .eq('thread_id', thread.id)
          .order('sent_at', { ascending: true })
        if (messagesError) throw messagesError
        if (active) {
          const hydrated = await hydrateAttachments(data || [])
          setMessages((current) => mergeMessages(current, hydrated))
        }
      } catch (requestError) {
        console.error('Unable to refresh direct messages:', requestError)
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to refresh messages.')
      } finally {
        checking = false
      }
    }
    const interval = window.setInterval(() => { void refreshMessages() }, 3000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [thread])

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight
  }, [messages])

  const sendMessage = async (event) => {
    event.preventDefault()
    const body = message.trim()
    if (!body || !supabase || !thread || !userId || sending) return

    setSending(true)
    setError('')
    try {
      const { data, error: sendError } = await supabase
        .from('direct_messages')
        .insert({ thread_id: thread.id, sender_id: userId, body })
        .select('id,sender_id,body,sent_at,message_type,attachment_path,attachment_name,attachment_mime,attachment_size,voice_duration_seconds')
        .single()
      if (sendError) throw sendError
      setMessages((current) => mergeMessages(current, [data]))
      setMessage('')
      void sendPushNotification({
        recipientId: memberId,
        type: 'message',
        title: 'New message',
        body,
        route: `/direct-message?memberId=${encodeURIComponent(userId)}`,
        data: { threadId: thread.id },
      })
    } catch (requestError) {
      console.error('Unable to send direct message:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to send your message.')
    } finally {
      setSending(false)
    }
  }

  const requestCall = async (callType) => {
    if (!supabase || !userId || !memberId || requestingCall) return
    setRequestingCall(true)
    setError('')
    try {
      const { data, error: callError } = await supabase
        .from('call_sessions')
        .insert({ caller_id: userId, recipient_id: memberId, status: 'ringing', call_type: callType })
        .select('id')
        .single()
      if (callError) throw callError
      void sendPushNotification({
        recipientId: memberId,
        type: 'call',
        title: callType === 'phone' ? 'Incoming voice call' : 'Incoming video call',
        body: 'Someone is calling you',
        route: `/call?callId=${encodeURIComponent(data.id)}`,
        data: { callId: data.id, callType },
      })
      navigate(`/call?callId=${encodeURIComponent(data.id)}`, {
        callId: data.id,
        direction: 'outgoing',
        callType,
      })
    } catch (requestError) {
      console.error('Unable to request video call:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to request a video call.')
    } finally {
      setRequestingCall(false)
    }
  }

  const uploadAttachment = async (file, messageType) => {
    if (!file || !supabase || !thread || !userId || uploadingAttachment) return
    setUploadingAttachment(true)
    setError('')
    try {
      const extension = file.name?.split('.').pop()?.toLowerCase() || 'bin'
      const path = `${userId}/direct-messages/${thread.id}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(path, file, { upsert: false, contentType: file.type })
      if (uploadError) throw uploadError

      const body = messageType === 'image' ? 'Photo' : messageType === 'voice' ? 'Voice note' : file.name
      const { data, error: sendError } = await supabase
        .from('direct_messages')
        .insert({
          thread_id: thread.id,
          sender_id: userId,
          body,
          message_type: messageType,
          attachment_path: path,
          attachment_name: file.name,
          attachment_mime: file.type,
          attachment_size: file.size,
          voice_duration_seconds: messageType === 'voice'
            ? Math.max(1, Math.round((Date.now() - recordingStartedRef.current) / 1000))
            : null,
        })
        .select('id,sender_id,body,sent_at,message_type,attachment_path,attachment_name,attachment_mime,attachment_size,voice_duration_seconds')
        .single()
      if (sendError) throw sendError
      const hydrated = await hydrateAttachments([data])
      setMessages((current) => mergeMessages(current, hydrated))
    } catch (requestError) {
      console.error('Unable to share attachment:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to share this attachment.')
    } finally {
      setUploadingAttachment(false)
    }
  }

  const toggleVoiceRecording = async () => {
    if (recording) {
      recorderRef.current?.stop()
      setRecording(false)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Voice recording is not supported in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new window.MediaRecorder(stream)
      recorderChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) recorderChunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(recorderChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        await uploadAttachment(new File([blob], `voice-note-${Date.now()}.webm`, { type: blob.type }), 'voice')
      }
      recordingStartedRef.current = Date.now()
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
    } catch (requestError) {
      console.error('Unable to start voice recording:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to start voice recording.')
    }
  }

  if (loading) {
    return <main className="chat-state"><div className="profile-loading" role="status">Opening conversation...</div></main>
  }

  if (!thread) {
    return (
      <main className="chat-state">
        <div className="profile-error" role="alert">{error || 'Conversation unavailable.'}</div>
        <button className="login-submit" type="button" onClick={goBack}>Back to profile</button>
      </main>
    )
  }

  return (
    <div className="chat-shell direct-message-shell">
      <header className="chat-header">
        <button className="round-control" type="button" onClick={goBack} aria-label="Go back">
          <Icon>arrow_back</Icon>
        </button>
        <div className="chat-person">
          <div className="generic-avatar"><Icon>person</Icon></div>
          <div>
            <h1>{peerName}</h1>
            <span>Direct message</span>
          </div>
        </div>
        <div className="direct-message-header-actions">
          <button
            className="member-call-request"
            type="button"
            onClick={() => requestCall('phone')}
            disabled={requestingCall}
            aria-label="Request phone call"
            title="Request phone call"
          >
            <Icon>call</Icon>
            {requestingCall ? 'Requesting...' : 'Phone call'}
          </button>
          <button
            className="member-call-request"
            type="button"
            onClick={() => requestCall('video')}
            disabled={requestingCall}
            aria-label="Request video call"
            title="Request video call"
          >
            <Icon>videocam</Icon>
            {requestingCall ? 'Requesting...' : 'Request video call'}
          </button>
          <button
            className="round-control direct-message-profile"
            type="button"
            onClick={() => navigate(`/member-profile?memberId=${encodeURIComponent(memberId)}`, { memberId })}
            aria-label={`View ${peerName}'s profile`}
          >
            <Icon>person</Icon>
          </button>
        </div>
      </header>

      <main className="chat-stream direct-message-stream" ref={streamRef}>
        {error && <div className="profile-error" role="alert">{error}</div>}
        {messages.length ? messages.map((item) => {
          const mine = item.sender_id === userId
          return (
            <div className={mine ? 'outgoing-bubble user-message' : 'incoming-bubble'} key={item.id}>
              {item.message_type === 'image' && item.attachmentUrl ? (
                <a className="direct-message-image" href={item.attachmentUrl} target="_blank" rel="noreferrer">
                  <img src={item.attachmentUrl} alt={item.attachment_name || 'Shared photo'} />
                </a>
              ) : item.message_type === 'voice' && item.attachmentUrl ? (
                <div className="direct-message-voice">
                  <Icon>graphic_eq</Icon>
                  <audio controls src={item.attachmentUrl} preload="metadata" />
                </div>
              ) : item.message_type === 'file' && item.attachmentUrl ? (
                <a className="direct-message-file" href={item.attachmentUrl} target="_blank" rel="noreferrer">
                  <Icon>description</Icon>
                  <span>
                    <strong>{item.attachment_name || 'Shared file'}</strong>
                    <small>{item.attachment_size ? `${Math.ceil(item.attachment_size / 1024)} KB` : 'Open file'}</small>
                  </span>
                  <Icon>download</Icon>
                </a>
              ) : (
                <p>{item.body}</p>
              )}
              <small>{new Date(item.sent_at).toLocaleString()}</small>
            </div>
          )
        }) : (
          <div className="empty-state direct-message-empty">
            <Icon>forum</Icon>
            <h2>Start the conversation</h2>
            <p>Send {peerName} a message.</p>
          </div>
        )}
      </main>

      <form className="chat-composer" onSubmit={sendMessage}>
        <div className="composer-row">
          <div>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploadingAttachment}
              aria-label="Share photo"
              title="Share photo"
            >
              <Icon>photo</Icon>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAttachment}
              aria-label="Share file"
              title="Share file"
            >
              <Icon>attach_file</Icon>
            </button>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={`Message ${peerName}...`}
              aria-label="Message"
              maxLength={5000}
            />
            <button
              type="button"
              className={recording ? 'recording' : ''}
              onClick={toggleVoiceRecording}
              disabled={uploadingAttachment}
              aria-label={recording ? 'Stop recording voice note' : 'Record voice note'}
              title={recording ? 'Stop recording' : 'Record voice note'}
            >
              <Icon>{recording ? 'stop_circle' : 'mic'}</Icon>
            </button>
          </div>
          <button className="send-button" type="submit" disabled={sending || !message.trim()} aria-label="Send message">
            <Icon>send</Icon>
          </button>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void uploadAttachment(file, 'image')
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void uploadAttachment(file, 'file')
          }}
        />
      </form>
    </div>
  )
}
