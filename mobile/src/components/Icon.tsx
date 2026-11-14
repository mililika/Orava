// Thin line icons in the S-mobiili style. Add new ones to PATHS.

import Svg, { Path } from 'react-native-svg';

const PATHS = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  card: 'M3 6h18v12H3zM3 10h18',
  plus: 'M12 5v14M5 12h14',
  wallet: 'M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4zM4 7l11-3v3M16 13.5h1',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  chat: 'M4 5h16v11H9l-5 4z',
  check: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l2.7 2.7L16 9.8',
  doc: 'M6 3h9l4 4v14H6zM9 11h7M9 15h7M9 7h3',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  close: 'M6 6l12 12M18 6 6 18',
  acorn: 'M12 21c-3.5 0-6-2.8-6-7h12c0 4.2-2.5 7-6 7zM5 14a7 5 0 0 1 14 0M12 9V6',
  pulse: 'M3 12h4l2-5 4 10 2-5h6',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01',
  down: 'M6 9l6 6 6-6',
  up: 'M6 15l6-6 6 6',
  repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  people:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.6 2.9-5.5 6.5-5.5s6.5 1.9 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c2.2.6 3.5 2.3 3.5 5.2',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  minus: 'M5 12h14',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  // Categories
  bolt: 'M13 3 5 13h6l-1 8 8-10h-6z',
  cart: 'M3 4h2l2.4 11h10.2L20 8H6.2M9 20h.01M17 20h.01',
  fork: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 1-3 4-3 7h3v11',
  cup: 'M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M11 3v3',
  bus: 'M6 4h12a1 1 0 0 1 1 1v12H5V5a1 1 0 0 1 1-1zM5 11h14M8 17v3M16 17v3M8 14h.01M16 14h.01',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  ticket: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM14 7v10',
  bag: 'M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2',
  screen: 'M3 5h18v11H3zM9 20h6M12 16v4',
  plane: 'M10 21l2-7-6-2-2 2-1-1 2-3-1-3 1-1 3 2 6-2-1-6h2l3 7 4 1v2l-4 1-3 7z',
  arrowIn: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  dots: 'M6 12h.01M12 12h.01M18 12h.01',
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 24,
  color = '#141414',
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={PATHS[name]}
        stroke={color}
        strokeWidth={name === 'dots' ? 3 : strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
