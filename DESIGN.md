---
version: alpha
name: Orava
description: A phone-first S-Bank money coach with a calm mint canvas, green actions, and a friendly squirrel guide.
colors:
  primary: "#007843"
  action: "#00aa46"
  background: "#ebf7ec"
  surface: "#ffffff"
  text: "#141414"
  secondary-text: "#4a4f4b"
  border: "#e2e9e3"
  warning: "#a8510a"
  danger: "#b3261e"
typography:
  sans:
    fontFamily: "system-ui, sans-serif"
  mono:
    fontFamily: "ui-monospace, monospace"
rounded:
  DEFAULT: "8px"
  card: "8px"
  pill: "999px"
omitted:
  - section: spacing
    reason: "Spacing is set by screen layouts in React Native styles rather than a shared token scale."
components:
  button: {}
  card: {}
  dialog: {}
---

# Orava Design System

## Overview

### Creative North Star

Orava is a pocket-sized Finnish money coach. Its visual world is a familiar mobile banking ledger softened by a small squirrel companion: mint paper, deep S-Bank green, plain readable numbers, and one friendly mascot moment. The analyst screen is an internal window into the historical Junction dataset and keeps that same material language; it does not become a separate analytics dashboard.

### Product context and register

- **Audience and primary job:** S-Bank challenge demo users; understand this month's money and explore anonymized historical dataset aggregates.
- **Target market(s) and evidence:** Finnish banking challenge prototype, documented in the root README. The current UI language is English; the analyst accepts English and Finnish questions through Gemini.
- **Locale(s) and language policy:** English interface copy, euro formatting follows existing `theme.ts`; no localization provider exists yet.
- **Usage scene:** Phone-first, one-hand use in the Orava app; the web build is a centered phone-width frame.
- **Register:** Product utility with a small brand voice from Orava.
- **Memorable signature:** Ask Orava keeps its compact inline chat in Money health and can answer with both current monthly aggregates and historical Junction data.
- **Restraint:** Reuse current colors, card geometry, navigation, and mascot. No new gradients, shadows, dashboard chrome, or decorative data visualizations.
- **Anti-references:** Generic dark trading terminals, gradient-heavy SaaS dashboards, and an AI chat page that hides dates, units, or source-data status.
- **Token ownership/runtime mapping:** `mobile/src/theme.ts` is canonical. Frontmatter values mirror `colors` and `radius`; screen-level dimensions and spacing remain local React Native styles. Analyst screen consumes these existing tokens and does not introduce global palette changes.

## Colors

`primary` is the established S-Bank green for headings and primary actions. `action` is the brighter active accent. `background` and `surface` separate the mint app canvas from white cards. `text`, `secondary-text`, and `border` maintain the existing hierarchy. `warning` and `danger` appear with text labels as well as color. Runtime values live in `mobile/src/theme.ts`.

## Typography

Use the platform system sans stack. Large bold numerals carry existing money-health emphasis; body copy stays compact but readable on a phone. Historical dates, counts, and euro values use plain tabular-style text with explicit units in supporting copy. Long answers wrap; important text is never hover-only or truncated.

## Layout

The app uses a 420px maximum-width phone frame on web and fills the native viewport. Screens own vertical scrolling; headers and bottom navigation retain stable geometry. Content uses short card sections with 12px screen insets and local gaps. The analyst composer stays at the bottom of its screen and yields space to the mobile keyboard.

## Elevation & Depth

Hierarchy comes from white surfaces on mint, spacing, and fine borders. Static cards remain flat. Pressed states use a subtle surface tint. No analyst-specific shadows or overlays.

## Shapes

Shared cards use the existing 8px radius. Primary actions and compact chips use the existing pill radius. Analyst speech bubbles may use their established 14–15px local radius; no global radius token is added for them.

## Components

### Foundational visual states

Use the existing S-mobiili colors and dimensions. Buttons show a clear pressed state and remain at least 44px high. Disabled and busy states keep their geometry. Async data shows an inline status, not a blocking alert. Errors retain the user's question and provide Retry.

### Buttons and actions

Primary action is deep green with white content. Secondary suggestions are quiet white cards with a green chevron. Back navigation uses the shared `AppHeader`.

### Navigation and data display

The app retains its shared header and bottom navigation. Ask Orava stays inside Money health. Its status labels Gemini configuration and historical dataset availability; query answers state periods, units, and filters when the service returns them.

### Forms and overlays

The analyst uses the existing rounded text-field language. The question remains editable between requests; Send disables while a request is active. API failures remain inline with a retry action. No modal or native dialog is needed.

### Iconography

Use the existing thin-line SVG icons in `mobile/src/components/Icon.tsx`. The pulse icon marks historical analysis; text labels remain present.

### Motion

No decorative motion. Use the existing activity indicator during a request and keep transitions immediate and reduced-motion safe.

### Content and data visualization

Use plain language, dates, and euro units. Distinguish historical data from live account data. Label the internal analyst and keep mortgage summaries descriptive; do not imply a lending decision.

## Do's and Don'ts

- **Do:** Keep the analyst visibly inside Orava's existing S-Bank visual language.
- **Do:** Label historical scope and data availability before inviting a question.
- **Don't:** Show a Gemini API key or dataset rows in browser code.
- **Don't:** present cohort outcomes as predictions or lending advice.
