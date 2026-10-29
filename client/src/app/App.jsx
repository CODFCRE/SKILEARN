import { lazy, Suspense, useEffect, useState } from 'react'
import '../styles/app.css'
import { Exchange } from '../features/exchange/Exchange.jsx'
import { Sessions } from '../features/sessions/Sessions.jsx'
import { Wallet } from '../features/wallet/Wallet.jsx'
import { SkillDetail } from '../features/skills/SkillDetail.jsx'
import { SkillListing } from '../features/skills/SkillListing.jsx'
import { Verification } from '../features/verification/Verification.jsx'
import { Chat } from '../features/chat/Chat.jsx'
import { Profile } from '../features/profile/Profile.jsx'
import { Login } from '../features/auth/Login.jsx'
import { AuthError } from '../features/auth/AuthError.jsx'
import { MemberProfile } from '../features/profile/MemberProfile.jsx'
import { applyTheme, getThemePreference } from '../shared/lib/theme.js'
import { supabase } from '../shared/lib/supabase.js'
import { navigate } from '../shared/lib/navigation.js'

const Call = lazy(() => import('../features/call/Call.jsx').then((module) => ({ default: module.Call })))

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [theme, setTheme] = useState(getThemePreference)
  const [onlineMemberIds, setOnlineMemberIds] = useState([])
  const [presenceReady, setPresenceReady] = useState(false)
  const [presenceError, setPresenceError] = useState(false)

  useEffect(() => {
    const updatePath = () => setPath(window.location.pathname)
    window.addEventListener('popstate', updatePath)
    return () => window.removeEventListener('popstate', updatePath)
  }, [])

  useEffect(() => {
    applyTheme(theme)
    const updateTheme = (event) => setTheme(event.detail)
    window.addEventListener('skilearn-theme-change', updateTheme)
    return () => window.removeEventListener('skilearn-theme-change', updateTheme)
  }, [theme])

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    let presenceChannel
    let trackedUserId = null

    const clearPresence = () => {
      if (presenceChannel) {
        void supabase.removeChannel(presenceChannel)
        presenceChannel = null
      }
      trackedUserId = null
      setOnlineMemberIds([])
      setPresenceReady(false)
      setPresenceError(false)
    }

    const connectPresence = (user) => {
      if (!active) return
      if (!user) {
        clearPresence()
        return
      }
      if (trackedUserId === user.id) return

      clearPresence()
      trackedUserId = user.id
      const channel = supabase.channel('skilearn:online-members', {
        config: { presence: { key: user.id } },
      })
      presenceChannel = channel
      channel
        .on('presence', { event: 'sync' }, () => {
          if (!active || trackedUserId !== user.id) return
          setOnlineMemberIds(Object.keys(channel.presenceState()))
          setPresenceReady(true)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            if (!active || trackedUserId !== user.id) return
            const { error } = await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            })
            if (error) {
              console.error('Unable to publish online presence:', error)
              if (active && trackedUserId === user.id) {
                setPresenceError(true)
                setPresenceReady(false)
              }
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (active && trackedUserId === user.id) {
              setPresenceError(true)
              setPresenceReady(false)
            }
          }
        })
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error
      connectPresence(data.session?.user || null)
    }).catch((error) => {
      console.error('Unable to initialize online presence:', error)
      if (active) setPresenceError(true)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      connectPresence(session?.user || null)
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
      clearPresence()
    }
  }, [])

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    let timer
    let userId = null
    let checking = false

    const checkIncomingCalls = async () => {
      if (!active || !userId || checking) return
      checking = true
      try {
        const { data, error } = await supabase
          .from('call_sessions')
          .select('id,created_at')
          .eq('recipient_id', userId)
          .eq('status', 'ringing')
          .gt('created_at', new Date(Date.now() - 60_000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
        if (error) throw error

        const incomingCall = data?.[0]
        if (incomingCall && window.location.pathname !== '/call') {
          navigate(`/call?callId=${encodeURIComponent(incomingCall.id)}`, {
            callId: incomingCall.id,
            direction: 'incoming',
          })
        }
      } catch (error) {
        console.error('Unable to check for incoming calls:', error)
      } finally {
        checking = false
      }
    }

    const startChecking = (session) => {
      userId = session?.user?.id || null
      window.clearInterval(timer)
      if (userId) {
        void checkIncomingCalls()
        timer = window.setInterval(checkIncomingCalls, 4000)
      }
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error
      startChecking(data.session)
    }).catch((error) => {
      console.error('Unable to initialize incoming call checks:', error)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      startChecking(session)
    })

    return () => {
      active = false
      window.clearInterval(timer)
      authListener.subscription.unsubscribe()
    }
  }, [])

  if (path === '/sessions') return <Sessions />
  if (path === '/wallet') return <Wallet />
  if (path === '/skill-detail') return <SkillDetail />
  if (path === '/skill-listing') return <SkillListing />
  if (path === '/verification') return <Verification />
  if (path === '/chat') return <Chat />
  if (path === '/call') {
    return (
      <Suspense fallback={<main className="call-state">Opening call...</main>}>
        <Call />
      </Suspense>
    )
  }
  if (path === '/member-profile') return <MemberProfile />
  if (path === '/profile') return <Profile />
  if (path === '/login') return <Login />
  if (path === '/auth/error') return <AuthError />
  return (
    <Exchange
      onlineMemberIds={onlineMemberIds}
      presenceReady={presenceReady}
      presenceError={presenceError}
    />
  )
}

export default App