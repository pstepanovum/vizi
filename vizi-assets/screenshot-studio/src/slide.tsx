// One finished store slide: palette background, Chunk caption, device frame.
import { DeviceFrame } from './components/device-frame';
import { PAYWALL_PATTERN_SVG } from './paywall-pattern';
import { PaywallScreen } from './screens/paywall-screen';
import { SessionScreen } from './screens/session-screen';
import { colors, svgToDataUri } from './theme';
import { layoutFor, type Device } from './devices';
import type { PaywallContent, Slide } from './config';

/**
 * Flat cream plus the app's own decorative pattern — the same treatment the
 * welcome and paywall screens use. No gradients anywhere in Vizi's design.
 */
const PATTERN_OPACITY = 0.45;

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
  return (
    <div
      data-slide-canvas=""
      style={{
        position: 'relative',
        width: layout.canvasW,
        height: layout.canvasH,
        overflow: 'hidden',
        backgroundColor: colors.cream,
        flexShrink: 0,
      }}
    >
      {/* The app's own decorative pattern, scaled up to fill the canvas. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: PATTERN_OPACITY,
          backgroundImage: `url("${svgToDataUri(PAYWALL_PATTERN_SVG)}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
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
            color: colors.gray900,
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
