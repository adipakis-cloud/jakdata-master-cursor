import type { CSSProperties } from 'react';

export const PAN = {
  blue: '#0047AB',
  blueLight: '#0066CC',
  blueSoft: '#4A90D9',
  blueDeep: '#003580',
  blueBg: '#F0F4FF',
  white: '#FFFFFF',
  red: '#CC0000',
} as const;

export const CARD_SHELL: CSSProperties = {
  padding: 24,
  background: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: 16,
  backdropFilter: 'blur(10px)',
  color: PAN.white,
  height: '100%',
  boxSizing: 'border-box',
};

export const PHOTO_STYLE: CSSProperties = {
  width: 100,
  height: 120,
  objectFit: 'cover',
  borderRadius: 12,
  border: '3px solid #FFFFFF',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
};

export const NAME_STYLE: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: PAN.white,
  margin: '0 0 12px',
  lineHeight: 1.25,
};

export const BADGE_FONT = { fontSize: 11, fontWeight: 700 as const };
