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
- [x] Direct Gemini Live WebSocket (+ REST web fallback + Mock)
- [x] Native audio I/O via Gemini Live PCM (`@speechmatics/expo-two-way-audio`); OS STT/TTS only for web/mock
- [x] Frames + barge-in (flush playback on interrupt)

### Phase D — Harden
- [x] Reconnect / background pause TTS
- [x] Unit tests
- [ ] Simulator / device launch verification (native rebuild required after two-way-audio)

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

Default companion: direct Gemini Live (`EXPO_PUBLIC_GEMINI_API_KEY`).
On iOS/Android, voice goes through Gemini Live PCM (not OS STT/TTS). Web uses REST + OS speech.
After installing `@speechmatics/expo-two-way-audio`, run a native rebuild once:

```bash
npx expo run:ios
```

Then day-to-day: `npx expo start --dev-client`.
