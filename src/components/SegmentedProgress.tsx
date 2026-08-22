import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { Ionicons } from '@expo/vector-icons';

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

function describeSlice(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`,
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
  const radius = size / 2 - 1.25;
  const gap = segments > 1 ? Math.min(5, 32 / segments) : 0;
  const slice = 360 / segments;

  const paths = useMemo(() => {
    return Array.from({ length: segments }, (_, index) => {
      if (segments === 1) return null;
      const start = index * slice + gap / 2;
      const end = (index + 1) * slice - gap / 2;
      return {
        key: index,
        d: describeSlice(cx, cy, radius, start, end),
        filled: index < filled,
      };
    });
  }, [segments, slice, gap, cx, cy, radius, filled]);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {segments === 1 ? (
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={complete || filled > 0 ? fillColor : trackColor}
            strokeWidth={1.5}
            fill={complete ? fillColor : 'transparent'}
          />
        ) : (
          <G>
            {paths.map((item) =>
              item ? (
                <Path
                  key={item.key}
                  d={item.d}
                  fill={item.filled ? fillColor : emptyFillColor}
                  stroke={trackColor}
                  strokeWidth={1.1}
                />
              ) : null,
            )}
          </G>
        )}
      </Svg>
      {complete ? (
        <View style={styles.checkOverlay} pointerEvents="none">
          <Ionicons name="checkmark" size={Math.round(size * 0.52)} color={checkColor} />
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
