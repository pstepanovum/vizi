export type SessionStatus =
  | 'needs_permission'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

export function statusLabel(status: SessionStatus): string {
  switch (status) {
    case 'needs_permission':
      return 'Camera access needed';
    case 'connecting':
      return 'Connecting…';
    case 'listening':
      return 'Listening…';
    case 'thinking':
      return 'Thinking…';
    case 'speaking':
      return 'Speaking…';
    case 'error':
      return 'Something went wrong';
  }
}

export function statusAnnouncement(status: SessionStatus): string {
  switch (status) {
    case 'listening':
      return 'Vizi is listening. Point your camera and ask a question.';
    case 'connecting':
      return 'Vizi is connecting.';
    case 'thinking':
      return 'Vizi is thinking.';
    case 'speaking':
      return 'Vizi is speaking.';
    case 'needs_permission':
      return 'Vizi needs camera access to see the world around you.';
    case 'error':
      return 'Vizi hit a problem. You can try reconnecting.';
  }
}
