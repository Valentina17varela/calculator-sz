# Design read


## Design read (one sentence)

A single-screen calculator that feels like a small Sezzle product page: a calm white ground, one deep
purple for ink and actions, soft lavender surfaces and a mint highlight for results, and a big, quiet
numeric display in the Apple-calculator tradition set with Linear's spacing discipline.

## The three dials

1. **Palette: light ground, deep purple ink, purple action, mint result.** Sezzle's current brand is
   deep purple, lavender and mint on white, so the calculator inherits it directly and reads as
   "made for Sezzle" at a glance. One action color (purple) on the equals key and focus ring; mint
   marks the result and success states. Pink is not part of the palette.
2. **Type: one free geometric sans, large numeric display.** A single family, Plus Jakarta Sans
   (SIL Open Font License, self-hosted through `@fontsource-variable/plus-jakarta-sans`, no CDN, no paid
   font), with a system-font fallback. Display numbers set 2.5rem to 3.5rem with tabular figures
   (`font-variant-numeric: tabular-nums`, supported by the font), everything else 16px.
3. **Space and shape: generous spacing, fully round keys.** 8-point spacing scale, keys at 48px or
   more (44px minimum per the brief), fully round buttons (one decision, applied everywhere), surfaces
   separated by tone steps, never lines or shadows.

## Palette (measured from sezzle.com)

Values were measured from the HTML and CSS of the sezzle.com home page by usage frequency and role.
Roles are an inference from that usage; the owner approved this palette.

| Role | Hex | Evidence on sezzle.com | Contrast |
|---|---|---|---|
| Ground | `#FFFFFF` | page background | n/a |
| Ink (text, deep purple) | `#201733` | most used dark purple (15 uses in HTML); close neighbors `#382757`, `#241b3b` | 17.05 on white |
| Action purple (equals key, links, focus ring) | `#8333D4` | buttons and text in CSS (11 uses in HTML) | white on it: 6.20 |
| Action hover (equals key and links on hover) | `#6D2AB3` | darker step of the action purple, derived (not measured); accepted by the owner | white on it: 7.98 |
| Lavender (surfaces, operator keys) | `#F2E6FF` | section tints (26 uses in HTML) | ink on it: 14.24 |
| Mint (result highlight, success) | `#9FF4D9` | most repeated brand color (42 uses in HTML) | ink on it: 13.33 |
| Neutral surface | `#F8F8F8` | background in CSS | `#4F4F4F` on it: 7.71 |
| Muted text | `#4F4F4F` | secondary text in CSS | 7.71 on `#F8F8F8` |
| Error | `#C81828` | red used on sezzle.com | to verify in F13 (target 4.5 or more on white) |

Rules for use:

- Text pairs must reach WCAG AA (4.5:1 or more). All pairs above do, except Error, which is checked in F13.
- Focus ring: `:focus-visible` rounds only `button` elements; links and other elements keep their own shape (to apply in F13).
- Purple on lavender (`#8333D4` on `#F2E6FF`) is 5.17, allowed for text of 16px and above.
- Mint is never used for text on white; it is a fill with ink text on top.
- No pink, no gradients, no glow, no shadows. Tone steps separate surfaces.

## Typography

| Role | Spec |
|---|---|
| Family | Plus Jakarta Sans (variable, OFL), fallback `system-ui, -apple-system, "Segoe UI", sans-serif` |
| Display | 2.5rem to 3.5rem, weight 600, tabular figures, tight tracking |
| Keys | 1.25rem, weight 500 |
| Body and labels | 1rem, weight 400 to 500 |
| Fine print (footer) | 0.875rem |

Why not Satoshi (the font sezzle.com uses): it is a paid font. Plus Jakarta Sans is the closest free
alternative in feel (geometric, friendly), keeps the project license-clean and works offline in Docker.

## Decisions to carry into the README

- Palette measured from sezzle.com, not guessed.
- Fully free and open-source assets only (fonts under OFL, icons under MIT or ISC).
- Brand use: text wordmark "Sezzle" only, no logo artwork.

## Audits

### F13 audit, run 1 (real Chrome, 360, 768 and 1280 px, app served with the real backend)

