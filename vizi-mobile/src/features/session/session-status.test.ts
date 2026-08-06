import { shouldSampleFrame } from '@/features/camera/use-frame-sampler';
import { statusAnnouncement, statusLabel } from '@/features/session/session-status';

describe('shouldSampleFrame', () => {
  it('samples when enough time has elapsed', () => {
    expect(shouldSampleFrame(2000, 500, 1000)).toBe(true);
    expect(shouldSampleFrame(1200, 500, 1000)).toBe(false);
  });
});

describe('session status copy', () => {
  it('exposes listening announcement for VoiceOver', () => {
    expect(statusLabel('listening')).toBe('Listening…');
    expect(statusAnnouncement('listening')).toContain('Vizi is listening');
  });
});
