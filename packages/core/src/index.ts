// @orava/core: the Money health engine. Pure TypeScript (no React, React Native, Node APIs,
// network or storage), shared by the web app and the server. The AI prompt (coach) is
// server-only and lives in apps/server/src/ai/.
//
//   transactions ──monthlyTotals()──▶ MonthTotals[] ──scoreOf()──▶ Score ──evaluateOrava()──▶ OravaState
//                                          └── buildHealth() / reportForMonth() ──▶ HealthReport

export * from './ahead';
export * from './baskets';
export * from './benchmarks';
export * from './categories';
export * from './format';
export * from './growth';
export * from './health';
export * from './history';
export * from './logic';
export * from './months';
export * from './moods';
export * from './recurring';
export * from './score';
export * from './signature';
export * from './types';
