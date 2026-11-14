// Display info for each transaction category (the `category` column of the dataset):
// a label, an icon, a tint for the round icon badge, and whether it is money in or out.
// Unknown categories from the database fall back to "Other".

import type { IconName } from '../components/Icon';

export interface CategoryInfo {
  name: string;
  icon: IconName;
  /** Badge background; the icon itself is always dark green, so color is never the only signal. */
  tint: string;
  income?: boolean;
}

export const CATEGORIES: Record<string, CategoryInfo> = {
  Housing: { name: 'Housing', icon: 'home', tint: '#dcefe2' },
  Utilities: { name: 'Utilities', icon: 'bolt', tint: '#fdf1d6' },
  Groceries: { name: 'Groceries', icon: 'cart', tint: '#e3f3d9' },
  Restaurants: { name: 'Restaurants', icon: 'fork', tint: '#fde5dc' },
  // Not a dataset category (coffee sits under Restaurants there); added so the coffee nudge is easy to demo.
  Coffee: { name: 'Coffee', icon: 'cup', tint: '#f3e7dc' },
  Transportation: { name: 'Transport', icon: 'bus', tint: '#dfeaf8' },
  Health: { name: 'Health', icon: 'heart', tint: '#fbe3ea' },
  Entertainment: { name: 'Entertainment', icon: 'ticket', tint: '#ece3f7' },
  Lifestyle: { name: 'Lifestyle', icon: 'bag', tint: '#f6e6f3' },
  'Home & Tech': { name: 'Home & Tech', icon: 'screen', tint: '#e6ecef' },
  Travel: { name: 'Travel', icon: 'plane', tint: '#dff2f4' },
  Salary: { name: 'Salary', icon: 'arrowIn', tint: '#d9f2df', income: true },
  'Other Income': { name: 'Other income', icon: 'arrowIn', tint: '#d9f2df', income: true },
};

const OTHER: CategoryInfo = { name: 'Other', icon: 'dots', tint: '#eef1ee' };

export function categoryInfo(category: string): CategoryInfo {
  return CATEGORIES[category] ?? { ...OTHER, name: category || 'Other' };
}

/** What the "New transaction" screen offers, in S-mobiili's usual order. */
export const EXPENSE_CATEGORIES = [
  'Groceries',
  'Restaurants',
  'Coffee',
  'Transportation',
  'Housing',
  'Utilities',
  'Health',
  'Lifestyle',
  'Entertainment',
  'Home & Tech',
  'Travel',
];
export const INCOME_CATEGORIES = ['Salary', 'Other Income'];

/** Transaction type column value for a new transaction in this category. */
export function typeFor(category: string) {
  if (category === 'Salary') return 'salary';
  if (category === 'Other Income') return 'other_income';
  if (category === 'Housing') return 'housing_payment';
  if (category === 'Utilities') return 'utilities_payment';
  return 'purchase';
}
