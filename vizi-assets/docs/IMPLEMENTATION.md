# Vizi — Implementation Plan

Working plan derived from [TECH_SPEC.md](./TECH_SPEC.md) and the alignment review. App code lives in `vizi-mobile/`.

## Goal

Cold launch → live rear camera → listening → Gemini Live answers from auto-sampled frames + voice, &lt;2s, no Start button, no manual photos.

## Phases

### Phase A — Session shell (now)
- [x] Docs committed/pushed
- [x] Remove Start / Home gate
- [x] Default route = live session with status (“Listening…”)
- [x] Mute / Repeat / Reconnect chrome (stubs OK until Live)
- [x] VoiceOver announcement on ready
- [x] Add `eas.json` + `expo-dev-client` dependency

### Phase B — Stream sampling
- [ ] Auto-sample frames from live camera (≤1 FPS JPEG in memory)
- [ ] Decide VisionCamera vs `expo-camera` timer path for MVP
- [ ] Keep latest-frame buffer for companion

### Phase C — Gemini Live
- [ ] Token service (`POST /session/token`)
- [ ] `VisionCompanion` + `GeminiLiveCompanion`
- [ ] Wire mic PCM + frames over WSS
- [ ] Playback + barge-in

### Phase D — Harden
- [ ] Reconnect / background pause
- [ ] A11y pass + demo scenarios
- [ ] Latency instrumentation

### Phase E — Optional
- [ ] Native STT/TTS fallback
- [ ] Plus / Purchases wiring

## Non-goals this sprint
- On-device VLM
- Navigation features
- Restructuring `vizi-mobile/` to generic Expo templates

## Skill notes
- Prefer `expo-dev-client` over Expo Go (Firebase native modules)
- Keep `src/app` routes-only (`expo-router`)
- Do not edit vendored `.agents/skills/`
