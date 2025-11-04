import { StyleSheet } from 'react-native';

// Color palette matching Tailwind CSS
export const colors = {
  // Primary colors
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  
  // Dark theme colors
  dark: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#0F0F0F',
  },
  
  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
  // Common colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// Spacing scale (4px base unit)
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  15: 60,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  96: 384,
};

// Font sizes
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
  '8xl': 96,
  '9xl': 128,
};

// Font weights
export const fontWeight = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
};

// Border radius
export const borderRadius = {
  none: 0,
  sm: 2,
  base: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
};

// Line heights
export const lineHeight = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
};

// Main Tailwind-like utility object
export const tw = {
  // Layout
  flex: { flex: 1 },
  'flex-1': { flex: 1 },
  'flex-row': { flexDirection: 'row' as const },
  'flex-col': { flexDirection: 'column' as const },
  'flex-wrap': { flexWrap: 'wrap' as const },
  'flex-nowrap': { flexWrap: 'nowrap' as const },
  
  // Justify content
  'justify-start': { justifyContent: 'flex-start' as const },
  'justify-end': { justifyContent: 'flex-end' as const },
  'justify-center': { justifyContent: 'center' as const },
  'justify-between': { justifyContent: 'space-between' as const },
  'justify-around': { justifyContent: 'space-around' as const },
  'justify-evenly': { justifyContent: 'space-evenly' as const },
  
  // Align items
  'items-start': { alignItems: 'flex-start' as const },
  'items-end': { alignItems: 'flex-end' as const },
  'items-center': { alignItems: 'center' as const },
  'items-baseline': { alignItems: 'baseline' as const },
  'items-stretch': { alignItems: 'stretch' as const },
  
  // Position
  relative: { position: 'relative' as const },
  absolute: { position: 'absolute' as const },
  
  // Display
  hidden: { display: 'none' as const },
  
  // Self alignment
  'self-start': { alignSelf: 'flex-start' as const },
  'self-center': { alignSelf: 'center' as const },
  'self-end': { alignSelf: 'flex-end' as const },
  
  // Width & Height
  'w-full': { width: '100%' },
  'h-full': { height: '100%' },
  'w-screen': { width: '100vw' },
  'h-screen': { height: '100vh' },
  wFull: { width: '100%' },
  hFull: { height: '100%' },
  w: (size: keyof typeof spacing) => ({ width: spacing[size] }),
  h: (size: keyof typeof spacing) => ({ height: spacing[size] }),
  
  // Padding
  p: (size: keyof typeof spacing) => ({ padding: spacing[size] }),
  px: (size: keyof typeof spacing) => ({ paddingHorizontal: spacing[size] }),
  py: (size: keyof typeof spacing) => ({ paddingVertical: spacing[size] }),
  pt: (size: keyof typeof spacing) => ({ paddingTop: spacing[size] }),
  pb: (size: keyof typeof spacing) => ({ paddingBottom: spacing[size] }),
  pl: (size: keyof typeof spacing) => ({ paddingLeft: spacing[size] }),
  pr: (size: keyof typeof spacing) => ({ paddingRight: spacing[size] }),
  
  // Margin
  m: (size: keyof typeof spacing) => ({ margin: spacing[size] }),
  mx: (size: keyof typeof spacing) => ({ marginHorizontal: spacing[size] }),
  my: (size: keyof typeof spacing) => ({ marginVertical: spacing[size] }),
  mt: (size: keyof typeof spacing) => ({ marginTop: spacing[size] }),
  mb: (size: keyof typeof spacing) => ({ marginBottom: spacing[size] }),
  ml: (size: keyof typeof spacing) => ({ marginLeft: spacing[size] }),
  mr: (size: keyof typeof spacing) => ({ marginRight: spacing[size] }),
  
  // Gap
  gap: (size: keyof typeof spacing) => ({ gap: spacing[size] }),
  
  // Background colors
  bg: (color: string) => ({ backgroundColor: color }),
  'bg-white': { backgroundColor: colors.white },
  'bg-black': { backgroundColor: colors.black },
  'bg-transparent': { backgroundColor: colors.transparent },
  'bg-primary-50': { backgroundColor: colors.primary[50] },
  'bg-primary-100': { backgroundColor: colors.primary[100] },
  'bg-primary-200': { backgroundColor: colors.primary[200] },
  'bg-primary-300': { backgroundColor: colors.primary[300] },
  'bg-primary-400': { backgroundColor: colors.primary[400] },
  'bg-primary-500': { backgroundColor: colors.primary[500] },
  'bg-primary-600': { backgroundColor: colors.primary[600] },
  'bg-primary-700': { backgroundColor: colors.primary[700] },
  'bg-primary-800': { backgroundColor: colors.primary[800] },
  'bg-primary-900': { backgroundColor: colors.primary[900] },
  'bg-primary-500/10': { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  'bg-dark-50': { backgroundColor: colors.dark[50] },
  'bg-dark-100': { backgroundColor: colors.dark[100] },
  'bg-dark-200': { backgroundColor: colors.dark[200] },
  'bg-dark-300': { backgroundColor: colors.dark[300] },
  'bg-dark-400': { backgroundColor: colors.dark[400] },
  'bg-dark-500': { backgroundColor: colors.dark[500] },
  'bg-dark-600': { backgroundColor: colors.dark[600] },
  'bg-dark-700': { backgroundColor: colors.dark[700] },
  'bg-dark-800': { backgroundColor: colors.dark[800] },
  'bg-dark-900': { backgroundColor: colors.dark[900] },
  'bg-dark-950': { backgroundColor: colors.dark[950] },
  'bg-success': { backgroundColor: colors.success },
  'bg-warning': { backgroundColor: colors.warning },
  'bg-error': { backgroundColor: colors.error },
  
  // Text colors
  'text-white': { color: colors.white },
  'text-black': { color: colors.black },
  'text-primary-50': { color: colors.primary[50] },
  'text-primary-100': { color: colors.primary[100] },
  'text-primary-200': { color: colors.primary[200] },
  'text-primary-300': { color: colors.primary[300] },
  'text-primary-400': { color: colors.primary[400] },
  'text-primary-500': { color: colors.primary[500] },
  'text-primary-600': { color: colors.primary[600] },
  'text-primary-700': { color: colors.primary[700] },
  'text-primary-800': { color: colors.primary[800] },
  'text-primary-900': { color: colors.primary[900] },
  'text-dark-50': { color: colors.dark[50] },
  'text-dark-100': { color: colors.dark[100] },
  'text-dark-200': { color: colors.dark[200] },
  'text-dark-300': { color: colors.dark[300] },
  'text-dark-400': { color: colors.dark[400] },
  'text-dark-500': { color: colors.dark[500] },
  'text-dark-600': { color: colors.dark[600] },
  'text-dark-700': { color: colors.dark[700] },
  'text-dark-800': { color: colors.dark[800] },
  'text-dark-900': { color: colors.dark[900] },
  'text-dark-950': { color: colors.dark[950] },
  'text-success': { color: colors.success },
  'text-warning': { color: colors.warning },
  'text-error': { color: colors.error },
  
  // Font sizes
  'text-xs': { fontSize: fontSize.xs },
  'text-sm': { fontSize: fontSize.sm },
  'text-base': { fontSize: fontSize.base },
  'text-lg': { fontSize: fontSize.lg },
  'text-xl': { fontSize: fontSize.xl },
  'text-2xl': { fontSize: fontSize['2xl'] },
  'text-3xl': { fontSize: fontSize['3xl'] },
  'text-4xl': { fontSize: fontSize['4xl'] },
  'text-5xl': { fontSize: fontSize['5xl'] },
  'text-6xl': { fontSize: fontSize['6xl'] },
  'text-7xl': { fontSize: fontSize['7xl'] },
  'text-8xl': { fontSize: fontSize['8xl'] },
  'text-9xl': { fontSize: fontSize['9xl'] },
  
  // Font weights
  'font-thin': { fontWeight: fontWeight.thin as any },
  'font-extralight': { fontWeight: fontWeight.extralight as any },
  'font-light': { fontWeight: fontWeight.light as any },
  'font-normal': { fontWeight: fontWeight.normal as any },
  'font-medium': { fontWeight: fontWeight.medium as any },
  'font-semibold': { fontWeight: fontWeight.semibold as any },
  'font-bold': { fontWeight: fontWeight.bold as any },
  'font-extrabold': { fontWeight: fontWeight.extrabold as any },
  'font-black': { fontWeight: fontWeight.black as any },
  
  // Line heights
  'leading-none': { lineHeight: lineHeight.none },
  'leading-tight': { lineHeight: lineHeight.tight },
  'leading-snug': { lineHeight: lineHeight.snug },
  'leading-normal': { lineHeight: lineHeight.normal },
  'leading-relaxed': { lineHeight: lineHeight.relaxed },
  'leading-loose': { lineHeight: lineHeight.loose },
  leading: (size: keyof typeof spacing) => ({ lineHeight: spacing[size] }),
  
  // Text alignment
  'text-left': { textAlign: 'left' as const },
  'text-center': { textAlign: 'center' as const },
  'text-right': { textAlign: 'right' as const },
  'text-justify': { textAlign: 'justify' as const },
  
  // Border radius
  'rounded-none': { borderRadius: borderRadius.none },
  'rounded-sm': { borderRadius: borderRadius.sm },
  'rounded': { borderRadius: borderRadius.base },
  'rounded-md': { borderRadius: borderRadius.md },
  'rounded-lg': { borderRadius: borderRadius.lg },
  'rounded-xl': { borderRadius: borderRadius.xl },
  'rounded-2xl': { borderRadius: borderRadius['2xl'] },
  'rounded-3xl': { borderRadius: borderRadius['3xl'] },
  'rounded-full': { borderRadius: borderRadius.full },
  
  // Borders
  border: { borderWidth: 1 },
  'border-0': { borderWidth: 0 },
  'border-2': { borderWidth: 2 },
  'border-4': { borderWidth: 4 },
  'border-8': { borderWidth: 8 },
  'border-t': { borderTopWidth: 1 },
  'border-r': { borderRightWidth: 1 },
  'border-b': { borderBottomWidth: 1 },
  'border-l': { borderLeftWidth: 1 },
  
  // Border colors
  'border-white': { borderColor: colors.white },
  'border-black': { borderColor: colors.black },
  'border-primary-50': { borderColor: colors.primary[50] },
  'border-primary-100': { borderColor: colors.primary[100] },
  'border-primary-200': { borderColor: colors.primary[200] },
  'border-primary-300': { borderColor: colors.primary[300] },
  'border-primary-400': { borderColor: colors.primary[400] },
  'border-primary-500': { borderColor: colors.primary[500] },
  'border-primary-500/20': { borderColor: 'rgba(59, 130, 246, 0.2)' },
  'border-primary-600': { borderColor: colors.primary[600] },
  'border-primary-700': { borderColor: colors.primary[700] },
  'border-primary-800': { borderColor: colors.primary[800] },
  'border-primary-900': { borderColor: colors.primary[900] },
  'border-dark-50': { borderColor: colors.dark[50] },
  'border-dark-100': { borderColor: colors.dark[100] },
  'border-dark-200': { borderColor: colors.dark[200] },
  'border-dark-300': { borderColor: colors.dark[300] },
  'border-dark-400': { borderColor: colors.dark[400] },
  'border-dark-500': { borderColor: colors.dark[500] },
  'border-dark-600': { borderColor: colors.dark[600] },
  'border-dark-700': { borderColor: colors.dark[700] },
  'border-dark-800': { borderColor: colors.dark[800] },
  'border-dark-900': { borderColor: colors.dark[900] },
  'border-dark-950': { borderColor: colors.dark[950] },
  'border-success': { borderColor: colors.success },
  'border-warning': { borderColor: colors.warning },
  'border-error': { borderColor: colors.error },
  
  // Shadows
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  'shadow-sm': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  'shadow-md': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  'shadow-lg': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  'shadow-xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  'shadow-2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 16,
  },
};

