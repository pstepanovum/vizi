// Recreation of vizi-mobile/src/app/index.tsx (the camera session screen),
// with the live camera replaced by a still photo from public/scenes.
import { CHAT_ICON_SVG, MIC_ON_ICON_SVG } from '../icons';
import { colors, radius, spacing, typography } from '../theme';
import type { Slide } from '../config';
import type { Device } from '../devices';
import { IconButton, RoundedButton, Screen } from '../components/ui';

/** vizi-mobile/src/features/session/session-status-bar.tsx */
function SessionStatusBar({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
        paddingLeft: spacing.md,
        paddingRight: spacing.md,
        borderRadius: radius.full,
        backgroundColor: colors.gray100,
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: radius.full,
          backgroundColor: colors.primary,
          flexShrink: 0,
        }}
      />
      <span style={{ ...typography.caption, color: colors.text }}>{label}</span>
    </div>
  );
}

/** vizi-mobile/src/features/session/chat-transcript.tsx */
function ChatTranscript({ entries }: { entries: Slide['transcript'] }) {
  return (
    <div
      style={{
        maxHeight: 240,
        borderRadius: radius.lg,
        overflow: 'hidden',
        // BlurView intensity 55 / tint "extraLight" over a thin white wash.
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
        backdropFilter: 'blur(24px) saturate(1.6) brightness(1.12)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.6) brightness(1.12)',
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
        paddingLeft: spacing.md,
        paddingRight: spacing.md,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
        }}
      >
        {entries.map((entry, index) => (
          <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <span
              style={{
                ...typography.caption,
                color: colors.gray600,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {entry.speaker === 'user' ? 'You' : 'Vizi'}
            </span>
            <span style={{ ...typography.body, color: colors.gray900 }}>{entry.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SessionScreen({ slide, device }: { slide: Slide; device: Device }) {
  return (
    <Screen insetTop={device.insetTop} insetBottom={device.insetBottom}>
      {/* header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: spacing.md,
          paddingBottom: spacing.md,
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }} />
        <span style={{ ...typography.brand, color: colors.text }}>Vizi</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <RoundedButton
            label="Vizi+"
            style={{ minHeight: 44, paddingTop: spacing.sm, paddingBottom: spacing.sm }}
          />
        </div>
      </div>

      {/* cameraArea */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {/* CameraFrame: radius.xl, clipped, gray900 behind the preview. */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: radius.xl,
            overflow: 'hidden',
            backgroundColor: colors.gray900,
          }}
        >
          {slide.scene && (
            <img
              src={`/scenes/${slide.scene}`}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
        </div>

        {slide.status && (
          <div
            style={{
              position: 'absolute',
              top: spacing.md,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <SessionStatusBar label={slide.status} />
          </div>
        )}

        {slide.showChat && slide.transcript.length > 0 && (
          <div
            style={{
              position: 'absolute',
              left: spacing.md,
              right: spacing.md,
              bottom: spacing.md,
            }}
          >
            <ChatTranscript entries={slide.transcript} />
          </div>
        )}
      </div>

      {/* footer */}
      <div
        style={{
          paddingTop: spacing.lg,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xxl,
          flexShrink: 0,
        }}
      >
        <IconButton svg={MIC_ON_ICON_SVG} size={72} />
        <IconButton svg={CHAT_ICON_SVG} size={72} active={slide.showChat} />
      </div>
    </Screen>
  );
}
