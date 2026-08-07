// Local voice-command intents, handled instantly on-device — no Gemini call.
// Matched against short final transcripts in the session's language.

export type VoiceCommand = 'stop' | 'repeat';

const STOP_PHRASES = [
  // en
  'stop', 'stop talking', 'be quiet', 'quiet', 'silence', 'shut up', 'okay stop',
  // es
  'para', 'cállate', 'silencio', 'deja de hablar', 'basta',
  // fr
  'tais-toi', 'arrête', 'arrête de parler', 'chut',
  // de
  'stopp', 'halt', 'sei still', 'ruhe', 'hör auf',
  // it
  'fermati', 'zitto', 'smetti di parlare',
  // pt
  'pare', 'cala a boca', 'para de falar', 'silêncio',
  // ru
  'стоп', 'замолчи', 'тихо', 'хватит', 'перестань',
  // uk
  'замовкни', 'досить', 'припини',
  // zh
  '停止', '别说了', '安静', '闭嘴', '停',
  // ja
  'やめて', '止まって', '静かに', 'ストップ',
  // ko
  '그만', '조용히', '멈춰',
  // ar
  'توقف', 'اصمت', 'اسكت',
];

const REPEAT_PHRASES = [
  // en
  'repeat', 'say again', 'say that again', 'repeat that', 'come again',
  // es
  'repite', 'otra vez', 'repítelo',
  // fr
  'répète', 'encore une fois', 'redis-le',
  // de
  'wiederhole', 'nochmal', 'noch einmal',
  // it
  'ripeti', 'un’altra volta', 'ancora',
  // pt
  'repete', 'de novo', 'outra vez',
  // ru
  'повтори', 'ещё раз', 'еще раз',
  // uk
  'повтори', 'ще раз',
  // zh
  '再说一遍', '重复', '再来一次',
  // ja
  'もう一度', '繰り返して',
  // ko
  '다시 말해줘', '다시', '반복해줘',
  // ar
  'أعد', 'كرر', 'مرة أخرى',
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Whole-phrase, word-boundary containment: "OK stop talking" matches "stop
// talking"; "stopwatch" does not match "stop".
function containsPhrase(heard: string, phrase: string): boolean {
  const words = ` ${heard} `;
  return words.includes(` ${normalize(phrase)} `);
}

// Only short utterances qualify as commands — "stop at the next corner and
// tell me what you see" must go to the model, not the stop intent.
export function matchVoiceCommand(transcript: string): VoiceCommand | null {
  const heard = normalize(transcript);
  if (!heard || heard.split(' ').length > 4) {
    return null;
  }
  if (STOP_PHRASES.some((p) => containsPhrase(heard, p))) {
    return 'stop';
  }
  if (REPEAT_PHRASES.some((p) => containsPhrase(heard, p))) {
    return 'repeat';
  }
  return null;
}
