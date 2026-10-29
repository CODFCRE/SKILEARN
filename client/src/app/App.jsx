import { useEffect, useState } from 'react'
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
import { applyTheme, getThemePreference } from '../shared/lib/theme.js'
import { supabase } from '../shared/lib/supabase.js'

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

  if (path === '/sessions') return <Sessions />
  if (path === '/wallet') return <Wallet />
  if (path === '/skill-detail') return <SkillDetail />
  if (path === '/skill-listing') return <SkillListing />
  if (path === '/verification') return <Verification />
  if (path === '/chat') return <Chat />
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