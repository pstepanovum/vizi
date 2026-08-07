# Firebase

**Project ID:** `vizi-mobile`  
**iOS bundle ID:** `com.vizi.mobile.app`

## Client config (local only — gitignored)

Copy from your Firebase console / secure share into:

| File | Path |
|---|---|
| iOS | `vizi-mobile/google-services/GoogleService-Info.plist` |
| Android | `vizi-mobile/google-services/google-services.json` |

`app.json` points at those paths and enables `@react-native-firebase/app`, `auth`, and `analytics`.
Gemini Live uses `@react-native-firebase/ai` (Firebase AI Logic).

## Admin SDK (local only — gitignored)

Place the service-account JSON in this folder. Pattern `*adminsdk*.json` is ignored by git.

## Firebase AI Logic (one-time console step)

Use the **native iOS app** `com.vizi.mobile.app` (not a web app).

1. Open https://console.firebase.google.com/project/vizi-mobile/ailogic — finish Get started with Gemini Developer API if needed.
2. Open https://console.firebase.google.com/project/vizi-mobile/appcheck — register **App Attest / Device Check** (or debug-only) for the iOS app `com.vizi.mobile.app`.
3. Under that iOS app → **Manage debug tokens** → add the token from `vizi-mobile/.env` (`EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN`).
4. Enforce App Check for **Firebase AI Logic** when prompted.

Required APIs: `generativelanguage.googleapis.com`, `firebasevertexai.googleapis.com`.

## Setup checklist

1. Copy plist/json into `vizi-mobile/google-services/`
2. Enable Firebase AI Logic (above)
3. Copy admin SDK JSON here (optional, server tools only)
4. Confirm `git status` does **not** list those credential files
5. `npx expo prebuild` / `npx expo run:ios` as usual

Never paste API keys, private keys, or plist/json contents into markdown or source.
