// A plain CSS device frame: rounded bezel, a Dynamic-Island-style pill on the
// phones, and a minimal status bar. Deliberately generic — no logos, no
// photoreal chrome, no Apple trade dress.
import type { ReactNode } from 'react';

import { colors } from '../theme';
import type { Device, Layout } from '../devices';

const SCREEN_RADIUS_PT = { phone: 55, tablet: 30 } as const;
const BEZEL_COLOR = '#1A1A1F';

function StatusBar({ device }: { device: Device }) {
  const phone = device.kind === 'phone';
  const fontSize = phone ? 15 : 14;
  // Generous side padding, and dropped far enough that the clock sits on the
  // Dynamic Island's centre line rather than crowding the top edge.
  const inset = phone ? 40 : 44;
  return (
    <div
      style={{
        position: 'absolute',
        top: phone ? 19 : 14,
        left: inset,
        right: inset - 4,
        height: 22,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: colors.gray900,
        pointerEvents: 'none',
      }}
    >
      <span style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize, letterSpacing: 0.2 }}>
        9:41
      </span>
      <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        {/* Generic signal / wireless / battery glyphs. */}
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={i * 4.5}
              y={9 - i * 2.6}
              width="3"
              height={3 + i * 2.6}
              rx="1"
              fill={colors.gray900}
            />
          ))}
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
          <path
            d="M1 4.2C3 2.3 5.4 1.3 8 1.3s5 1 7 2.9M3.4 6.9C4.7 5.7 6.3 5 8 5s3.3.7 4.6 1.9M6 9.6c.6-.5 1.3-.8 2-.8s1.4.3 2 .8L8 11.6 6 9.6z"
            stroke={colors.gray900}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none" aria-hidden="true">
          <rect
            x="0.7"
            y="0.7"
            width="22"
            height="10.6"
            rx="3.2"
            stroke={colors.gray900}
            strokeOpacity="0.4"
            strokeWidth="1.2"
          />
          <rect x="2.3" y="2.3" width="17" height="7.4" rx="2" fill={colors.gray900} />
          <path
            d="M24.3 4.3v3.4c.9-.3 1.4-.9 1.4-1.7s-.5-1.4-1.4-1.7z"
            fill={colors.gray900}
            fillOpacity="0.4"
          />
        </svg>
      </span>
    </div>
  );
}

export function DeviceFrame({
  device,
  layout,
  children,
}: {
  device: Device;
  layout: Layout;
  children: ReactNode;
}) {
  const screenRadius = SCREEN_RADIUS_PT[device.kind] * layout.scale;
  return (
    <div
      style={{
        width: layout.deviceW,
        height: layout.deviceH,
        padding: device.bezel,
        boxSizing: 'border-box',
        borderRadius: screenRadius + device.bezel,
        backgroundColor: BEZEL_COLOR,
      }}
    >
      <div
        style={{
          width: layout.screenW,
          height: layout.screenH,
          borderRadius: screenRadius,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: colors.background,
        }}
      >
        {/* The app UI is laid out at true point size and then scaled, so every
            font size and radius means exactly what it does on device. */}
        <div
          style={{
            width: device.screenW,
            height: device.screenH,
            transform: `scale(${layout.scale})`,
            transformOrigin: 'top left',
            position: 'relative',
          }}
        >
          {children}
          <StatusBar device={device} />
          {device.island && (
            <div
              style={{
                position: 'absolute',
                top: device.island.top,
                left: (device.screenW - device.island.width) / 2,
                width: device.island.width,
                height: device.island.height,
                borderRadius: device.island.height / 2,
                backgroundColor: '#000000',
              }}
            />
          )}
          {/* Home indicator. */}
          <div
            style={{
              position: 'absolute',
              bottom: device.kind === 'phone' ? 8 : 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: device.kind === 'phone' ? 140 : 300,
              height: 5,
              borderRadius: 999,
              backgroundColor: 'rgba(23, 23, 23, 0.35)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
