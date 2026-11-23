import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, BackHandler, Linking, StatusBar as NativeStatusBar, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import WebView from 'react-native-webview'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { webAppHtml } from './src/web/generatedWebApp'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

function getAuthCallbackRoute(url) {
  if (!url) return null
  let callback
  try {
    callback = new URL(url)
  } catch (error) {
    console.error('Unable to parse the Android sign-in callback:', error)
    return null
  }
  if (callback.protocol !== 'skilearn:' || callback.hostname !== 'auth') return null
  return `/auth/error${callback.search}${callback.hash}`
}

function getRouteInjection(route) {
  return `window.history.replaceState({}, '', ${JSON.stringify(route)});window.dispatchEvent(new PopStateEvent('popstate'));true;`
}

export default function App() {
  const webView = useRef(null)
  const webReady = useRef(false)
  const pendingAuthRoute = useRef(null)
  const lastAuthRoute = useRef(null)
  const [canGoBack, setCanGoBack] = useState(false)
  const statusBarHeight = NativeStatusBar.currentHeight || 0
  const webSource = useMemo(() => ({
    html: webAppHtml,
    baseUrl: 'https://skilearn-app.local/',
  }), [])

  const handleAuthUrl = useCallback((url) => {
    const route = getAuthCallbackRoute(url)
    if (!route || lastAuthRoute.current === route) return
    lastAuthRoute.current = route
    if (webReady.current) {
      webView.current?.injectJavaScript(getRouteInjection(route))
    } else {
      pendingAuthRoute.current = route
    }
  }, [])

  useEffect(() => {
    let active = true
    Linking.getInitialURL().then((url) => {
      if (active) handleAuthUrl(url)
    }).catch((error) => {
      console.error('Unable to read the Android sign-in callback:', error)
    })
    const subscription = Linking.addEventListener('url', ({ url }) => handleAuthUrl(url))

    return () => {
      active = false
      subscription.remove()
    }
  }, [handleAuthUrl])

  useEffect(() => {
    let active = true
    let registrationTimer = null

    const registerNotifications = async () => {
      if (!Device.isDevice) return

      const existing = await Notifications.getPermissionsAsync()
      let permission = existing
      if (!existing.granted && existing.canAskAgain) {
        permission = await Notifications.requestPermissionsAsync()
      }
      if (!permission.granted) return

      await Notifications.setNotificationChannelAsync('incoming-calls', {
        name: 'Incoming calls',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 500, 500],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
      })
      await Notifications.setNotificationChannelAsync('skilearn-notifications', {
        name: 'Messages and updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
      })

      const token = await Notifications.getExpoPushTokenAsync()
      if (active) {
        const routeInjection = `window.dispatchEvent(new CustomEvent('skilearn-expo-push-token',{detail:{token:${JSON.stringify(token.data)}}}));true;`
        if (webReady.current) {
          webView.current?.injectJavaScript(routeInjection)
        } else {
          registrationTimer = setInterval(() => {
            if (!active || !webReady.current) return
            clearInterval(registrationTimer)
            webView.current?.injectJavaScript(routeInjection)
          }, 100)
        }
      }
    }

    void registerNotifications()

    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {})
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route
      if (typeof route === 'string') {
        if (webReady.current) {
          webView.current?.injectJavaScript(getRouteInjection(route))
        } else {
          pendingAuthRoute.current = route
        }
      }
    })

    return () => {
      active = false
      if (registrationTimer) clearInterval(registrationTimer)
      receivedSubscription.remove()
      responseSubscription.remove()
    }
  }, [])

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack || !webView.current) return false
      webView.current.goBack()
      return true
    })
    return () => subscription.remove()
  }, [canGoBack])

  const handleShouldStartLoad = (request) => {
    if (request.url.startsWith('skilearn://auth/')) {
      handleAuthUrl(request.url)
      return false
    }
    if (request.url.startsWith('https://skilearn-app.local/')) return true
    if (/^https?:\/\//i.test(request.url) && request.isTopFrame) {
      Linking.openURL(request.url).catch((error) => {
        console.error('Unable to open the external link:', error)
      })
    }
    return false
  }

  const handleMessage = (event) => {
    let message
    try {
      message = JSON.parse(event.nativeEvent.data)
    } catch (error) {
      console.error('Unable to read a message from the web app:', error)
      return
    }
    if (!message || typeof message !== 'object') return
    if (message.type !== 'open-auth-url' || typeof message.url !== 'string') return

    let authUrl
    try {
      authUrl = new URL(message.url)
    } catch (error) {
      console.error('Unable to parse the sign-in URL:', error)
      return
    }
    if (authUrl.protocol !== 'https:') {
      console.error('Blocked an insecure sign-in URL.')
      return
    }
    Linking.openURL(authUrl.toString()).catch((error) => {
      console.error('Unable to open the sign-in page:', error)
    })
  }

  return (
    <View style={[styles.container, { paddingTop: statusBarHeight }]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <WebView
        ref={webView}
        source={webSource}
        originWhitelist={['https://*', 'skilearn://*']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color="#58663d" size="large" />
          </View>
        )}
        onLoadStart={() => { webReady.current = false }}
        onLoadEnd={() => {
          webReady.current = true
          const route = pendingAuthRoute.current
          if (!route) return
          pendingAuthRoute.current = null
          webView.current?.injectJavaScript(getRouteInjection(route))
        }}
        onNavigationStateChange={(navigation) => setCanGoBack(navigation.canGoBack)}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onMessage={handleMessage}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8f4' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f8f4' },
})
