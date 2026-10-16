# Prompt 01: Design brief (taste skill)

I have loaded tasteskill v2 (experimental) as my only source of design rules.

## Context

I am building a take-home technical challenge for Sezzle: a full-stack calculator
(React + TypeScript frontend, Go REST backend). This is a single-screen web app, not a landing page.
The design must feel like a small, polished product made for Sezzle, with a visible credit to its author.

## Brief

- Page kind: single-screen web app (calculator tool), responsive, mobile-first
- Product: Calculator, a clean calculator that calls a Go REST API for every operation
- Audience: engineers and hiring managers reviewing a take-home; they value clarity, correctness and craft over decoration
- Vibe words: friendly, precise, modern, restrained
- References: sezzle.com (brand tone, purple and soft-pink palette), Apple Calculator (layout clarity), Linear (spacing and typography discipline)
- Brand: show the "Sezzle" name in the header; use a Sezzle-inspired palette (deep purple, soft lavender and pink accents); I will confirm exact hex values from the official site
- Credit: a quiet footer line "Built by Valentina Varela Alzate" with links to GitHub and LinkedIn
- Avoid: generic AI-gradient backgrounds, glassmorphism overload, neon glows, emoji as UI icons, em-dashes and en-dashes in any copy, fake testimonials, decorative sections that do not help use the calculator, copying Sezzle logo artwork (use a text wordmark only)

## Functional UI requirements (design must support these)

- Display with expression and result, clear error state (division by zero, invalid input, API unreachable)
- Keypad: digits, + - x /, optional power, square root, percent, clear, backspace, equals
- Keyboard input support, visible focus states, accessible labels (WCAG AA contrast)
- Loading state while the API call is in flight
- A small history list of recent operations
- Responsive: usable at 360px width

## Steps

Step 1. Declare your design read in one sentence and the three dial values with one-line reasoning each. Stop.

Step 2 (after my OK). Implement the UI as a Vite + React + TypeScript app (no Next.js, no landing sections). Lock one theme (light) for the whole app. Use real icons from an icon library, no emoji. Keep components small and testable.

Step 3. Run in writing:

- Em-dash audit (zero em-dashes U+2014 or en-dashes U+2013 anywhere, including code comments and docs)
- Pre-Flight Check from the skill (every box marked Pass or Fail with one-line justification)
- Accessibility audit (contrast, focus order, keyboard use, labels)
- Mobile audit at 360px

Any Fail blocks completion.
