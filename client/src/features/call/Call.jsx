import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../shared/components.jsx'
import { goBack, navigate } from '../../shared/lib/navigation.js'
import { supabase } from '../../shared/lib/supabase.js'

const rtcConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

export function Call() {
  const callId = window.history.state?.callId
    || new URLSearchParams(window.location.search).get('callId')
  const [call, setCall] = useState(null)
  const [userId, setUserId] = useState(null)
  const [peerName, setPeerName] = useState('Campus member')
  const [callStatus, setCallStatus] = useState('loading')
  const [error, setError] = useState('')
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [channelReady, setChannelReady] = useState(false)
  const [startingOutgoing, setStartingOutgoing] = useState(false)
  const [outgoingStarted, setOutgoingStarted] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const channelRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const callerStartedRef = useRef(false)
  const offerSentRef = useRef(false)
  const readyTimerRef = useRef(null)

  useEffect(() => {
    let active = true

    const loadCall = async () => {
      if (!supabase || !callId) {
        setError(!supabase ? 'Supabase is not configured.' : 'No call was selected.')
        setCallStatus('unavailable')
        return
      }

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!authData.user) throw new Error('Sign in before starting or answering a call.')

        const { data: callData, error: callError } = await supabase
          .from('call_sessions')
          .select('id,caller_id,recipient_id,status,created_at')
          .eq('id', callId)
          .maybeSingle()
        if (callError) throw callError
        if (!callData) throw new Error('This call is unavailable or you are not a participant.')
        if (![callData.caller_id, callData.recipient_id].includes(authData.user.id)) {
          throw new Error('You are not a participant in this call.')
        }

        const peerId = callData.caller_id === authData.user.id
          ? callData.recipient_id
          : callData.caller_id
        const { data: peer, error: peerError } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', peerId)
          .maybeSingle()
        if (peerError) throw peerError

        if (active) {
          setUserId(authData.user.id)
          setCall(callData)
          setPeerName(peer?.display_name || 'Campus member')
          setCallStatus(callData.status)
        }
      } catch (requestError) {
        console.error('Unable to load call:', requestError)
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load this call.')
          setCallStatus('unavailable')
        }
      }
    }

    void loadCall()
    return () => {
      active = false
    }
  }, [callId])

  useEffect(() => {
    if (!call || !userId || !supabase) return undefined

    let active = true
    const channel = supabase.channel(`skilearn-call:${call.id}`, {
      config: { private: true, broadcast: { self: false } },
    })
    channelRef.current = channel

    const sendSignal = async (payload) => {
      const response = await channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: { ...payload, senderId: userId },
      })
      if (response.status !== 'ok') throw new Error(response.reason || 'Call signaling failed.')
    }

    const ensureLocalStream = async () => {
      if (localStreamRef.current) return localStreamRef.current
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera and microphone access is not available in this browser.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      localStreamRef.current = stream
      if (active) setLocalStream(stream)
      return stream
    }

    const ensurePeerConnection = async () => {
      if (peerConnectionRef.current) return peerConnectionRef.current
      const stream = await ensureLocalStream()
      const connection = new RTCPeerConnection(rtcConfiguration)
      peerConnectionRef.current = connection
      stream.getTracks().forEach((track) => connection.addTrack(track, stream))
      connection.ontrack = (event) => {
        const [incomingStream] = event.streams
        if (incomingStream) setRemoteStream(incomingStream)
      }
      connection.onicecandidate = (event) => {
        if (event.candidate) {
          void sendSignal({ type: 'ice', candidate: event.candidate.toJSON() }).catch((signalError) => {
            console.error('Unable to send a WebRTC network candidate:', signalError)
            setError('Call connection was interrupted while sharing network details.')
          })
        }
      }
      connection.onconnectionstatechange = () => {
        if (connection.connectionState === 'connected') setCallStatus('connected')
        if (connection.connectionState === 'failed') {
          setCallStatus('failed')
          setError('The call could not connect. A TURN relay may be needed on this network.')
        }
        if (connection.connectionState === 'disconnected') setCallStatus('reconnecting')
      }
      return connection
    }

    const flushCandidates = async (connection) => {
      const candidates = pendingCandidatesRef.current
      pendingCandidatesRef.current = []
      for (const candidate of candidates) {
        await connection.addIceCandidate(new RTCIceCandidate(candidate))
      }
    }

    const makeOffer = async () => {
      if (offerSentRef.current || !callerStartedRef.current) return
      offerSentRef.current = true
      window.clearInterval(readyTimerRef.current)
      const connection = await ensurePeerConnection()
      const offer = await connection.createOffer()
      await connection.setLocalDescription(offer)
      await sendSignal({ type: 'offer', description: connection.localDescription.toJSON() })
      setCallStatus('connecting')
    }

    channel
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (!active || payload?.senderId === userId) return

        try {
          if (payload.type === 'ready' && call.caller_id === userId) {
            await makeOffer()
          } else if (payload.type === 'offer' && call.recipient_id === userId) {
            const connection = await ensurePeerConnection()
            await connection.setRemoteDescription(new RTCSessionDescription(payload.description))
            await flushCandidates(connection)
            const answer = await connection.createAnswer()
            await connection.setLocalDescription(answer)
            await sendSignal({ type: 'answer', description: connection.localDescription.toJSON() })
            setCallStatus('connecting')
          } else if (payload.type === 'answer' && call.caller_id === userId) {
            const connection = peerConnectionRef.current
            if (!connection) throw new Error('The local call connection was not initialized.')
            await connection.setRemoteDescription(new RTCSessionDescription(payload.description))
            await flushCandidates(connection)
          } else if (payload.type === 'ice') {
            const candidate = new RTCIceCandidate(payload.candidate)
            if (peerConnectionRef.current?.remoteDescription) {
              await peerConnectionRef.current.addIceCandidate(candidate)
            } else {
              pendingCandidatesRef.current.push(payload.candidate)
            }
          } else if (payload.type === 'declined') {
            setCallStatus('declined')
          } else if (payload.type === 'hangup') {
            setCallStatus('ended')
          }
        } catch (signalError) {
          console.error('Unable to process WebRTC signaling:', signalError)
          setError(signalError instanceof Error ? signalError.message : 'Unable to connect this call.')
        }
      })
      .subscribe((status) => {
        if (!active) return
        if (status === 'SUBSCRIBED') {
          setChannelReady(true)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setChannelReady(false)
          setError('Unable to connect to call signaling. Check the Supabase call migration and try again.')
        }
      })

    return () => {
      active = false
      window.clearInterval(readyTimerRef.current)
      if (channelRef.current === channel) channelRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [call, userId])

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
  }, [remoteStream])

  useEffect(() => {
    if (!['declined', 'ended', 'missed', 'failed'].includes(callStatus)) return
    window.clearInterval(readyTimerRef.current)
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    peerConnectionRef.current?.close()
    peerConnectionRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
  }, [callStatus])

  useEffect(() => {
    if (!call || !supabase || !['ringing', 'accepted'].includes(callStatus)) return undefined

    let active = true
    const refreshStatus = async () => {
      const { data, error: statusError } = await supabase
        .from('call_sessions')
        .select('status,created_at')
        .eq('id', call.id)
        .maybeSingle()
      if (statusError) {
        console.error('Unable to refresh call status:', statusError)
        return
      }
      if (!active || !data) return
      if (data.status !== callStatus) setCallStatus(data.status)
      if (data.status === 'ringing' && Date.now() - new Date(data.created_at).getTime() > 60_000) {
        const { error: timeoutError } = await supabase
          .from('call_sessions')
          .update({ status: 'missed' })
          .eq('id', call.id)
          .eq('status', 'ringing')
        if (timeoutError) console.error('Unable to expire unanswered call:', timeoutError)
        setCallStatus('missed')
      }
    }
    const interval = window.setInterval(() => { void refreshStatus() }, 3000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [call, callStatus])

  useEffect(() => () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    peerConnectionRef.current?.close()
  }, [])

  const isCaller = call?.caller_id === userId

  const startOutgoingCall = async () => {
    if (!channelReady || !supabase || !call || callerStartedRef.current || startingOutgoing) return
    setStartingOutgoing(true)
    setError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera and microphone access is not available in this browser.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      localStreamRef.current = stream
      setLocalStream(stream)
      callerStartedRef.current = true
      setOutgoingStarted(true)
      setCallStatus('ringing')
      const sendReady = async () => {
        const response = await channelRef.current?.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'ready', senderId: userId },
        })
        if (!response || response.status !== 'ok') {
          throw new Error(response?.reason || 'Call signaling failed.')
        }
      }
      const reportSignalError = (signalError) => {
        console.error('Unable to notify the other participant:', signalError)
        setError('Unable to reach the other participant. Please try again.')
      }
      const notifyPeer = () => {
        void sendReady().catch(reportSignalError)
      }
      notifyPeer()
      readyTimerRef.current = window.setInterval(notifyPeer, 1200)
    } catch (requestError) {
      console.error('Unable to access camera and microphone:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Allow camera and microphone access to call.')
    } finally {
      setStartingOutgoing(false)
    }
  }

  const acceptCall = async () => {
    if (!channelReady || !supabase || !call || accepting) return
    setAccepting(true)
    setError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera and microphone access is not available in this browser.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      localStreamRef.current = stream
      setLocalStream(stream)
      const { data, error: acceptError } = await supabase
        .from('call_sessions')
        .update({ status: 'accepted' })
        .eq('id', call.id)
        .eq('status', 'ringing')
        .select('id')
        .maybeSingle()
      if (acceptError) throw acceptError
      if (!data) throw new Error('This call has already ended or been answered elsewhere.')
      setCallStatus('accepted')
      const response = await channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: { type: 'ready', senderId: userId },
      })
      if (response.status !== 'ok') throw new Error(response.reason || 'Call signaling failed.')
    } catch (requestError) {
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
      setLocalStream(null)
      console.error('Unable to answer call:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to answer this call.')
    } finally {
      setAccepting(false)
    }
  }

  const declineCall = async () => {
    if (!supabase || !call) return
    try {
      const { error: updateError } = await supabase
        .from('call_sessions')
        .update({ status: 'declined' })
        .eq('id', call.id)
        .eq('status', 'ringing')
      if (updateError) throw updateError
      if (channelRef.current) {
        const response = await channelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'declined', senderId: userId },
        })
        if (response.status !== 'ok') throw new Error(response.reason || 'Call signaling failed.')
      }
      setCallStatus('declined')
    } catch (requestError) {
      console.error('Unable to decline call:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to decline this call.')
    }
  }

  const endCall = async () => {
    if (!supabase || !call) return
    try {
      const { error: updateError } = await supabase
        .from('call_sessions')
        .update({ status: 'ended' })
        .eq('id', call.id)
      if (updateError) throw updateError
      if (channelRef.current) {
        const response = await channelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'hangup', senderId: userId },
        })
        if (response.status !== 'ok') throw new Error(response.reason || 'Call signaling failed.')
      }
      setCallStatus('ended')
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
      setLocalStream(null)
      peerConnectionRef.current?.close()
      peerConnectionRef.current = null
    } catch (requestError) {
      console.error('Unable to end call:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to end this call.')
    }
  }

  const toggleMicrophone = () => {
    const nextMuted = !muted
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !nextMuted })
    setMuted(nextMuted)
  }

  const toggleCamera = () => {
    const nextCameraOff = !cameraOff
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = !nextCameraOff })
    setCameraOff(nextCameraOff)
  }

  const finished = ['declined', 'ended', 'missed', 'failed', 'unavailable'].includes(callStatus)
  const statusText = {
    loading: 'Connecting to call...',
    ringing: isCaller ? 'Calling...' : 'Incoming video call',
    accepted: 'Connecting...',
    connecting: 'Connecting...',
    connected: 'Connected',
    reconnecting: 'Reconnecting...',
    declined: 'Call declined',
    ended: 'Call ended',
    missed: 'Call not answered',
    failed: 'Call failed',
    unavailable: 'Call unavailable',
  }[callStatus] || 'Connecting...'

  if (!callId || callStatus === 'unavailable') {
    return (
      <main className="call-state">
        <div className="profile-error" role="alert">{error || 'This call is unavailable.'}</div>
        <button className="button" type="button" onClick={() => navigate('/')}>Back to Exchange</button>
      </main>
    )
  }

  return (
    <main className="call-screen">
      <header className="call-topbar">
        <button
          className="call-back-button"
          type="button"
          onClick={() => {
            if (callStatus === 'ringing' && !isCaller) void declineCall()
            else if (!finished) void endCall()
            else goBack()
          }}
          aria-label={callStatus === 'ringing' && !isCaller ? 'Decline call' : 'Leave call'}
        >
          <Icon>arrow_back</Icon>
        </button>
        <div>
          <strong>{peerName}</strong>
          <span>{statusText}</span>
        </div>
        <span className={`call-connection-dot ${callStatus === 'connected' ? 'connected' : ''}`} aria-hidden="true" />
      </header>

      <section className="call-stage" aria-label="Video call">
        <div className={`call-remote-video${remoteStream && !finished ? ' has-video' : ''}`}>
          <video ref={remoteVideoRef} autoPlay playsInline aria-label={`${peerName} video`} />
          {!remoteStream && (
            <div className="call-peer-placeholder">
              <span><Icon>person</Icon></span>
              <strong>{peerName}</strong>
              <p>{statusText}</p>
            </div>
          )}
        </div>
        <div className={`call-local-video${localStream && !cameraOff && !finished ? ' has-video' : ''}`}>
          <video ref={localVideoRef} autoPlay muted playsInline aria-label="Your video" />
          {(!localStream || cameraOff) && (
            <div className="call-local-placeholder"><Icon>person</Icon><span>You</span></div>
          )}
        </div>
        {error && <div className="call-alert" role="alert">{error}</div>}
      </section>

      <footer className="call-controls">
        {!channelReady && !finished && <p className="call-hint">Connecting securely to call signaling...</p>}
        {['ringing', 'accepted'].includes(callStatus) && isCaller && !outgoingStarted ? (
          <button className="call-primary-control" type="button" onClick={startOutgoingCall} disabled={!channelReady || startingOutgoing}>
            <Icon>{startingOutgoing ? 'hourglass_top' : 'videocam'}</Icon> {startingOutgoing ? 'Preparing...' : channelReady ? 'Start call' : 'Connecting...'}
          </button>
        ) : callStatus === 'ringing' && !isCaller ? (
          <div className="call-answer-actions">
            <button className="call-end-control" type="button" onClick={declineCall} aria-label="Decline call">
              <Icon>call_end</Icon>
            </button>
            <button className="call-answer-control" type="button" onClick={acceptCall} disabled={!channelReady || accepting} aria-label="Answer call">
              <Icon>{accepting ? 'hourglass_top' : 'videocam'}</Icon>
            </button>
          </div>
        ) : callStatus === 'connected' || callStatus === 'connecting' || callStatus === 'reconnecting' ? (
          <div className="call-control-row">
            <button className={`call-toggle-control${muted ? ' selected' : ''}`} type="button" onClick={toggleMicrophone} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}>
              <Icon>{muted ? 'mic_off' : 'mic'}</Icon>
            </button>
            <button className={`call-toggle-control${cameraOff ? ' selected' : ''}`} type="button" onClick={toggleCamera} aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}>
              <Icon>{cameraOff ? 'videocam_off' : 'videocam'}</Icon>
            </button>
            <button className="call-end-control" type="button" onClick={endCall} aria-label="End call">
              <Icon>call_end</Icon>
            </button>
          </div>
        ) : finished ? (
          <button className="call-primary-control" type="button" onClick={() => navigate('/')}>
            Back to Exchange
          </button>
        ) : null}
      </footer>
    </main>
  )
}
