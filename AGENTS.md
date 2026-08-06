# AGENTS.md

Onboarding for any agent (or human) working in this repository.

## What this is

**Vizi** — AI vision companion for blind, low-vision, and colorblind users. Point the phone, speak naturally, get spoken answers about the world.

## Read first

1. [`PRD.md`](./PRD.md) — product requirements (single source of truth; **do not** add `vizi-mobile/PRD.md`)
2. [`TECH_SPEC.md`](./TECH_SPEC.md) — Expo implementation spec
3. [`README.md`](./README.md) — how to run the app

## Repo map

| Path | Role |
|---|---|
| `vizi-mobile/` | Expo app — **all app code goes here** |
| `vizi-assets/` | Design tokens, fonts, Apple/Firebase notes |
| `.agents/skills/` | Installed Expo / EAS skills (`skills-lock.json`) |
| `PRD.md` / `TECH_SPEC.md` | Product + technical docs at repo root |

## Non-negotiables

- **Launch → live camera** — no Start / Home gate on the happy path (PRD §5)
- **No manual photos** — vision comes from the continuous camera stream
- **No Deepgram** — Gemini Live audio primary; native OS STT/TTS only as fallback
- **Privacy** — no durable image/audio storage by default; never commit secrets (`.p8`, admin SDK JSON, `GoogleService-Info.plist`, `.env*`)
- **Follow existing `vizi-mobile/` layout** — do not reshuffle to match generic Expo templates

## Stack (MVP)

- Expo SDK 57 + Expo Router (`vizi-mobile/src/app`)
- Gemini Live (voice + auto-sampled frames)
- Firebase / RevenueCat stubs present — wire carefully; keep secrets out of git

## Expo skills

Official Expo skills are installed under `.agents/skills/` (see [Expo Skills](https://docs.expo.dev/skills/)). Use them for router, native UI, EAS, upgrades, etc. Prefer those procedures over inventing Expo workflows from memory.

Useful starting points:

- `expo-router` — navigation (keep routes-only under `src/app/`)
- `expo-native-ui` / `expo-ui` — UI (prefer theme tokens already in app)
- `expo-dev-client` — **required** here (`@react-native-firebase/*` is not in Expo Go)
- `eas-app-stores` / `eas-workflows` — ship / CI (add `eas.json` when building)

**Skill conflict to remember:** `expo-native-ui` says “try Expo Go first.” For Vizi, skip Expo Go for full-app work — Firebase native modules need a development build. Expo Go is fine only for isolated UI experiments without Firebase.

## When building features

1. Implement in `vizi-mobile/`
2. Match `src/theme` and `vizi-assets/design` tokens
3. Keep Session as the default route; permission UI inline or minimal
4. Put Gemini/session logic behind a swappable companion interface (see TECH_SPEC §9)
5. Verify VoiceOver/TalkBack for any new chrome

## Out of scope unless asked

- Full on-device VLM cutover (Phase 3 in TECH_SPEC)
- Restructuring the monorepo
- Editing vendored files under `.agents/skills/`
