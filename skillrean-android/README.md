# Skilearn Android

The Android app embeds the web client built from `client/`. This keeps Android and web on the same screens, styles, navigation, and Supabase client rather than maintaining a second implementation.

## Requirements

- Node.js and npm
- Android Studio with an Android SDK/emulator, or an Android device with Expo Go
- Supabase project configured with this repository's schema

## Setup

1. Configure `client/.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Use the same public project URL and anon/publishable key as the web app. Never use a service-role key in a client app.
2. Install dependencies and start Expo:

   ```powershell
   npm install
   npm run android
   ```

The Android Gradle build compiles the web client and embeds it in the app. Google sign-in uses the `skilearn://auth/error` callback; add that URL to the Supabase project's allowed redirect URLs.

Video calls request Android camera and microphone permissions when a call starts. Allow both prompts for WebRTC calls to work.

## Build an APK

With Java 17 and the Android SDK installed, and the web client's dependencies and `client/.env` configured, run:

```powershell
Push-Location android
.\gradlew.bat :app:assembleRelease
Pop-Location
```

The APK is written to `android\app\build\outputs\apk\release\app-release.apk`. This local release build uses the debug signing key for testing; configure a private release keystore before distributing it.
