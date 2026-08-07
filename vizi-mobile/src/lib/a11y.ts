import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

// Screen-reader helpers. Vizi's users navigate almost entirely by VoiceOver,
// often with the screen curtain on, so anything the UI conveys visually has to
// reach them through these.

// iOS drops announcements that arrive while a screen transition is still
// animating, so queue them just past the push/present animation.
const SCREEN_TRANSITION_MS = 450;

// Speak a message through the screen reader. A no-op when none is running.
export function announce(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}

// Announce a screen's title once it has settled. VoiceOver's own "screen
// changed" focus lands on the first element, which is often a decorative
// header; the title tells the user where they actually are.
export function useScreenAnnouncement(message: string) {
  useEffect(() => {
    const timer = setTimeout(() => announce(message), SCREEN_TRANSITION_MS);
    return () => clearTimeout(timer);
    // Announce once per screen mount — later re-renders must not re-announce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// Whether VoiceOver (or another screen reader) is running. Used to avoid
// playing our own recorded audio over it — two voices at once is unusable.
export function isScreenReaderEnabled(): Promise<boolean> {
  return AccessibilityInfo.isScreenReaderEnabled().catch(() => false);
}
