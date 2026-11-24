// The transaction categories (the `category` column of the dataset): a label, whether the money
// comes in or goes out, and the transaction type a new one gets. Unknown categories from the
// database fall back to "Other". Icons and tints live in the web app (`src/data/categories.ts`),
// keyed by the same category values.

/** Every category the app knows, in one place: the API's category enum is built from this list. */
export const CATEGORY_LIST = [
  'Housing',
  'Utilities',
  'Groceries',
  'Restaurants',
  // Not a dataset category (coffee sits under Restaurants there); added so the coffee nudge is easy to demo.
  'Coffee',
  'Transportation',
  'Health',
  'Entertainment',
  'Lifestyle',
  'Home & Tech',
  'Travel',
  'Invest Deposit',
  'Invest Withdraw',
  'Salary Sweep',
  'Salary',
  'Other Income',
] as const;

export type Category = (typeof CATEGORY_LIST)[number];

export interface CategoryInfo {
  name: string;
  income?: boolean;
}

export const CATEGORIES: Record<Category, CategoryInfo> = {
  Housing: { name: 'Housing' },
  Utilities: { name: 'Utilities' },
  Groceries: { name: 'Groceries' },
  Restaurants: { name: 'Restaurants' },
  Coffee: { name: 'Coffee' },
  Transportation: { name: 'Transport' },
  Health: { name: 'Health' },
  Entertainment: { name: 'Entertainment' },
  Lifestyle: { name: 'Lifestyle' },
  'Home & Tech': { name: 'Home & Tech' },
  Travel: { name: 'Travel' },
  'Invest Deposit': { name: 'Investing' },
  'Invest Withdraw': { name: 'From investments', income: true },
  'Salary Sweep': { name: 'To another bank' },
  Salary: { name: 'Salary', income: true },
  'Other Income': { name: 'Other income', income: true },
};

export function isCategory(category: string): category is Category {
  return Object.prototype.hasOwnProperty.call(CATEGORIES, category);
}

export function categoryInfo(category: string): CategoryInfo {
  return isCategory(category) ? CATEGORIES[category] : { name: category || 'Other' };
}

/** What the "New transaction" screen offers, in S-mobiili's usual order. */
export const EXPENSE_CATEGORIES: Category[] = [
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
export const INCOME_CATEGORIES: Category[] = ['Salary', 'Other Income'];

export function typeFor(category: string) {
  if (category === 'Salary') return 'salary';
  if (category === 'Other Income') return 'other_income';
  if (category === 'Housing') return 'housing_payment';
  if (category === 'Utilities') return 'utilities_payment';
  return 'purchase';
}
