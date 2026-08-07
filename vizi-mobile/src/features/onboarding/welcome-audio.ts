// Pre-recorded welcome slideshow voiceover (Sarah voice, all app languages) —
// bundled so onboarding narration works offline and costs zero TTS API calls.
import { resolvedLanguageCode } from '@/lib/i18n';

export type WelcomeSlide = 1 | 2 | 3;

const WELCOME: Record<WelcomeSlide, Record<string, number>> = {
  1: {
    en: require('../../../assets/audio/onboarding/welcome-1.en.mp3'),
    es: require('../../../assets/audio/onboarding/welcome-1.es.mp3'),
    fr: require('../../../assets/audio/onboarding/welcome-1.fr.mp3'),
    de: require('../../../assets/audio/onboarding/welcome-1.de.mp3'),
    it: require('../../../assets/audio/onboarding/welcome-1.it.mp3'),
    pt: require('../../../assets/audio/onboarding/welcome-1.pt.mp3'),
    ru: require('../../../assets/audio/onboarding/welcome-1.ru.mp3'),
    uk: require('../../../assets/audio/onboarding/welcome-1.uk.mp3'),
    zh: require('../../../assets/audio/onboarding/welcome-1.zh.mp3'),
    ja: require('../../../assets/audio/onboarding/welcome-1.ja.mp3'),
    ko: require('../../../assets/audio/onboarding/welcome-1.ko.mp3'),
    ar: require('../../../assets/audio/onboarding/welcome-1.ar.mp3'),
  },
  2: {
    en: require('../../../assets/audio/onboarding/welcome-2.en.mp3'),
    es: require('../../../assets/audio/onboarding/welcome-2.es.mp3'),
    fr: require('../../../assets/audio/onboarding/welcome-2.fr.mp3'),
    de: require('../../../assets/audio/onboarding/welcome-2.de.mp3'),
    it: require('../../../assets/audio/onboarding/welcome-2.it.mp3'),
    pt: require('../../../assets/audio/onboarding/welcome-2.pt.mp3'),
    ru: require('../../../assets/audio/onboarding/welcome-2.ru.mp3'),
    uk: require('../../../assets/audio/onboarding/welcome-2.uk.mp3'),
    zh: require('../../../assets/audio/onboarding/welcome-2.zh.mp3'),
    ja: require('../../../assets/audio/onboarding/welcome-2.ja.mp3'),
    ko: require('../../../assets/audio/onboarding/welcome-2.ko.mp3'),
    ar: require('../../../assets/audio/onboarding/welcome-2.ar.mp3'),
  },
  3: {
    en: require('../../../assets/audio/onboarding/welcome-3.en.mp3'),
    es: require('../../../assets/audio/onboarding/welcome-3.es.mp3'),
    fr: require('../../../assets/audio/onboarding/welcome-3.fr.mp3'),
    de: require('../../../assets/audio/onboarding/welcome-3.de.mp3'),
    it: require('../../../assets/audio/onboarding/welcome-3.it.mp3'),
    pt: require('../../../assets/audio/onboarding/welcome-3.pt.mp3'),
    ru: require('../../../assets/audio/onboarding/welcome-3.ru.mp3'),
    uk: require('../../../assets/audio/onboarding/welcome-3.uk.mp3'),
    zh: require('../../../assets/audio/onboarding/welcome-3.zh.mp3'),
    ja: require('../../../assets/audio/onboarding/welcome-3.ja.mp3'),
    ko: require('../../../assets/audio/onboarding/welcome-3.ko.mp3'),
    ar: require('../../../assets/audio/onboarding/welcome-3.ar.mp3'),
  },
};

export function welcomeAudioSource(slide: WelcomeSlide): number {
  return WELCOME[slide][resolvedLanguageCode()] ?? WELCOME[slide].en;
}