| Check | 360 px | 768 px | 1280 px | Notes |
|---|---|---|---|---|
| No horizontal page scroll, initial state | Pass | Pass | Pass | |
| No horizontal page scroll with a 64 digit history entry | **Fail** | **Fail** | Pass | Page is 708 px wide at 360 px and 866 px at 768 px |
| Every button at least 44 x 44 px (22 keys) | Pass | Pass | Pass | |
| Display of `2 ^ 100` (31 digits) fully visible | Pass | Pass | Pass | Steps down to 20 px at 360 px, no overflow |
| Display of a 64 digit result fully visible | Pass | Pass | Pass | |
| History item contains its content | **Fail** | **Fail** | **Fail** | Item is 668 px wide inside a 280 px column; the result breaks one digit per line and the pill grows to about 1,200 px tall |
| Visible focus ring on keyboard focus | Pass | Pass | Pass | 3 px solid, 2 px offset |
| Error alert text | Pass | Pass | Pass | "Cannot divide by zero", display value turns red |
| Plus Jakarta Sans loads | Pass | Pass | Pass | |
| Console: no errors other than the expected `422` | **Fail** | Pass | Pass | One `404` on first load at 360 px: no favicon is declared |

Contrast of the colors used by the components (WCAG AA needs 4.5 or more for text):

| Pair | Ratio | Result |
|---|---|---|
| Error text on the lavender banner | 4.85 | Pass |
| Error value on the display surface | 5.47 | Pass |
| Wordmark purple on white | 6.20 | Pass |
| White on the equals key | 6.20 | Pass |
| Muted text on the display surface and on white | 7.71 and 8.19 | Pass |
| Ink on lavender keys | 14.24 | Pass |

Findings from run 1 (all closed in run 2):

1. History item layout: stacked expression above result in a card, both wrap.
2. No favicon: an inline SVG favicon is declared in `index.html`.
3. CSP in the Docker build: checked in run 2 below.

### F13 audit, run 2 (after the fixes; also run against the nginx image with the strict CSP)

| Check | 360 px | 768 px | 1280 px |
|---|---|---|---|
| No horizontal page scroll, initial state | Pass | Pass | Pass |
| No horizontal page scroll with a 64 digit history entry | Pass | Pass | Pass |
| Every button at least 44 x 44 px (22 keys) | Pass | Pass | Pass |
| Display of `2 ^ 100` and of a 64 digit result fully visible | Pass | Pass | Pass |
| History item contains its content (no overflow) | Pass | Pass | Pass |
| Visible focus ring (3 px solid, 2 px offset) | Pass | Pass | Pass |
| Console: only the expected `422` of the `1 / 0` test, no `404` | Pass | Pass | Pass |
| `Content-Security-Policy` (`style-src 'self'`, no `unsafe-inline`): no violations, font and favicon load | Pass | Pass | Pass |

### F14 audits (taste skill v2 linter, axe-core, em-dash audit)

Run against the real app in Chrome: the skill's source linter, axe-core in four app states, and our own audits at 360, 768 and 1280 px.

| Audit | Result | Detail |
|---|---|---|
| Em-dash and en-dash audit (whole repo, excluding `node_modules`, `.git`, `.agents` and lockfiles) | **Pass** | 0 hits |
| `lint.mjs` on 11 source files | **0 FAIL, 1 WARN** | `default-font`: Plus Jakarta Sans. Defense: the brand's own face (Satoshi) is a paid font and paid fonts are ruled out; this is the closest free geometric sans, with tabular figures verified |
| Mobile audit (360 px, our script) | **Pass** | No horizontal scroll, keys 44 px or more, display and history contain their content |
| Accessibility (axe-core, WCAG 2.0, 2.1 and 2.2 A and AA plus best practices, four app states) | **2 findings** | Below |

Accessibility findings (axe-core), second run after the first fixes:

| Rule | Impact | Status | Detail |
|---|---|---|---|
| `page-has-heading-one` | moderate | **Fixed** | The wordmark is now an `<h1>` with the same look |
| `label-content-name-mismatch` on the history buttons | serious (WCAG 2.5.3) | **Open, cause found** | The label "0.1 + 0.2 0.3, use result" is already contiguous, but the two `<span>` elements have no whitespace between them, so the visible text is read as "0.1 + 0.20.3". Adding a space between the spans fixes it (verified in the browser: 0 violations) and changes nothing visually |
| `label-content-name-mismatch` (needs review, 4 nodes) | n/a | Accepted | Keys whose visible text differs from the accessible name: `C` is "Clear", `+/-` is "Negate", `.` is "Decimal point", `^` is "Power" |

Everything else passed: roles, names, landmarks, live regions, language, color contrast and keyboard access (35 to 37 rules per state).

The look (step 8), by reading the screenshots: one numeric focal element, one action color used only on `=`, surfaces separated by tone steps (no lines, shadows or gradients), one round shape applied everywhere, and a calm, readable column at every width. Weaker points: the wordmark is small, desktop leaves a lot of empty page around a 420 px column (intentional for a calculator), and mixed text and icon glyphs on a few keys. The formal 14-pass scored critique of `references/critique.md` was not run.

## Approved by

Approved by Valentina Varela Alzate. Palette and free-font rule confirmed. F3 may start.
