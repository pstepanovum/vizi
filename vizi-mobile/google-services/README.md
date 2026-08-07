# Local Firebase client configs (gitignored)

Place Firebase console downloads here — **do not commit**:

| File | Platform |
|---|---|
| `GoogleService-Info.plist` | iOS |
| `google-services.json` | Android |

Referenced from `app.json` as `./google-services/...`.

Admin SDK JSON belongs in `../../vizi-assets/firebase/` (`*adminsdk*.json`, also gitignored).

## Gemini via Firebase AI Logic (native app)

Use Firebase app **`com.vizi.mobile.app`** (iOS), not a web app.

1. [AI Logic](https://console.firebase.google.com/project/vizi-mobile/ailogic) → Get started → Gemini Developer API.
2. [App Check](https://console.firebase.google.com/project/vizi-mobile/appcheck) → select the **iOS** app → Manage debug tokens → add `EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN` from `.env`.
3. Enforce App Check for AI Logic when the console asks.

The app uses `@react-native-firebase/ai` + `@react-native-firebase/app-check`. Rebuild after installing those packages.
