// Plain-DOM ports of the shared app components. Every number is the same point
// value the React Native StyleSheet uses, so the recreation matches the device.
import type { CSSProperties, ReactNode } from 'react';

import { colors, radius, spacing, svgToDataUri, typography } from '../theme';

/** vizi-mobile/src/components/screen.tsx */
export function Screen({
  children,
  insetTop,
  insetBottom,
  style,
}: {
  children?: ReactNode;
  insetTop: number;
  insetBottom: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: colors.background,
        paddingLeft: spacing.md,
        paddingRight: spacing.md,
        paddingTop: insetTop,
        paddingBottom: Math.max(insetBottom, spacing.md),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** vizi-mobile/src/components/rounded-button.tsx */
export function RoundedButton({
  label,
  variant = 'primary',
  iconSvg,
  style,
}: {
  label: string;
  variant?: 'primary' | 'neutral';
  iconSvg?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        minHeight: 64,
        boxSizing: 'border-box',
        borderRadius: radius.full,
        backgroundColor: variant === 'neutral' ? colors.gray200 : colors.primary,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingLeft: spacing.md,
        paddingRight: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
        ...style,
      }}
    >
      {iconSvg && <img src={svgToDataUri(iconSvg)} alt="" style={{ width: 22, height: 22 }} />}
      <span
        style={{
          ...typography.button,
          color: colors.textOnPrimary,
          textAlign: 'center',
        }}
      >
        {label}
      </span>
    </div>
  );
}

/** vizi-mobile/src/components/icon-button.tsx */
export function IconButton({
  svg,
  size = 64,
  active = false,
}: {
  svg: string;
  size?: number;
  active?: boolean;
}) {
  const iconSize = Math.round(size * 0.44);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        backgroundColor: active ? colors.primary : colors.gray200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <img src={svgToDataUri(svg)} alt="" style={{ width: iconSize, height: iconSize }} />
    </div>
  );
}
