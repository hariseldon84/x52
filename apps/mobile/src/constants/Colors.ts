const tintColorLight = '#007AFF';
const tintColorDark = '#007AFF';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    border: '#E5E5E7',
    primary: '#007AFF',
    secondary: '#5856D6',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    info: '#00C7BE',
    card: '#F2F2F7',
    muted: '#8E8E93',
  },
  dark: {
    text: '#ECEDEE',
    background: '#000000',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    border: '#1C1C1E',
    primary: '#007AFF',
    secondary: '#5856D6',
    success: '#32D74B',
    warning: '#FF9F0A',
    danger: '#FF453A',
    info: '#64D2FF',
    card: '#1C1C1E',
    muted: '#8E8E93',
  },
};

export type ColorScheme = keyof typeof Colors;