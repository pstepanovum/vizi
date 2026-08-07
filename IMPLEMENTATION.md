# Vizi — Implementation Plan

Working plan derived from [TECH_SPEC.md](./TECH_SPEC.md). App code lives in `vizi-mobile/`.

## Goal

Cold launch → live rear camera → listening → Gemini Live (or mock) answers from auto-sampled frames + voice, no Start button, no manual photos.

## Phases

### Phase A — Session shell
- [x] Remove Start / Home gate
- [x] Default route = live session with status
- [x] Mute / Repeat / Reconnect chrome
- [x] VoiceOver announcements
- [x] `eas.json` + `expo-dev-client`

### Phase B — Stream sampling
- [x] Auto-sample frames (≤1 FPS JPEG) via `expo-camera`
- [x] Latest-frame buffer into companion

### Phase C — Gemini Live
- [x] Token client (API key / token URL / mock)
- [x] Firebase AI Logic Live companion (`@react-native-firebase/ai`) + WebSocket fallback + Mock
- [x] Speech input + frames + spoken replies (`expo-speech`)
- [x] Barge-in stops TTS on new speech

### Phase D — Harden
- [x] Reconnect / background pause TTS
- [x] Unit tests
- [ ] Simulator launch verification

### Phase E — Optional
- [ ] Server-side ephemeral tokens only
- [ ] VisionCamera frame processors
- [ ] Plus / Purchases wiring
- [ ] On-device VLM

## Run locally

```bash
cd vizi-mobile
cp .env.example .env
npm test
npx expo run:ios
```

Default companion: direct Gemini Live (`EXPO_PUBLIC_GEMINI_API_KEY`). Optional: `EXPO_PUBLIC_COMPANION=firebase`. Otherwise mock.
