# Vizi — AI Vision Companion

**Product Design Requirements (PRD)**

**Version:** 1.1  
**Platform:** iOS + Android (Hackathon MVP via Expo)  
**Author:** Team Vizi

---

# 1. Product Overview

## Product Name

**Vizi — AI Vision Companion**

## Vision

Vizi is an AI-powered mobile assistant that helps visually impaired and colorblind people better understand and interact with the physical world through natural conversation.

Instead of forcing users to learn complex interfaces or expensive assistive devices, Vizi allows them to simply point their phone camera and ask:

> "Can I cross the street?"

> "What am I looking at?"

> "What color is this shirt?"

> "Read this label."

The AI analyzes the live camera feed and responds naturally using a real-time voice assistant.

---

# 2. Problem Statement

340 million people are blind or have low vision.

Their options today:

Free apps → limited
Human interpreters → high $/minute
Hardware → hundreds to thousands

Independence costs real dollars a minute.

Existing assistive technologies often suffer from one or more of the following:

- High cost
- Limited availability
- Complex interfaces
- Narrow functionality
- Slow response times

Modern multimodal AI models can understand images, videos, and natural language simultaneously, making it possible to build a much more intuitive accessibility companion.

---

# 3. Goal

Build an AI companion capable of becoming the user's "second pair of eyes."

The application should:

- Understand the user's surroundings
- Answer natural questions
- Describe environments
- Recognize objects
- Read text aloud
- Identify colors
- Assist during navigation
- Provide contextual safety information

---

# 4. Target Users

Primary:

- Blind users
- Low-vision users
- Colorblind users

Secondary:

- Elderly individuals
- Travelers
- People in unfamiliar environments
- Anyone needing hands-free visual assistance

---

# 5. Core User Experience

The entire application revolves around one simple interaction.

Launch App

↓

Camera opens

↓

User asks naturally

↓

AI observes

↓

AI responds instantly

No menus.

No complicated navigation.

Conversation first.

---

# 6. Primary Use Cases

## Street Crossing

User:

> "Can I cross?"

AI:

> "The pedestrian walk signal is on.
> A vehicle is approaching from the left.
> Please proceed carefully."

---

## Color Recognition

User:

> "What color is this shirt?"

AI:

> "This appears to be dark blue."

---

## Object Recognition

User:

> "Where are my keys?"

AI:

> "I can see them on the table,
> next to your laptop."

---

## Reading Text

User:

> "Read this label."

AI reads the product label naturally.

---

## Environment Awareness

User:

> "Describe what you see."

AI:

> "You are standing in a kitchen.
> There is a chair directly ahead.
> A coffee mug is on the counter."

---

# 7. MVP Features

## Live Camera

- Real-time video feed
- Low latency
- Continuous analysis

---

## AI Vision

Supports:

- Scene understanding
- Object detection
- Color recognition
- OCR
- Context understanding

Powered by Gemini Vision.

---

## Voice Conversation

Natural voice interface.

Supports:

- Speech-to-Text
- AI reasoning
- Text-to-Speech

Conversation should feel like talking to another person.

---

## Accessibility

Large buttons

High contrast

Voice-first navigation

Minimal interaction required

---

# 8. Functional Requirements

## Camera

- Open rear camera
- Stream frames
- Capture context continuously

---

## AI Processing

The AI must understand:

- Objects
- Colors
- People
- Text
- Traffic lights
- Crosswalk signals
- Indoor environments
- Outdoor environments

---

## Audio

The AI should:

- Listen continuously
- Detect end of speech
- Respond naturally
- Interrupt safely when needed

---

## Performance

Target latency:

Less than **2 seconds**

Ideal:

Near real-time.

---

# 9. Non-functional Requirements

## Reliability

Application should recover gracefully from:

- Network interruptions
- Camera failures
- AI response failures

---

## Privacy

No images stored permanently.

Only temporary processing.

Voice history optional.

No personal information retained.

---

## Security

Encrypted API communication.

Secure authentication.

No unnecessary data collection.

---

# 10. Technology Stack

## Mobile

- Expo (React Native) — iOS + Android
- Expo Router
- Live camera stream (continuous analysis; no manual photo capture)
- See [TECH_SPEC.md](./TECH_SPEC.md) for implementation detail

---

## AI

- Google Gemini
- Gemini Live API (primary multimodal voice + vision session)

---

## Voice

- Primary: Gemini Live native audio (in + out)
- Fallback: OS-native STT/TTS (iOS Speech / Android SpeechRecognizer + platform TTS)
- Deepgram is **not** used

---

## Backend

- Cloud Run and/or Cloud Functions (ephemeral Gemini tokens, rate limits)
- Firebase (Auth, Analytics; optional)

---

## Storage

Temporary cloud processing only.

No durable image or audio retention by default.

---

# 11. User Flow

Launch App

↓

Live Camera (opens immediately)

↓

User Speaks

↓

Gemini Live (audio + auto-sampled camera frames)

↓

Spoken AI Response

↓

Continue Conversation

---

# 12. Success Metrics

Technical

- <2 second response latency
- Stable live conversation
- Accurate object recognition
- Accurate OCR
- Accurate color recognition

User Experience

- Zero learning curve
- Launch → camera (no Start gate)
- Natural conversation
- High accessibility score

---

# 13. Market & Business Model

**Market**
- 340M blind or low vision
- 15–30M reachable now
- $4B+ category
- ~14% growth

**Who Pays**
Not the user.
- Venues
- Employers
- Agencies
- Cities

**The Wedge**
Human eyes: ~$1/minute.

Vizi: ~$0.05/minute.

Same service.

95% cheaper.

**Pricing**
Free (limited usage)
→ Everyone

Plus — $7.99/mo
→ Power users

Venue — $200–500 / location / mo

Employer — $300–500 / employee / yr

Agency — $299–499 / user / yr

City — $1–3k / intersection / yr

**One-liner**
Users pay nothing.

The institutions already funding visual interpreting pay us — at a tenth of the cost.

# 14. Hackathon Demo

Scenario 1

User points phone at an intersection.

> "Can I cross?"

AI responds instantly.

---

Scenario 2

User points at clothing.

> "Which shirt is blue?"

AI answers.

---

Scenario 3

User points at a menu.

> "Read this."

AI reads it aloud.

---

Scenario 4

User asks:

> "Describe my surroundings."

AI provides a detailed environmental summary.

---

# 15. Future Roadmap

## Phase 2

- Indoor navigation
- Outdoor navigation
- Smart reminders
- Face recognition (opt-in)
- Currency recognition
- Medication identification

---

## Phase 3

- Smart glasses integration
- Apple Vision Pro
- Wearables
- Offline AI
- Edge inference

---

## Phase 4

- Family safety mode
- Shared location
- Emergency assistance
- Community accessibility maps

---

# 16. Product Principles

Vizi should always be:

- Fast
- Trustworthy
- Human
- Accessible
- Conversational
- Privacy-first

The user should never feel like they are using AI.

They should feel like they are talking to a companion that helps them understand the world.

---

# 17. Mission Statement

Technology should not create barriers—it should remove them.

Vizi empowers visually impaired individuals by transforming the smartphone into an intelligent companion capable of seeing, understanding, and describing the world through natural conversation.

Our mission is to make AI accessible, practical, and life-changing for everyone.
