// Device presets and the canvas layout maths.
//
// Sizes are the ones App Store Connect accepts in 2026: you only upload the
// largest display in each family (6.9" iPhone, 13" iPad) and Apple scales the
// rest of the listing from those.

export type DeviceId = 'iphone-6.9' | 'iphone-6.9-xl' | 'ipad-13';

export type Device = {
  id: DeviceId;
  label: string;
  /** Final PNG size, in pixels — exactly what App Store Connect wants. */
  width: number;
  height: number;
  /** Playwright deviceScaleFactor. Viewport = width/scale x height/scale. */
  exportScale: number;
  /** Logical screen size of the device, in points. */
  screenW: number;
  screenH: number;
  /** Safe-area insets in points (what useSafeAreaInsets() returns on device). */
  insetTop: number;
  insetBottom: number;
  kind: 'phone' | 'tablet';
  /** Dynamic Island size in points; null on iPad. */
  island: { width: number; height: number; top: number } | null;
  /** Bezel thickness around the screen, in canvas CSS pixels. */
  bezel: number;
  /** Caption type size in canvas CSS pixels. */
  captionSize: number;
  /** Share of canvas height reserved for caption + subtitle. */
  captionZoneRatio: number;
};

export const DEVICES: Device[] = [
  {
    id: 'iphone-6.9',
    label: 'iPhone 6.9" — 1290 x 2796',
    width: 1290,
    height: 2796,
    exportScale: 2,
    screenW: 430,
    screenH: 932,
    insetTop: 62,
    insetBottom: 34,
    kind: 'phone',
    island: { width: 125, height: 36, top: 11 },
    bezel: 10,
    captionSize: 54,
    captionZoneRatio: 0.2,
  },
  {
    id: 'iphone-6.9-xl',
    label: 'iPhone 6.9" — 1320 x 2868',
    width: 1320,
    height: 2868,
    exportScale: 2,
    screenW: 440,
    screenH: 956,
    insetTop: 62,
    insetBottom: 34,
    kind: 'phone',
    island: { width: 125, height: 36, top: 11 },
    bezel: 10,
    captionSize: 55,
    captionZoneRatio: 0.2,
  },
  {
    id: 'ipad-13',
    label: 'iPad 13" — 2064 x 2752',
    width: 2064,
    height: 2752,
    exportScale: 2,
    screenW: 1032,
    screenH: 1376,
    insetTop: 24,
    insetBottom: 20,
    kind: 'tablet',
    island: null,
    bezel: 14,
    captionSize: 76,
    captionZoneRatio: 0.27,
  },
];

export function deviceById(id: string): Device {
  const found = DEVICES.find((device) => device.id === id);
  if (!found) {
    throw new Error(`Unknown device "${id}". Known: ${DEVICES.map((d) => d.id).join(', ')}`);
  }
  return found;
}

export type Layout = {
  canvasW: number;
  canvasH: number;
  captionTop: number;
  captionZone: number;
  captionMaxWidth: number;
  deviceTop: number;
  deviceW: number;
  deviceH: number;
  /** Screen scale: 1 point of app UI = `scale` canvas CSS pixels. */
  scale: number;
  screenW: number;
  screenH: number;
};

const CAPTION_TOP_RATIO = 0.05;
const BOTTOM_PAD_RATIO = 0.03;
const SIDE_MARGIN_RATIO = 0.086;

/**
 * Works out where the device sits on the canvas and how much the point-sized
 * screen has to be scaled. Pure arithmetic — no DOM measuring — so the browser
 * preview and the Playwright export always agree.
 */
export function layoutFor(device: Device): Layout {
  const canvasW = device.width / device.exportScale;
  const canvasH = device.height / device.exportScale;

  const captionTop = Math.round(canvasH * CAPTION_TOP_RATIO);
  const captionZone = Math.round(canvasH * device.captionZoneRatio);
  const bottomPad = Math.round(canvasH * BOTTOM_PAD_RATIO);
  const sideMargin = Math.round(canvasW * SIDE_MARGIN_RATIO);

  const deviceTop = captionTop + captionZone;
  const availableW = canvasW - sideMargin * 2 - device.bezel * 2;
  const availableH = canvasH - deviceTop - bottomPad - device.bezel * 2;

  const scale = Math.min(availableW / device.screenW, availableH / device.screenH);
  const screenW = device.screenW * scale;
  const screenH = device.screenH * scale;

  return {
    canvasW,
    canvasH,
    captionTop,
    captionZone,
    captionMaxWidth: canvasW - sideMargin * 2,
    deviceTop,
    deviceW: screenW + device.bezel * 2,
    deviceH: screenH + device.bezel * 2,
    scale,
    screenW,
    screenH,
  };
}
