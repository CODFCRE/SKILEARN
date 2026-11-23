import { supabase } from './supabase.js'

const productionApiUrl = 'https://skilearn-tan.vercel.app'

export function getPushApiUrl() {
  if (import.meta.env.VITE_NOTIFICATION_API_URL) return import.meta.env.VITE_NOTIFICATION_API_URL
  if (window.location.protocol === 'https:' && window.location.hostname !== 'skilearn-app.local') {
    return window.location.origin
  }
  return productionApiUrl
}

export async function sendPushNotification({ recipientId, type, title, body, route, data = {} }) {
  if (!supabase) return
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) return
  await fetch(`${getPushApiUrl()}/api/notifications/send`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ recipientId, type, title, body, route, data }),
  }).catch((error) => console.warn('Unable to send push notification:', error))
}

export async function registerExpoPushDevice(token) {
  if (!supabase || !token) return
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) return
  await supabase.from('push_devices').upsert({
    user_id: authData.user.id,
    platform: 'expo',
    token,
  }, { onConflict: 'user_id,platform,token' })
}
