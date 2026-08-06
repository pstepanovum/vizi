import { SessionStatus } from '@/features/session/session-status';

export type CompanionEvents = {
  onStatus: (status: SessionStatus) => void;
  onPartialReply?: (text: string) => void;
  onFinalReply: (text: string) => void;
  onError: (error: Error) => void;
};

export type VisionCompanion = {
  prepare(): Promise<void>;
  startSession(): Promise<void>;
  pushFrame(jpegBase64: string): void;
  submitUtterance(text: string): void;
  stopPlayback(): void;
  stopSession(): Promise<void>;
  getLastReply(): string | null;
};

export type SessionToken = {
  sessionId: string;
  apiKey: string;
  model: string;
  wsUrl: string;
  mock: boolean;
};
