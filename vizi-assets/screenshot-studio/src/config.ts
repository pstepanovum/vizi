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
  screen: 'session' | 'paywall';
  /** File in public/scenes, or '' when the screen has no camera view. */
  scene: string;
  /** Status pill label on the camera frame. */
  status: string;
  showChat: boolean;
  transcript: TranscriptEntry[];
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
  { file: 'kitchen.jpg', label: 'Kitchen' },
  { file: 'menu.jpg', label: 'Menu board' },
  { file: 'clothes.jpg', label: 'Colorful clothes' },
  { file: 'clothes-rack.jpg', label: 'Clothes rack' },
] as const;

export const DEFAULT_CONFIG: StudioConfig = {
  slides: [
    {
      slug: 'conversation',
      caption: 'See the world through conversation',
      screen: 'session',
      scene: 'street.jpg',
      status: 'Listening…',
      showChat: false,
      transcript: [],
    },
    {
      slug: 'point-and-ask',
      caption: 'Just point and ask',
      screen: 'session',
      scene: 'kitchen.jpg',
      status: 'Speaking…',
      showChat: true,
      transcript: [
        { speaker: 'user', text: "What's on the counter?" },
        {
          speaker: 'vizi',
          text: 'Two orange pots on the stovetop, a knife block, and a small plant by the wall.',
        },
      ],
    },
    {
      slug: 'read-out-loud',
      caption: 'Read anything out loud',
      screen: 'session',
      scene: 'menu.jpg',
      status: 'Speaking…',
      showChat: true,
      transcript: [
        { speaker: 'user', text: 'Read me the menu.' },
        {
          speaker: 'vizi',
          text: 'Iced americano, five fifty. Iced mocha, five fifty. Cold brew, four twenty-five.',
        },
      ],
    },
    {
      slug: 'know-the-colors',
      caption: 'Know the colors',
      screen: 'session',
      scene: 'clothes.jpg',
      status: 'Speaking…',
      showChat: true,
      transcript: [
        { speaker: 'user', text: 'What colour is the top one?' },
        {
          speaker: 'vizi',
          text: 'Light blue, with a yellow and red pattern on it. The one behind is deep red.',
        },
      ],
    },
    {
      slug: 'vizi-plus',
      caption: 'Vizi Plus',
      screen: 'paywall',
      scene: '',
      status: '',
      showChat: false,
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
