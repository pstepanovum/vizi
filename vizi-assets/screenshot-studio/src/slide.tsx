// One finished store slide: palette background, Chunk caption, device frame.
import { DeviceFrame } from './components/device-frame';
import { PAYWALL_PATTERN_SVG } from './paywall-pattern';
import { PaywallScreen } from './screens/paywall-screen';
import { SessionScreen } from './screens/session-screen';
import { colors, svgToDataUri } from './theme';
import { layoutFor, type Device } from './devices';
import type { PaywallContent, Slide } from './config';

/**
 * Flat palette color plus the app's own decorative pattern — the same
 * treatment the welcome and paywall screens use. No gradients anywhere.
 */
const PATTERN_OPACITY = 0.45;

/** The pattern's own fill in the source SVG. */
const PATTERN_SOURCE_FILL = '#E1D5C9';

function shade(hex: string, factor: number) {
  const n = parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.max(0, Math.min(255, Math.round(c * factor))),
  );
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}


/**
 * Stable per-slide variation: the same slug always yields the same placement,
 * so the dashboard preview and the exported PNG never disagree, but no two
 * slides wear the pattern the same way.
 */
function patternPlacement(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return {
    rotation: (hash % 4) * 90 + ((hash >> 3) % 25) - 12,
    // Stay large enough that rotation never exposes a bare corner.
    scale: 1.45 + (((hash >> 7) % 25) / 100),
    // Keep the busy middle of the artwork on canvas.
    x: 25 + ((hash >> 11) % 50),
    y: 25 + ((hash >> 17) % 50),
    flip: ((hash >> 23) & 1) === 1,
  };
}

export function SlideCanvas({
  device,
  slide,
  paywall,
}: {
  device: Device;
  slide: Slide;
  paywall: PaywallContent;
}) {
  const layout = layoutFor(device);
  const background = slide.background || colors.cream;
  const onCream = background.toUpperCase() === colors.cream.toUpperCase();
  // Pattern shapes are the background, a shade darker. Cream keeps the app's
  // own pairing; the saturated colors need a deeper step to stay visible.
  const patternFill = onCream ? PATTERN_SOURCE_FILL : shade(background, 0.87);
  const patternSvg = PAYWALL_PATTERN_SVG.split(PATTERN_SOURCE_FILL).join(patternFill);
  // Cream carries the dark ink; every palette color carries white.
  const captionColor = onCream ? colors.gray900 : '#FFFFFF';
  const place = patternPlacement(slide.slug + device.id);
  return (
    <div
      data-slide-canvas=""
      style={{
        position: 'relative',
        width: layout.canvasW,
        height: layout.canvasH,
        overflow: 'hidden',
        backgroundColor: background,
        flexShrink: 0,
      }}
    >
      {/* The app's own decorative pattern, placed differently on each slide. */}
      <div
        style={{
          position: 'absolute',
          inset: '-30%',
          opacity: onCream ? PATTERN_OPACITY : 0.75,
          backgroundImage: `url("${svgToDataUri(patternSvg)}")`,
          backgroundSize: 'cover',
          backgroundPosition: `${place.x}% ${place.y}%`,
          transform: `rotate(${place.rotation}deg) scale(${place.scale})${
            place.flip ? ' scaleX(-1)' : ''
          }`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: layout.captionTop,
          left: (layout.canvasW - layout.captionMaxWidth) / 2,
          width: layout.captionMaxWidth,
          height: layout.captionZone,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: 'Chunk',
            fontWeight: 400,
            fontSize: device.captionSize,
            lineHeight: 1.12,
            letterSpacing: device.captionSize * 0.01,
            textAlign: 'center',
            color: captionColor,
          }}
        >
          {slide.caption}
        </h1>
      </div>

      <div
        style={{
          position: 'absolute',
          top: layout.deviceTop,
          left: (layout.canvasW - layout.deviceW) / 2,
        }}
      >
        <DeviceFrame device={device} layout={layout}>
          {slide.screen === 'paywall' ? (
            <PaywallScreen content={paywall} device={device} />
          ) : (
            <SessionScreen slide={slide} device={device} />
          )}
        </DeviceFrame>
      </div>
    </div>
  );
}
