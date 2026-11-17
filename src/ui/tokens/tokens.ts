/** Spiegel der Farb-Tokens aus tokens.css, für Kontrasttest und Tests. */
export const lightTokens = {
  bg: '#f7f6f2',
  surface: '#ffffff',
  surface2: '#efede7',
  border: '#8a867c',
  text: '#1c1f24',
  textMuted: '#565b65',
  primary: '#1f3a5f',
  onPrimary: '#ffffff',
  accent: '#38756d',
  success: '#2f6b3f',
  warning: '#8a5a12',
  danger: '#9b2c2c',
  focus: '#2f6fdb',
} as const;

export const darkTokens = {
  bg: '#121417',
  surface: '#1a1d21',
  surface2: '#22262b',
  border: '#6f7680',
  text: '#e8e6e1',
  textMuted: '#a3a7ae',
  primary: '#8fb3e8',
  onPrimary: '#0e1726',
  accent: '#7dbfb4',
  success: '#7fc28f',
  warning: '#e0b060',
  danger: '#ef8f8f',
  focus: '#8fb3e8',
} as const;

export const contrastTokens = {
  bg: '#ffffff',
  surface: '#ffffff',
  surface2: '#f0f0f0',
  border: '#000000',
  text: '#000000',
  textMuted: '#1a1a1a',
  primary: '#00206b',
  onPrimary: '#ffffff',
  accent: '#00574f',
  success: '#0b4a1c',
  warning: '#5c3a00',
  danger: '#7a0000',
  focus: '#0040d0',
} as const;

export type TokenSet = Record<keyof typeof lightTokens, string>;
export const themes: Record<string, TokenSet> = {
  light: lightTokens,
  dark: darkTokens,
  contrast: contrastTokens,
};

/** Fachfarben (nur Akzent): Hell / Dunkel */
export const subjectColors = {
  sage: ['#4f7a5a', '#8fbf9a'],
  ocean: ['#2f6a8f', '#7fb4d6'],
  brick: ['#a0462f', '#e09a85'],
  sand: ['#8a6a2f', '#d4b27a'],
  plum: ['#7a4a7a', '#c79ac7'],
  moss: ['#5f6f2f', '#b0c27a'],
  slate: ['#4a5a6f', '#9fb0c7'],
  amber: ['#946000', '#e0b060'],
} as const;
