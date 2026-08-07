# Vizi

AI vision companion — point your phone, ask naturally, get spoken answers.

## Documentation

| Doc | Purpose |
|---|---|
| [PRD.md](./PRD.md) | Product requirements |
| [TECH_SPEC.md](./TECH_SPEC.md) | Expo technical specification |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Phased build plan |

## Repository layout

- **`vizi-mobile/`** — Expo (React Native) app for iOS and Android  
- **`vizi-assets/`** — design tokens, fonts, platform config notes  

## Prerequisites

- Node.js 20+ (LTS recommended)
- Xcode (iOS) and/or Android Studio
- Builds are **local only** (Xcode / `npx expo run:ios`) — EAS cloud builds are not used

Native modules (Firebase, camera, etc.) require a **development build** — Expo Go is not sufficient for the full app.

## Run the app

```bash
cd vizi-mobile
npm install
npx expo start
```

> **Fonts:** licensed font files are not committed. Before the first build, copy the
> Chunk font into the app (get `vizi-assets/font/` from a teammate if missing):
>
> ```bash
> cp vizi-assets/font/chunk-font/Chunk.otf vizi-mobile/assets/fonts/chunk.otf
> ```

For device/simulator with native modules (iOS only — Android is out of scope
for the MVP, so always pass `--platform ios` to prebuild):

```bash
cd vizi-mobile
npx expo prebuild --platform ios --clean   # after config/native changes
npx expo run:ios
```

## TestFlight (local, no EAS)

Archive, sign, and upload with one script (uses the App Store Connect API key
from `vizi-assets/apple/`, automatic signing via Xcode):

```bash
cd vizi-mobile
ASC_ISSUER_ID=<issuer-uuid> ./scripts/testflight-ios.sh
```

The Issuer ID is in App Store Connect → Users and Access → Integrations.
Bump `ios.buildNumber` in `app.json` before each upload. Alternatively use
Xcode: Product → Archive → Distribute App.

## Product invariants

- App launches into the **live camera** (no Start screen)
- Vision is sampled from the **live stream** — users never take photos for AI
- Voice via **Gemini Live** (native OS speech only as fallback)
- No durable storage of images/audio by default

## Secrets

Never commit:

- Apple `.p8` keys  
- Firebase Admin SDK JSON  
- `GoogleService-Info.plist` / google-services JSON  
- `.env` files  

These patterns are listed in the root `.gitignore`. Keep local copies out of markdown docs.

## License / status

Hackathon MVP — see PRD for market, pricing, and roadmap.
