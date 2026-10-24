import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Ellipse, G, Defs, RadialGradient, LinearGradient, Stop, Filter, FeGaussianBlur } from 'react-native-svg';

interface SatsTreeProps {
  progress: number; // 0.0 to 1.0
  width?: number;
  height?: number;
}

export const SatsTree: React.FC<SatsTreeProps> = ({ progress, width = 220, height = 240 }) => {
  const swayAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(swayAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(swayAnim, { toValue: -1, duration: 2500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rotate = swayAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-1.5deg', '1.5deg'] });

  // Tree density based on progress
  const stage = Math.min(Math.floor(progress * 4), 3); // 0-3
  const fruitCount = Math.floor(progress * 7) + 1;
  const canopySize = 0.4 + progress * 0.6;

  const leafColors = {
    dark: '#0A2E12',
    mid: '#1A6B3A',
    bright: '#2D9B57',
    light: '#3DBD6A',
    highlight: '#58E080',
  };

  const fruits = Array.from({ length: Math.min(fruitCount, 7) }, (_, i) => {
    const positions = [
      { cx: 74, cy: 104 }, { cx: 154, cy: 98 }, { cx: 115, cy: 56 },
      { cx: 90, cy: 87 }, { cx: 138, cy: 82 }, { cx: 56, cy: 114 },
      { cx: 170, cy: 110 },
    ];
    return positions[i];
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ rotate }, { scale: pulseAnim }] }]}>
      <Svg width={width} height={height} viewBox="0 0 240 260">
        <Defs>
          <LinearGradient id="trk" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#2A1506" />
            <Stop offset="0.35" stopColor="#5C3A1E" />
            <Stop offset="0.65" stopColor="#7A4E2A" />
            <Stop offset="1" stopColor="#3A2010" />
          </LinearGradient>
          <LinearGradient id="rtg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#5C3A1E" />
            <Stop offset="1" stopColor="#2A1506" stopOpacity="0.2" />
          </LinearGradient>
          <RadialGradient id="llt" cx="35%" cy="25%" r="65%">
            <Stop offset="0" stopColor="#58E080" />
            <Stop offset="0.55" stopColor="#38B060" />
            <Stop offset="1" stopColor="#2A9050" />
          </RadialGradient>
          <RadialGradient id="lmd" cx="40%" cy="30%" r="65%">
            <Stop offset="0" stopColor="#38B060" />
            <Stop offset="0.6" stopColor="#2A9050" />
            <Stop offset="1" stopColor="#166030" />
          </RadialGradient>
          <RadialGradient id="frg" cx="35%" cy="30%" r="65%">
            <Stop offset="0" stopColor="#FFD060" />
            <Stop offset="0.5" stopColor="#F7931A" />
            <Stop offset="1" stopColor="#C4780E" />
          </RadialGradient>
          <RadialGradient id="gsh" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#0A2E14" stopOpacity="0.7" />
            <Stop offset="1" stopColor="#0A2E14" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Ground shadow */}
        <Ellipse cx={120} cy={252} rx={64} ry={10} fill="url(#gsh)" />

        {/* Surface roots */}
        <Path d="M108 244 Q88 254 68 258" stroke="#4A2F14" strokeWidth={6} fill="none" strokeLinecap="round" />
        <Path d="M132 244 Q152 254 172 258" stroke="#4A2F14" strokeWidth={6} fill="none" strokeLinecap="round" />
        <Path d="M118 250 Q114 260 108 268" stroke="#4A2F14" strokeWidth={4} fill="none" strokeLinecap="round" />
        <Path d="M122 250 Q126 260 132 268" stroke="#4A2F14" strokeWidth={4} fill="none" strokeLinecap="round" />

        {/* Trunk shadow */}
        <Path d="M116 248 Q112 196 110 154 Q108 126 112 96" stroke="#180900" strokeWidth={20} fill="none" strokeLinecap="round" />
        {/* Main trunk */}
        <Path d="M113 248 Q109 196 107 154 Q105 126 109 96" stroke="url(#trk)" strokeWidth={17} fill="none" strokeLinecap="round" />
        {/* Trunk highlight */}
        <Path d="M108 244 Q104 192 102 150 Q101 122 105 92" stroke="#7A5030" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.4} />
        {/* Bark cracks */}
        <Path d="M110 216 Q113 211 109 206" stroke="#2A1506" strokeWidth={1.5} fill="none" opacity={0.6} />
        <Path d="M108 186 Q112 181 108 174" stroke="#2A1506" strokeWidth={1.5} fill="none" opacity={0.5} />

        {/* Branches */}
        <Path d="M107 150 Q80 136 52 122" stroke="url(#trk)" strokeWidth={11} fill="none" strokeLinecap="round" />
        <Path d="M52 122 Q36 116 24 112" stroke="url(#trk)" strokeWidth={7} fill="none" strokeLinecap="round" />
        <Path d="M72 136 Q58 114 50 96" stroke="#5C3A1E" strokeWidth={6} fill="none" strokeLinecap="round" />
        <Path d="M111 136 Q140 118 166 104" stroke="url(#trk)" strokeWidth={11} fill="none" strokeLinecap="round" />
        <Path d="M166 104 Q182 96 196 90" stroke="url(#trk)" strokeWidth={7} fill="none" strokeLinecap="round" />
        <Path d="M152 112 Q163 90 168 72" stroke="#5C3A1E" strokeWidth={6} fill="none" strokeLinecap="round" />
        <Path d="M109 104 Q112 80 114 58" stroke="#5C3A1E" strokeWidth={9} fill="none" strokeLinecap="round" />
        <Path d="M112 84 Q95 66 82 52" stroke="#4A2F14" strokeWidth={6} fill="none" strokeLinecap="round" />
        <Path d="M114 76 Q130 58 142 46" stroke="#4A2F14" strokeWidth={6} fill="none" strokeLinecap="round" />

        {/* Back dark leaves */}
        <Ellipse cx={38} cy={108} rx={29 * canopySize} ry={23 * canopySize} fill={leafColors.dark} transform="rotate(-14, 38, 108)" />
        <Ellipse cx={202} cy={84} rx={29 * canopySize} ry={23 * canopySize} fill={leafColors.dark} transform="rotate(14, 202, 84)" />

        {/* Mid leaves */}
        <Ellipse cx={48} cy={94} rx={35 * canopySize} ry={28 * canopySize} fill="url(#lmd)" transform="rotate(-9, 48, 94)" />
        <Ellipse cx={34} cy={101} rx={27 * canopySize} ry={22 * canopySize} fill="url(#lmd)" />
        <Ellipse cx={176} cy={94} rx={35 * canopySize} ry={28 * canopySize} fill="url(#lmd)" transform="rotate(9, 176, 94)" />
        <Ellipse cx={42} cy={134} rx={27 * canopySize} ry={21 * canopySize} fill="url(#lmd)" transform="rotate(14, 42, 134)" />
        <Ellipse cx={182} cy={122} rx={27 * canopySize} ry={21 * canopySize} fill="url(#lmd)" transform="rotate(-14, 182, 122)" />
        <Ellipse cx={112} cy={56} rx={32 * canopySize} ry={26 * canopySize} fill="url(#lmd)" />

        {/* Front bright leaves */}
        <Ellipse cx={113} cy={84} rx={54 * canopySize} ry={44 * canopySize} fill="url(#llt)" />
        <Ellipse cx={92} cy={92} rx={44 * canopySize} ry={36 * canopySize} fill="url(#llt)" transform="rotate(-7, 92, 92)" />
        <Ellipse cx={136} cy={90} rx={44 * canopySize} ry={36 * canopySize} fill="url(#llt)" transform="rotate(7, 136, 90)" />
        <Ellipse cx={113} cy={60} rx={40 * canopySize} ry={32 * canopySize} fill="url(#llt)" />
        <Ellipse cx={68} cy={106} rx={40 * canopySize} ry={32 * canopySize} fill="url(#llt)" transform="rotate(-11, 68, 106)" />
        <Ellipse cx={160} cy={102} rx={40 * canopySize} ry={32 * canopySize} fill="url(#llt)" transform="rotate(11, 160, 102)" />
        <Ellipse cx={113} cy={44} rx={30 * canopySize} ry={24 * canopySize} fill={leafColors.highlight} opacity={0.7} />

        {/* Bitcoin fruits */}
        {fruits.map((pos, i) => (
          <G key={i}>
            <Circle cx={pos.cx} cy={pos.cy} r={i < 3 ? 11 : 8} fill="url(#frg)" />
            <Circle cx={pos.cx - 3} cy={pos.cy - 3} r={i < 3 ? 3 : 2} fill="rgba(255,255,255,0.3)" />
          </G>
        ))}

        {/* Ground & grass */}
        <Ellipse cx={120} cy={250} rx={70} ry={10} fill="#0A2E14" opacity={0.45} />
        <Path d="M82 249 Q80 240 84 233" stroke="#1A6B3A" strokeWidth={2} fill="none" strokeLinecap="round" />
        <Path d="M90 248 Q92 237 88 230" stroke="#2D9B57" strokeWidth={1.5} fill="none" strokeLinecap="round" />
        <Path d="M150 249 Q148 240 152 233" stroke="#1A6B3A" strokeWidth={2} fill="none" strokeLinecap="round" />
        <Path d="M119 249 Q117 242 121 235" stroke="#1A6B3A" strokeWidth={1.5} fill="none" strokeLinecap="round" />

        {/* Sparkles */}
        <Circle cx={96} cy={68} r={1.5} fill="#80F0A0" opacity={0.55} />
        <Circle cx={130} cy={64} r={1} fill="#80F0A0" opacity={0.45} />
        <Circle cx={109} cy={41} r={1.5} fill="#B0FFD0" opacity={0.65} />
        <Circle cx={142} cy={74} r={1} fill="#FFD060" opacity={0.55} />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
