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
  acorn: 'M12 21c-3.5 0-6-2.8-6-7h12c0 4.2-2.5 7-6 7zM5 14a7 5 0 0 1 14 0M12 9V6',
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
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
