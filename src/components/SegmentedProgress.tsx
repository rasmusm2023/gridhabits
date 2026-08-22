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

function toRad(deg: number) {
  return ((deg - 90) * Math.PI) / 180;
}

function polar(cx: number, cy: number, radius: number, angleDeg: number) {
  const a = toRad(angleDeg);
  return {
    x: cx + radius * Math.cos(a),
    y: cy + radius * Math.sin(a),
  };
}

/**
 * Solid pie wedge (meets at center, no hole) with rounded tip + outer corners.
 */
function describeRoundedWedge(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  cornerRadius: number,
): string {
  const sweep = endAngle - startAngle;
  if (sweep <= 0.5) return '';

  const halfRad = (sweep * Math.PI) / 360;
  const cr = Math.min(
    cornerRadius,
    radius * 0.38,
    radius * Math.sin(halfRad) * 0.85,
  );

  if (cr < 1) {
    const a = polar(cx, cy, radius, startAngle);
    const b = polar(cx, cy, radius, endAngle);
    const large = sweep > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 1 ${b.x} ${b.y} Z`;
  }

  const tipAlong = cr / Math.tan(halfRad);
  const tipStart = polar(cx, cy, tipAlong, startAngle);
  const tipEnd = polar(cx, cy, tipAlong, endAngle);

  // Outer corner angle inset along the rim.
  const outerOff = Math.min((cr / radius) * (180 / Math.PI), sweep / 4 - 0.2);
  const rimStart = polar(cx, cy, radius, startAngle + outerOff);
  const rimEnd = polar(cx, cy, radius, endAngle - outerOff);
  const sideStart = polar(cx, cy, radius - cr, startAngle);
  const sideEnd = polar(cx, cy, radius - cr, endAngle);

  const largeOuter = sweep - 2 * outerOff > 180 ? 1 : 0;

  return [
    `M ${tipStart.x} ${tipStart.y}`,
    `L ${sideStart.x} ${sideStart.y}`,
    // Rounded outer corner (start)
    `A ${cr} ${cr} 0 0 1 ${rimStart.x} ${rimStart.y}`,
    // Outer rim
    `A ${radius} ${radius} 0 ${largeOuter} 1 ${rimEnd.x} ${rimEnd.y}`,
    // Rounded outer corner (end)
    `A ${cr} ${cr} 0 0 1 ${sideEnd.x} ${sideEnd.y}`,
    `L ${tipEnd.x} ${tipEnd.y}`,
    // Rounded tip (bulges toward circle center)
    `A ${cr} ${cr} 0 0 1 ${tipStart.x} ${tipStart.y}`,
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
  const rimGap = Math.max(2.25, size * 0.09);
  const pieOuterR = outerRingR - rimGap;
  const gapDeg = segments > 1 ? Math.min(11, 52 / segments) : 0;
  const slice = 360 / segments;
  const cornerRadius = Math.max(3.5, size * 0.18);

  const paths = useMemo(() => {
    if (segments === 1) return [];
    return Array.from({ length: segments }, (_, index) => {
      const start = index * slice + gapDeg / 2;
      const end = (index + 1) * slice - gapDeg / 2;
      return {
        key: index,
        d: describeRoundedWedge(cx, cy, pieOuterR, start, end, cornerRadius),
        filled: index < filled,
      };
    });
  }, [segments, slice, gapDeg, cx, cy, pieOuterR, cornerRadius, filled]);

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
