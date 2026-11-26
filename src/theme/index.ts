export const colors = {
  background: '#EEEDE9',
  backgroundAlt: '#F5F5F3',
  surface: '#FFFFFF',
  text: '#131315',
  textSecondary: '#8A8A8E',
  textMuted: '#A0A0A4',
  border: '#E5E5E5',
  borderStrong: '#1A1A1A',
  primary: '#171A18',
  primaryContrast: '#FFFFFF',
  accent: '#2DB8A8',
  accentSoft: '#E6F7F5',
  accentDark: '#1F9A8C',
  danger: '#FF3B30',
  warning: '#FFB020',
  success: '#2DB8A8',
  chipOrange: '#FFF0E6',
  chipOrangeText: '#D97706',
  chipTeal: '#E6F7F5',
  chipTealText: '#0F766E',
  chipPurple: '#F3EFFF',
  chipPurpleText: '#7C3AED',
  chipPink: '#FFE8EF',
  chipPinkText: '#DB2777',
  productBlue: '#D4F0F7',
  productPink: '#F9C5D5',
  productMint: '#D8F3E8',
  productLavender: '#E8E4F8',
  mapSand: '#E8E2D6',
  mapRoad: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.35)',
  glass: 'rgba(255,255,255,0.72)',
  shadow: 'rgba(17,17,17,0.08)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const shadows = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  float: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const typography = {
  brand: {
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    color: colors.text,
  },
  hero: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
    color: colors.text,
    lineHeight: 40,
  },
  heroLight: {
    fontSize: 34,
    fontWeight: '400' as const,
    letterSpacing: -0.8,
    color: colors.textSecondary,
    lineHeight: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  price: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
  },
  button: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.primaryContrast,
  },
};
