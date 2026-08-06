# Vizi

AI vision companion — point your phone, ask naturally, get spoken answers.

## Documentation

| Doc | Purpose |
|---|---|
| [PRD.md](./PRD.md) | Product requirements |
| [TECH_SPEC.md](./TECH_SPEC.md) | Expo technical specification |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Phased build plan |
| [AGENTS.md](./AGENTS.md) | Guidance for coding agents |

## Repository layout

- **`vizi-mobile/`** — Expo (React Native) app for iOS and Android  
- **`vizi-assets/`** — design tokens, fonts, platform config notes  
- **`.agents/skills/`** — [Expo Skills](https://docs.expo.dev/skills/) for AI agents  

## Prerequisites

- Node.js 20+ (LTS recommended)
- Xcode (iOS) and/or Android Studio
- [EAS CLI](https://docs.expo.dev/eas/) for development builds (`npx eas-cli`)

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

For device/simulator with native modules:

```bash
cd vizi-mobile
npx expo run:ios
# or
npx expo run:android
```

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
