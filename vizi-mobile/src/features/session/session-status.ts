import { t } from '@/lib/i18n';

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
      return t('statusNeedsPermission');
    case 'connecting':
      return t('statusConnecting');
    case 'listening':
      return t('statusListening');
    case 'thinking':
      return t('statusThinking');
    case 'speaking':
      return t('statusSpeaking');
    case 'error':
      return t('statusError');
  }
}

export function statusAnnouncement(status: SessionStatus): string {
  switch (status) {
    case 'listening':
      return t('annListening');
    case 'connecting':
      return t('annConnecting');
    case 'thinking':
      return t('annThinking');
    case 'speaking':
      return t('annSpeaking');
    case 'needs_permission':
      return t('annNeedsPermission');
    case 'error':
      return t('annError');
  }
}
