# Firebase

**Project ID:** `vizi-mobile`

## Client config

Do **not** commit API keys or plist/json into markdown.

- iOS: place `GoogleService-Info.plist` where `vizi-mobile/app.json` expects (`./google-services/GoogleService-Info.plist`) — gitignored at repo root patterns.
- Android: use the matching `google-services.json` via the same local/google-services workflow.
- Prefer EAS Secrets / `.env` for any web SDK keys if needed.

## Admin SDK

Place the Firebase Admin service-account JSON locally under this folder.  
Filename pattern `*adminsdk*.json` is **gitignored**. Never paste the JSON into docs or source.
