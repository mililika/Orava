// The prompt for Orava's month overview (the Orava card on Home and the Money health hero), and
// the JSON shape Gemini answers in. The reply is checked with OverviewDto from @orava/contracts.

import { monthName } from '@orava/core';

/** Gemini's response schema (OpenAPI-style), matching OverviewDto. */
export const OVERVIEW_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    good: { type: 'STRING' },
    bad: { type: 'STRING' },
  },
  required: ['summary', 'good', 'bad'],
  propertyOrdering: ['summary', 'good', 'bad'],
};

/** `latest`: the newest month in the data, still going on. */
export function overviewPrompt(month: string, latest: boolean): string {
  return `Check-in on ${monthName(month)}${latest ? ' so far' : ' (it is over, so use the past tense)'} for the tiny Orava card. Pick what matters most. As few words as possible, simple words, round numbers.
Reply as JSON:
- summary: the verdict, max 7 words (e.g. "Solid month, but eating out ran high.").
- good: the one thing going well, max 6 words, with a number (e.g. "Rent only 31% of income").
- bad: the one thing to change, max 8 words, with a number and the fix (e.g. "Eating out €300: cook twice weekly").
Plain text, no markdown, no emoji.`;
}
