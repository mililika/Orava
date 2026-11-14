// Dataset categories → Orava baskets.
//
// The S-Bank brief names three baskets: Regular essentials, Unexpected necessities and
// Everyday spending. Everyday spending is split into essentials (groceries, transport) and
// flexible spending, because only flexible spending is used for what-if changes.
//
// Categories not listed here are never dropped: money out goes to "other out" (counted as
// spending), money in goes to "other in" (shown, but not counted as income).

import type { Basket } from './types';

export const CATEGORY_BASKET: Record<string, Basket> = {
  Housing: 'regular',
  Utilities: 'regular',
  Health: 'unexpected',
  'Home & Tech': 'unexpected',
  Groceries: 'everydayEssential',
  Transportation: 'everydayEssential',
  Restaurants: 'flexible',
  // Named in the README; not confirmed in the real data. Harmless if it never appears.
  'Fast Food': 'flexible',
  Lifestyle: 'flexible',
  Entertainment: 'flexible',
  Travel: 'flexible',
  Salary: 'income',
  'Other Income': 'income',
};

export const BASKET_LABEL: Record<Exclude<Basket, 'income'>, string> = {
  regular: 'Regular essentials',
  unexpected: 'Unexpected necessities',
  everydayEssential: 'Everyday essentials',
  flexible: 'Flexible spending',
};

export function basketOf(category: string): Basket | undefined {
  return CATEGORY_BASKET[category];
}

export function isFlexible(category: string) {
  return CATEGORY_BASKET[category] === 'flexible';
}