// Utility function to combine styles (like clsx)
export const cn = (...styles: any[]) => {
  return StyleSheet.flatten(styles.filter(Boolean));
};

// Pre-built component styles
export const componentStyles = StyleSheet.create({
  container: {
    ...tw.flex,
    ...tw['bg-dark-950'],
  },
  
  card: {
    ...tw['bg-dark-800'],
    ...tw['rounded-lg'],
    ...tw.p(4),
    ...tw.border,
    ...tw['border-dark-700'],
  },
  
  button: {
    ...tw['bg-primary-500'],
    ...tw['rounded-lg'],
    ...tw.px(6),
    ...tw.py(3),
    ...tw['items-center'],
  },
  
  'button-secondary': {
    ...tw['bg-dark-800'],
    ...tw['rounded-lg'],
    ...tw.px(6),
    ...tw.py(3),
    ...tw['items-center'],
    ...tw.border,
    ...tw['border-dark-600'],
  },
  
  'button-text': {
    ...tw['text-white'],
    ...tw['font-semibold'],
    ...tw['text-base'],
  },
  
  input: {
    ...tw['bg-dark-800'],
    ...tw['rounded-lg'],
    ...tw.p(4),
    ...tw.border,
    ...tw['border-dark-700'],
    ...tw['text-white'],
    ...tw['text-base'],
  },
  
  heading: {
    ...tw['text-white'],
    ...tw['text-xl'],
    ...tw['font-bold'],
  },
  
  'heading-lg': {
    ...tw['text-white'],
    ...tw['text-3xl'],
    ...tw['font-bold'],
  },
  
  subheading: {
    ...tw['text-dark-400'],
    ...tw['text-sm'],
  },
  
  text: {
    ...tw['text-white'],
    ...tw['text-base'],
  },
  
  'text-secondary': {
    ...tw['text-dark-400'],
    ...tw['text-sm'],
  },
  
  'text-muted': {
    ...tw['text-dark-500'],
    ...tw['text-xs'],
  },
});

// Export everything
export default tw;

