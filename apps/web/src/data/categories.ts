// How each transaction category looks: an icon and a tint for the round icon badge. The names,
// money in/out and transaction types live in @orava/core; this adds the look on top.
// Unknown categories from the database fall back to "Other".

import {
  type Category,
  type CategoryInfo as CoreCategoryInfo,
  categoryInfo as coreInfo,
  isCategory,
} from '@orava/core';

import type { IconName } from '../components/Icon';

export interface CategoryStyle {
  icon: IconName;
  /** Badge background; the icon itself is always dark green, so color is never the only signal. */
  tint: string;
}

export type CategoryInfo = CoreCategoryInfo & CategoryStyle;

export const CATEGORY_STYLES: Record<Category, CategoryStyle> = {
  Housing: { icon: 'home', tint: '#dcefe2' },
  Utilities: { icon: 'bolt', tint: '#fdf1d6' },
  Groceries: { icon: 'cart', tint: '#e3f3d9' },
  Restaurants: { icon: 'fork', tint: '#fde5dc' },
  Coffee: { icon: 'cup', tint: '#f3e7dc' },
  Transportation: { icon: 'bus', tint: '#dfeaf8' },
  Health: { icon: 'heart', tint: '#fbe3ea' },
  Entertainment: { icon: 'ticket', tint: '#ece3f7' },
  Lifestyle: { icon: 'bag', tint: '#f6e6f3' },
  'Home & Tech': { icon: 'screen', tint: '#e6ecef' },
  Travel: { icon: 'plane', tint: '#dff2f4' },
  'Invest Deposit': { icon: 'acorn', tint: '#e8eedb' },
  'Invest Withdraw': { icon: 'acorn', tint: '#e8eedb' },
  'Salary Sweep': { icon: 'wallet', tint: '#e6ecef' },
  Salary: { icon: 'arrowIn', tint: '#d9f2df' },
  'Other Income': { icon: 'arrowIn', tint: '#d9f2df' },
};

/** Icon and tint for a category the app doesn't list (core names it "Other"). */
const OTHER: CategoryStyle = { icon: 'dots', tint: '#eef1ee' };

/** Name, money in/out, icon and tint for a category value. */
export function categoryInfo(category: string): CategoryInfo {
  return { ...coreInfo(category), ...(isCategory(category) ? CATEGORY_STYLES[category] : OTHER) };
}
