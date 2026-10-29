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

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [theme, setTheme] = useState(getThemePreference)

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

  if (path === '/sessions') return <Sessions />
  if (path === '/wallet') return <Wallet />
  if (path === '/skill-detail') return <SkillDetail />
  if (path === '/skill-listing') return <SkillListing />
  if (path === '/verification') return <Verification />
  if (path === '/chat') return <Chat />
  if (path === '/profile') return <Profile />
  if (path === '/login') return <Login />
  if (path === '/auth/error') return <AuthError />
  return <Exchange />
}

export default App