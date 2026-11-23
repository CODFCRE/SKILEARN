/* global self, clients */

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (error) {
    payload = { title: 'Skilearn', body: 'You have a new update.' }
  }

  const title = payload.title || 'Skilearn'
  const options = {
    body: payload.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.tag || payload.type || 'skilearn',
    data: payload,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const route = event.notification.data?.route || '/'
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((opened) => {
    for (const client of opened) {
      if (client.url.includes(self.location.origin) && 'focus' in client) {
        client.navigate(route)
        return client.focus()
      }
    }
    return clients.openWindow(route)
  }))
})
