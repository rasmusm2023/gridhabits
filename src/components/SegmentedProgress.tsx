import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

type SegmentedProgressProps = {
  count: number;
  total: number;
  size?: number;
  trackColor: string;
  fillColor: string;
  checkColor: string;
  /** Divider + unfilled-slice color (should match so they don’t clash). */
  gapColor: string;
};

/** Option D reference canvas (debug preview). */
const REF = 120;
const REF_RING_STROKE = 3;
const REF_RING_R = 56;
const REF_PIE_R = 44;
const REF_CORNER = 2.5;
const REF_DIVIDER = 5;

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
 * Option D wedge: abutting pie slice with sweep-flag 0 outer fillets
 * (straight radials; subtle inset at the outer corners only).
 */
function describeOptionDWedge(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  cornerRadius: number,
): string {
  const sweep = endAngle - startAngle;
  if (sweep <= 0.01 || sweep >= 359.5) return '';

  const cr = Math.min(
    cornerRadius,
    radius * 0.08,
    radius * Math.sin((sweep * Math.PI) / 360) * 0.45,
  );

  if (cr < 0.35) {
    const start = polar(cx, cy, radius, startAngle);
    const end = polar(cx, cy, radius, endAngle);
    const large = sweep > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y} Z`;
  }

  const d = radius - cr;
  const beta = (Math.asin(Math.min(0.99, cr / d)) * 180) / Math.PI;

  if (beta * 2 >= sweep - 0.5) {
    const start = polar(cx, cy, radius, startAngle);
    const end = polar(cx, cy, radius, endAngle);
    const large = sweep > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y} Z`;
  }

  const reach = d * Math.cos((beta * Math.PI) / 180);
  const startRadial = polar(cx, cy, reach, startAngle);
  const endRadial = polar(cx, cy, reach, endAngle);
  const startArc = polar(cx, cy, radius, startAngle + beta);
  const endArc = polar(cx, cy, radius, endAngle - beta);
  const arcSweep = endAngle - startAngle - 2 * beta;
  const large = arcSweep > 180 ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${startRadial.x} ${startRadial.y}`,
    `A ${cr} ${cr} 0 0 0 ${startArc.x} ${startArc.y}`,
    `A ${radius} ${radius} 0 ${large} 1 ${endArc.x} ${endArc.y}`,
    `A ${cr} ${cr} 0 0 0 ${endRadial.x} ${endRadial.y}`,
    'Z',
  ].join(' ');
}

export function SegmentedProgress({
  count,
  total,
  size = 36,
  trackColor,
  fillColor,
  checkColor,
  gapColor,
}: SegmentedProgressProps) {
  const segments = Math.max(1, total);
  const filled = Math.max(0, Math.min(count, segments));
  const complete = filled >= segments && segments > 0;

  const scale = size / REF;
  const cx = size / 2;
  const cy = size / 2;
  const ringStroke = REF_RING_STROKE * scale;
  const ringR = REF_RING_R * scale;
  const pieR = REF_PIE_R * scale;
  const cornerRadius = REF_CORNER * scale;
  const dividerWidth = REF_DIVIDER * scale;
  const ringColor = filled > 0 ? fillColor : trackColor;
  const slice = 360 / segments;

  const slices = useMemo(() => {
    if (complete || segments <= 1) return [];
    return Array.from({ length: segments }, (_, index) => {
      const start = index * slice;
      const end = (index + 1) * slice;
      return {
        key: index,
        filled: index < filled,
        d: describeOptionDWedge(cx, cy, pieR, start, end, cornerRadius),
      };
    });
  }, [complete, segments, slice, cx, cy, pieR, cornerRadius, filled]);

  const dividers = useMemo(() => {
    if (complete || segments <= 1) return [];
    return Array.from({ length: segments }, (_, index) => {
      const edge = polar(cx, cy, pieR, index * slice);
      return { key: index, x2: edge.x, y2: edge.y };
    });
  }, [complete, segments, slice, cx, cy, pieR]);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={ringR} stroke={ringColor} strokeWidth={ringStroke} fill="none" />

        {complete || (segments === 1 && filled > 0) ? (
          <Circle cx={cx} cy={cy} r={pieR} fill={fillColor} />
        ) : (
          <G>
            {/* Soft track disc — same color as dividers so they blend into empty slices */}
            {filled > 0 ? <Circle cx={cx} cy={cy} r={pieR} fill={gapColor} /> : null}
            {slices.map((item) =>
              item.filled && item.d ? (
                <Path key={item.key} d={item.d} fill={fillColor} />
              ) : null,
            )}
            {dividers.map((item) => (
              <Line
                key={item.key}
                x1={cx}
                y1={cy}
                x2={item.x2}
                y2={item.y2}
                stroke={gapColor}
                strokeWidth={dividerWidth}
                strokeLinecap="butt"
              />
            ))}
          </G>
        )}
      </Svg>

      {complete ? (
        <View style={styles.checkOverlay} pointerEvents="none">
          <Ionicons name="checkmark" size={Math.round(size * 0.42)} color={checkColor} />
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
