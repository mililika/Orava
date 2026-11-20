// Which basket each dataset category belongs to. One place, used by every calculation.

import type { Basket } from './types';

export const BASKET: Record<string, Basket> = {
  Salary: 'income',
  'Other Income': 'income',
  Housing: 'fixed',
  Utilities: 'fixed',
  Groceries: 'needs',
  Transportation: 'needs',
  Health: 'surprises',
  'Home & Tech': 'surprises',
  Restaurants: 'slips',
  Coffee: 'slips',
  Entertainment: 'slips',
  Lifestyle: 'slips',
  Travel: 'slips',
  'Invest Deposit': 'invested',
  'Invest Withdraw': 'transfer',
  'Salary Sweep': 'transfer',
};

/** Unknown categories: money in counts as income, money out as a need. */
export function basketOf(category: string, amount: number): Basket {
  return BASKET[category] ?? (amount > 0 ? 'income' : 'needs');
}

/** Baskets that count as spending. */
export const SPENDING_BASKETS: Basket[] = ['fixed', 'needs', 'surprises', 'slips'];

export const BASKET_LABEL: Record<Basket, string> = {
  income: 'Income',
  fixed: 'Housing',
  needs: 'Essentials',
  surprises: 'Surprises',
  slips: 'Flexible spending',
  invested: 'Invested',
  transfer: 'Transfers',
};
