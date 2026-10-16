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

Filled in during F13 and F14 (accessibility, mobile at 360px, em-dash audit, Pre-Flight Check).

## Approved by

Approved by Valentina Varela Alzate. Palette and free-font rule confirmed. F3 may start.
