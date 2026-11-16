import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** Corner-bracket scan icon matching the Hera tab bar. */
export function ScanGlyph({ color = '#FFFFFF', size = 22, style }: Props) {
  const arm = size * 0.32;
  const thickness = Math.max(2, size * 0.1);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={[
          styles.corner,
          {
            top: 0,
            left: 0,
            width: arm,
            height: arm,
            borderTopWidth: thickness,
            borderLeftWidth: thickness,
            borderColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            top: 0,
            right: 0,
            width: arm,
            height: arm,
            borderTopWidth: thickness,
            borderRightWidth: thickness,
            borderColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            bottom: 0,
            left: 0,
            width: arm,
            height: arm,
            borderBottomWidth: thickness,
            borderLeftWidth: thickness,
            borderColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            bottom: 0,
            right: 0,
            width: arm,
            height: arm,
            borderBottomWidth: thickness,
            borderRightWidth: thickness,
            borderColor: color,
          },
        ]}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.18,
          right: size * 0.18,
          top: size / 2 - thickness / 2,
          height: thickness,
          backgroundColor: color,
          borderRadius: thickness,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  corner: {
    position: 'absolute',
  },
});
