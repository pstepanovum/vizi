import { createMockCompanion } from '@/features/companion/mock-companion';
import { SessionStatus } from '@/features/session/session-status';

describe('createMockCompanion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function start(companion: ReturnType<typeof createMockCompanion>) {
    const pending = companion.startSession();
    await jest.advanceTimersByTimeAsync(200);
    await pending;
  }

  it('moves to listening after startSession', async () => {
    const statuses: SessionStatus[] = [];
    const companion = createMockCompanion({
      onStatus: (status) => statuses.push(status),
      onFinalReply: jest.fn(),
      onError: jest.fn(),
    });

    await start(companion);
    expect(statuses).toEqual(['connecting', 'listening']);
  });

  it('answers an utterance using the latest frame context', async () => {
    const replies: string[] = [];
    const statuses: SessionStatus[] = [];
    const companion = createMockCompanion({
      onStatus: (status) => statuses.push(status),
      onFinalReply: (text) => replies.push(text),
      onError: jest.fn(),
    });

    await start(companion);

    companion.pushFrame('frametestbase64');
    companion.submitUtterance('What color is this?');
    await jest.advanceTimersByTimeAsync(500);

    expect(replies[0]).toContain('What color is this?');
    expect(replies[0]).toContain('camera view');
    expect(statuses).toContain('thinking');
    expect(statuses).toContain('speaking');
    expect(companion.getLastReply()).toBe(replies[0]);
  });
});
