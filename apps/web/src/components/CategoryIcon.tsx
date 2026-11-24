import { View } from 'react-native';

import { categoryInfo } from '../data/categories';
import { colors } from '../theme';
import { Icon } from './Icon';

export function CategoryIcon({ category, size = 38 }: { category: string; size?: number }) {
  const info = categoryInfo(category);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: info.tint,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={info.icon} size={size * 0.55} color={colors.green} strokeWidth={1.8} />
    </View>
  );
}
