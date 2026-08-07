// Recreation of vizi-mobile/src/app/paywall.tsx.
import { CHECK_ICON_SVG, MASCOT_SVG, UNLOCK_ICON_SVG } from '../icons';
import { PAYWALL_PATTERN_SVG } from '../paywall-pattern';
import { colors, spacing, svgToDataUri, typography } from '../theme';
import type { PaywallContent } from '../config';
import type { Device } from '../devices';
import { RoundedButton, Screen } from '../components/ui';

export function PaywallScreen({ content, device }: { content: PaywallContent; device: Device }) {
  return (
    <Screen insetTop={device.insetTop} insetBottom={device.insetBottom}>
      {/* Decorative pattern, 0.4 opacity, exactly as the app renders it. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.4,
          backgroundImage: `url("${svgToDataUri(PAYWALL_PATTERN_SVG)}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* ScrollView contentContainer. `safe center` keeps the short content
          optically centred without ever clipping it on smaller screens. */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'safe center',
          gap: spacing.sm,
          paddingTop: spacing.lg,
          paddingBottom: spacing.lg,
        }}
      >
        <img
          src={svgToDataUri(MASCOT_SVG)}
          alt=""
          style={{ width: 160, height: 158, alignSelf: 'center', objectFit: 'contain' }}
        />
        <span
          style={{
            ...typography.title,
            color: colors.text,
            textAlign: 'center',
            marginTop: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          {content.title}
        </span>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            paddingLeft: spacing.md,
            paddingRight: spacing.md,
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          {content.benefits.map((benefit) => (
            <div
              key={benefit}
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <img
                src={svgToDataUri(CHECK_ICON_SVG)}
                alt=""
                style={{ width: 22, height: 22, flexShrink: 0 }}
              />
              <span style={{ ...typography.body, color: colors.text }}>{benefit}</span>
            </div>
          ))}
        </div>
        {content.pricing.map((pill, index) => (
          <RoundedButton
            key={pill.label}
            label={`${pill.label} — ${pill.price}`}
            iconSvg={index === 0 ? UNLOCK_ICON_SVG : undefined}
            variant={index === 0 ? 'primary' : 'neutral'}
          />
        ))}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: spacing.sm,
            paddingTop: spacing.lg,
            paddingBottom: spacing.md,
          }}
        >
          {['Restore purchases', 'Privacy Policy', 'Terms of Use'].map((label, index) => (
            <div
              key={label}
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              {index > 0 && (
                <span style={{ ...typography.caption, color: colors.gray400 }}>·</span>
              )}
              <div
                style={{
                  minHeight: 44,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: spacing.sm,
                  paddingRight: spacing.sm,
                }}
              >
                <span
                  style={{
                    ...typography.caption,
                    color: colors.gray600,
                    textDecoration: 'underline',
                  }}
                >
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}
