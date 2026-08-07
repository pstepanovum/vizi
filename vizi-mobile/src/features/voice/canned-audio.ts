// Pre-recorded phrases (Sarah voice, all app languages) — played from the
// bundle so frequent system messages cost zero TTS API calls.
import { languageCode } from '@/lib/i18n';

export type CannedKey = 'freeLimitReached' | 'agentError';

const CANNED: Record<CannedKey, Record<string, number>> = {
  freeLimitReached: {
    en: require('../../../assets/audio/free-limit-reached.en.mp3'),
    es: require('../../../assets/audio/free-limit-reached.es.mp3'),
    fr: require('../../../assets/audio/free-limit-reached.fr.mp3'),
    de: require('../../../assets/audio/free-limit-reached.de.mp3'),
    it: require('../../../assets/audio/free-limit-reached.it.mp3'),
    pt: require('../../../assets/audio/free-limit-reached.pt.mp3'),
    ru: require('../../../assets/audio/free-limit-reached.ru.mp3'),
    uk: require('../../../assets/audio/free-limit-reached.uk.mp3'),
    zh: require('../../../assets/audio/free-limit-reached.zh.mp3'),
    ja: require('../../../assets/audio/free-limit-reached.ja.mp3'),
    ko: require('../../../assets/audio/free-limit-reached.ko.mp3'),
    ar: require('../../../assets/audio/free-limit-reached.ar.mp3'),
  },
  agentError: {
    en: require('../../../assets/audio/agent-error.en.mp3'),
    es: require('../../../assets/audio/agent-error.es.mp3'),
    fr: require('../../../assets/audio/agent-error.fr.mp3'),
    de: require('../../../assets/audio/agent-error.de.mp3'),
    it: require('../../../assets/audio/agent-error.it.mp3'),
    pt: require('../../../assets/audio/agent-error.pt.mp3'),
    ru: require('../../../assets/audio/agent-error.ru.mp3'),
    uk: require('../../../assets/audio/agent-error.uk.mp3'),
    zh: require('../../../assets/audio/agent-error.zh.mp3'),
    ja: require('../../../assets/audio/agent-error.ja.mp3'),
    ko: require('../../../assets/audio/agent-error.ko.mp3'),
    ar: require('../../../assets/audio/agent-error.ar.mp3'),
  },
};

export function cannedAudioSource(key: CannedKey): number {
  return CANNED[key][languageCode] ?? CANNED[key].en;
}
