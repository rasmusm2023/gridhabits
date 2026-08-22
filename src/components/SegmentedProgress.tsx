import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

type SegmentedProgressProps = {
  count: number;
  total: number;
  size?: number;
  trackColor: string;
  fillColor: string;
  checkColor: string;
  emptyFillColor?: string;
};

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

/** Wedge between innerRadius and outerRadius (ring segment). */
function describeRingSlice(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

export function SegmentedProgress({
  count,
  total,
  size = 28,
  trackColor,
  fillColor,
  checkColor,
  emptyFillColor = 'transparent',
}: SegmentedProgressProps) {
  const segments = Math.max(1, total);
  const filled = Math.max(0, Math.min(count, segments));
  const complete = filled >= segments;
  const cx = size / 2;
  const cy = size / 2;

  const ringStroke = 1.5;
  const outerRingR = size / 2 - ringStroke;
  // Gap between outer circle and pie wedges.
  const rimGap = Math.max(2.5, size * 0.1);
  const pieOuterR = outerRingR - rimGap;
  // Soft center hole so wedges don’t crowd the checkmark.
  const pieInnerR = Math.max(2.5, size * 0.18);
  const gapDeg = segments > 1 ? Math.min(8, 40 / segments) : 0;
  const slice = 360 / segments;

  const paths = useMemo(() => {
    if (segments === 1) return [];
    return Array.from({ length: segments }, (_, index) => {
      const start = index * slice + gapDeg / 2;
      const end = (index + 1) * slice - gapDeg / 2;
      return {
        key: index,
        d: describeRingSlice(cx, cy, pieInnerR, pieOuterR, start, end),
        filled: index < filled,
      };
    });
  }, [segments, slice, gapDeg, cx, cy, pieInnerR, pieOuterR, filled]);

  const ringColor = complete || filled > 0 ? fillColor : trackColor;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cy}
          r={outerRingR}
          stroke={ringColor}
          strokeWidth={ringStroke}
          fill="transparent"
        />

        {segments === 1 ? (
          filled > 0 ? (
            <Circle cx={cx} cy={cy} r={pieOuterR} fill={fillColor} />
          ) : null
        ) : (
          <G>
            {paths.map((item) => (
              <Path
                key={item.key}
                d={item.d}
                fill={item.filled ? fillColor : emptyFillColor}
              />
            ))}
          </G>
        )}
      </Svg>
      {complete ? (
        <View style={styles.checkOverlay} pointerEvents="none">
          <Ionicons name="checkmark" size={Math.round(size * 0.48)} color={checkColor} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
