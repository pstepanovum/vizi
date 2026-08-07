// The editable content of the five store slides.
//
// The dashboard loads this, lets you edit it, and PUTs it back to
// config/slides.config.json (see vite.config.ts). `npm run export` reads the
// same saved file, so the PNGs always match what you last saw in the browser.

export type Speaker = 'user' | 'vizi';

export type TranscriptEntry = {
  speaker: Speaker;
  text: string;
};

export type PricePill = {
  label: string;
  price: string;
};

export type Slide = {
  /** Filename slug: {index}-{slug}.png */
  slug: string;
  caption: string;
  /** Supporting line under the caption, in Poppins. */
  subtitle: string;
  screen: 'session' | 'paywall';
  /** File in public/scenes, or '' when the screen has no camera view. */
  scene: string;
  /** Status pill label on the camera frame. */
  status: string;
  showChat: boolean;
  transcript: TranscriptEntry[];
  /** Canvas background behind the device frame — a palette color. */
  background: string;
};

export type PaywallContent = {
  title: string;
  benefits: string[];
  pricing: PricePill[];
};

export type StudioConfig = {
  slides: Slide[];
  paywall: PaywallContent;
};

/** Keep in sync with scripts/fetch-scenes.mjs. */
export const SCENES = [
  { file: 'street.jpg', label: 'Street crossing' },
  { file: 'menu.jpg', label: 'Cafe menu' },
  { file: 'colors.jpg', label: 'Produce aisle' },
  { file: 'train.jpg', label: 'Train ticket' },
  { file: 'kitchen.jpg', label: 'Kitchen' },
  { file: 'clothes-rack.jpg', label: 'Clothes rack' },
] as const;

/**
 * Slide backgrounds cycle through the brand palette: cream, blue, lilac,
 * cream, then back to blue.
 */
export const SLIDE_BACKGROUNDS = ['#F2EAE0', '#B4D3D9', '#BDA6CE', '#F2EAE0', '#B4D3D9'];

export const DEFAULT_CONFIG: StudioConfig = {
  slides: [
    {
      slug: 'crossing',
      caption: 'Cross with confidence',
      subtitle: 'Vizi reads the signal and the traffic before you step.',
      screen: 'session',
      scene: 'street.jpg',
      status: 'Speaking…',
      showChat: true,
      background: '#F2EAE0',
      transcript: [
        { speaker: 'user', text: 'Can I cross?' },
        {
          speaker: 'vizi',
          text: 'Not yet — the signal is a red hand. Traffic is moving on 8th Street.',
        },
      ],
    },
    {
      slug: 'read-out-loud',
      caption: 'Read anything out loud',
      subtitle: 'Menus, labels, mail and signs — instantly.',
      screen: 'session',
      scene: 'menu.jpg',
      status: 'Speaking…',
      showChat: true,
      background: '#B4D3D9',
      transcript: [
        { speaker: 'user', text: 'Read me the breakfast menu.' },
        {
          speaker: 'vizi',
          text: 'Avocado toast, fifteen. House blend coffee, five. Cold brew, ten.',
        },
      ],
    },
    {
      slug: 'know-the-colors',
      caption: 'Know the colors',
      subtitle: 'Ask about any color, anywhere.',
      screen: 'session',
      scene: 'colors.jpg',
      status: 'Speaking…',
      showChat: true,
      background: '#BDA6CE',
      transcript: [
        { speaker: 'user', text: 'What color is this apple?' },
        {
          speaker: 'vizi',
          text: 'Deep red with a yellow blush — a Honeycrisp. The sign says two ninety-nine a pound.',
        },
      ],
    },
    {
      slug: 'find-your-way',
      caption: 'Find your way',
      subtitle: 'Tickets, platforms and signs, read aloud.',
      screen: 'session',
      scene: 'train.jpg',
      status: 'Speaking…',
      showChat: true,
      background: '#F2EAE0',
      transcript: [
        { speaker: 'user', text: 'What does my ticket say?' },
        {
          speaker: 'vizi',
          text: 'Miami to Fort Lauderdale, twelve o\'clock, seat 4B. Platform 12 is ahead on your right.',
        },
      ],
    },
    {
      slug: 'just-ask',
      caption: 'Just point and ask',
      subtitle: 'No menus, no typing. Just conversation.',
      screen: 'session',
      scene: 'kitchen.jpg',
      status: 'Listening…',
      showChat: false,
      background: '#B4D3D9',
      transcript: [],
    },
  ],
  paywall: {
    // Matches paywallTitle / benefit* / toggleAmbient in vizi-mobile/src/lib/i18n.ts.
    title: 'Unlock Vizi Plus',
    benefits: [
      'Unlimited daily questions',
      'Automatic scene narration',
      'Fastest responses',
      'Premium natural voice',
    ],
    pricing: [
      { label: 'Yearly', price: '$49.99' },
      { label: 'Monthly', price: '$6.99' },
    ],
  },
};

/** Deep-ish clone so the dashboard never mutates the defaults. */
export function cloneConfig(config: StudioConfig): StudioConfig {
  return JSON.parse(JSON.stringify(config)) as StudioConfig;
}

/** Fills in anything a hand-edited config file left out. */
export function normalizeConfig(raw: unknown): StudioConfig {
  const base = cloneConfig(DEFAULT_CONFIG);
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  const input = raw as Partial<StudioConfig>;
  return {
    slides: Array.isArray(input.slides) && input.slides.length > 0 ? input.slides : base.slides,
    paywall: { ...base.paywall, ...(input.paywall ?? {}) },
  };
}
