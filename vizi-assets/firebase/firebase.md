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

## Admin SDK (local only — gitignored)

Place the service-account JSON in this folder. Pattern `*adminsdk*.json` is ignored by git.

## Setup checklist

1. Copy plist/json into `vizi-mobile/google-services/`
2. Copy admin SDK JSON here (optional, server tools only)
3. Confirm `git status` does **not** list those credential files
4. `npx expo prebuild` / `npx expo run:ios` as usual

Never paste API keys, private keys, or plist/json contents into markdown or source.
