import { File, Paths } from 'expo-file-system';

// Free-plan daily question meter, persisted on device and reset each day.
// Vizi Plus removes the cap (checked by the caller).

export const FREE_DAILY_LIMIT = Number(process.env.EXPO_PUBLIC_FREE_DAILY_LIMIT ?? 10);

type Usage = { date: string; count: number };

let cached: Usage | null = null;

function usageFile(): File {
  return new File(Paths.document, 'vizi-usage.json');
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): Usage {
  if (!cached) {
    try {
      const file = usageFile();
      if (file.exists) {
        cached = JSON.parse(file.textSync()) as Usage;
      }
    } catch {
      cached = null;
    }
  }
  if (!cached || cached.date !== today()) {
    cached = { date: today(), count: 0 };
  }
  return cached;
}

export function remainingFreeQuestions(): number {
  return Math.max(0, FREE_DAILY_LIMIT - load().count);
}

export function recordQuestion() {
  const usage = load();
  cached = { date: usage.date, count: usage.count + 1 };
  console.log(`[vizi:usage] question ${cached.count}/${FREE_DAILY_LIMIT} today`);
  try {
    usageFile().write(JSON.stringify(cached));
  } catch (error) {
    console.warn('[vizi:usage] failed to persist:', error);
  }
}
