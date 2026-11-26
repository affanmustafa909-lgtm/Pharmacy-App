import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

/**
 * Classic pharmacy still-life for the Auth screen.
 * Pre-composited onto app off-white (#EEEDE9) so it blends with no
 * checkerboard, matte, or image border.
 */
const HERO = require('../../assets/auth/pharmacy-hero-on-bg.png');

export function CapsuleHero() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Image source={HERO} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 188,
    height: 148,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginTop: 6,
    marginBottom: 10,
  },
  image: {
    width: 188,
    height: 148,
  },
});
