// Jest matchers for RNTL are available without a separate extend-expect import on v14+.

jest.mock('@speechmatics/expo-two-way-audio', () => ({
  initialize: jest.fn(async () => undefined),
  playPCMData: jest.fn(),
  toggleRecording: jest.fn(() => false),
  tearDown: jest.fn(),
  restart: jest.fn(),
  requestMicrophonePermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
  useExpoTwoWayAudioEventListener: jest.fn(),
}));
