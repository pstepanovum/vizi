import { SessionStatus } from '@/features/session/session-status';

export type CompanionEvents = {
  onStatus: (status: SessionStatus) => void;
  onPartialReply?: (text: string) => void;
  onFinalReply: (text: string) => void;
  /** Raw model audio (base64 PCM). Prefer over local TTS when present. */
  onAudioChunk?: (base64Pcm: string, mimeType: string) => void;
  /** Model was interrupted or local barge-in — flush playback. */
  onInterrupted?: () => void;
  onError: (error: Error) => void;
};

export type CompanionMode = 'firebase' | 'live' | 'mock';

export type VisionCompanion = {
  prepare(): Promise<void>;
  startSession(): Promise<void>;
  pushFrame(jpegBase64: string): void;
  /** Optional: stream mic PCM (s16le) when companion uses native Live audio. */
  pushAudio?(pcm: Uint8Array, mimeType?: string): void;
  submitUtterance(text: string): void;
  stopPlayback(): void;
  stopSession(): Promise<void>;
  getLastReply(): string | null;
  /** When true, session should use Gemini audio I/O instead of OS STT/TTS. */
  usesNativeAudio?: boolean;
};

export type SessionToken = {
  sessionId: string;
  apiKey: string;
  model: string;
  wsUrl: string;
  mock: boolean;
};
