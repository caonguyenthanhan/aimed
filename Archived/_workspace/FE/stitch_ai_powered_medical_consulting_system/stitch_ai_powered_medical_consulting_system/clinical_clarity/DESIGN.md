---
name: Clinical Clarity
colors:
  surface: '#f8fafb'
  surface-dim: '#d8dadb'
  surface-bright: '#f8fafb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f5'
  surface-container: '#eceeef'
  surface-container-high: '#e6e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#eff1f2'
  outline: '#747687'
  outline-variant: '#c4c5d8'
  surface-tint: '#1c4bea'
  primary: '#0032b6'
  on-primary: '#ffffff'
  primary-container: '#1447e6'
  on-primary-container: '#c9d0ff'
  inverse-primary: '#b9c3ff'
  secondary: '#5a5f65'
  on-secondary: '#ffffff'
  secondary-container: '#dfe3ea'
  on-secondary-container: '#60656b'
  tertiary: '#004383'
  on-tertiary: '#ffffff'
  tertiary-container: '#005aac'
  on-tertiary-container: '#bcd4ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b9c3ff'
  on-primary-fixed: '#001356'
  on-primary-fixed-variant: '#0035be'
  secondary-fixed: '#dfe3ea'
  secondary-fixed-dim: '#c2c7cd'
  on-secondary-fixed: '#171c21'
  on-secondary-fixed-variant: '#42474d'
  tertiary-fixed: '#d5e3ff'
  tertiary-fixed-dim: '#a8c8ff'
  on-tertiary-fixed: '#001b3c'
  on-tertiary-fixed-variant: '#004689'
  background: '#f8fafb'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
  dark-bg: '#0F1419'
  dark-card: '#1A1F2E'
  destructive: '#E63946'
  muted-blue: '#E8F0FF'
  teal-accent: '#14B8A6'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 60px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-mono:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  button-text:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 1.5rem
  margin-mobile: 1rem
  header-height: 4.5rem
  stack-gap: 1rem
---

## Brand & Style

This design system embodies a **Clinical yet Empathetic** personality, balancing medical precision with approachable warmth. The aesthetic is defined as **Corporate / Modern** with a distinct **Glassmorphic** layer, creating an "app-like" experience that feels like a native tool rather than a traditional website.

The interface prioritizes clarity and immediate utility, using high-quality whitespace and subtle 3D depth to guide the user through complex medical information. It is designed to evoke trust, calmness, and professional reliability for patients and practitioners alike.

**Key Visual Pillars:**
- **App-like Rigor:** Fixed-height layouts with internal scrolling areas to prevent page-level jitter.
- **Glassmorphism:** Use of translucent surfaces to maintain context and depth.
- **Dynamic Atmosphere:** Subtle, animated background "blobs" provide a sense of life and sophisticated technology without distracting from the data.
- **Asymmetry:** Intentional breaks in symmetry, particularly in chat bubbles, to denote conversational directionality.

## Colors

The color palette is rooted in medical blues, leveraging **Strong Blue (#1447E6)** for primary actions to convey authority and trust. **Secondary Blue (#F0F4FB)** provides soft structural separation, while the **Accent Blue (#0088FF)** is reserved for interactive highlights and status indicators.

**Color Application Rules:**
- **Light Mode:** Use the Neutral Background (`#F8FAFB`) with high-contrast text for maximum readability.
- **Dark Mode:** Transition to the Dark Background (`#0F1419`) using `#1A1F2E` for card surfaces to maintain depth without pure black fatigue.
- **Gradients:** Use a subtle "Blue-to-Teal" gradient (`#1447E6` to `#14B8A6`) exclusively for high-impact typography or primary feature cards to draw the eye.
- **Semantic Feedback:** Destructive actions must use the named red, while "muted" variants are used for inactive or background-level information.

## Typography

This design system utilizes **Inter** for all primary communication to ensure accessibility and a clean, humanist feel. **Geist** is employed as a secondary mono font for technical data, code snippets, or precise labels to reinforce the "AI/Scientific" nature of the product.

**Typographic Principles:**
- **Brevity:** Avoid "walls of text." Content should be broken into digestible sections with clear hierarchical headers.
- **Responsive Scaling:** Headlines automatically downscale on mobile devices (e.g., XL headings move to 30-36px range) to maintain readability without excessive scrolling.
- **Visual Emphasis:** Critical clinical insights can use the Gradient Text pattern (Primary Blue to Teal) to differentiate them from standard body copy.

## Layout & Spacing

The system follows an **App-like Layout** philosophy: the root container is fixed to the viewport height (`100vh`) with `overflow: hidden` to prevent global scrolling. Internal components (like the chat window or medical records list) manage their own scrolling states.

**Layout Model:**
- **Grid:** A 12-column fluid grid for desktop, collapsing to 1 column for mobile.
- **Margins:** 24px (1.5rem) horizontal padding on desktop; 16px (1rem) on mobile.
- **Vertical Rhythm:** Use a base 4px/8px scaling system for all gaps and margins.
- **The "Safe Zone":** Account for a fixed header (72px) and a mobile bottom navigation bar (64px) when positioning floating elements or modals.

## Elevation & Depth

Depth is achieved through a combination of **Glassmorphism** and **Ambient Shadows**.

**Layers of Elevation:**
1. **Background:** Flat neutral color with animated, blurred gradient blobs (`blur-120px`) for 3D depth.
2. **Standard Cards:** Low-elevation with subtle shadows (`0 4px 6px -1px rgb(0 0 0 / 0.1)`).
3. **Glass Panels:** Used for headers and floating sidebars. Requires a backdrop blur of `10px` and a semi-transparent background (`rgba(255, 255, 255, 0.8)` in light mode; `rgba(30, 41, 59, 0.8)` in dark mode).
4. **Interactive Elements:** Buttons and cards should utilize a "Lift" effect on hover (`translate-y-[-4px]`) with an intensified shadow to signal interactivity.

## Shapes

The shape language is primarily **Rounded (8px)**, providing a friendly and modern feel that avoids the harshness of sharp corners.

**Special Shape Rules:**
- **Chat Bubbles:** These use an asymmetrical corner logic to signify the speaker.
    - **User Bubbles:** Rounded on three corners, sharp (4px) on the bottom-right.
    - **AI/Bot Bubbles:** Rounded on three corners, sharp (4px) on the bottom-left.
- **Buttons:** Fully rounded (Pill-shaped) for primary CTAs to distinguish them from structural cards.
- **Inputs:** Standard 8px (0.5rem) rounding to match the card rhythm.

## Components

### Buttons
- **Primary:** Solid Primary Blue background, white text. Hover state includes a slight vertical lift and increased shadow.
- **Secondary:** Secondary Blue background with Primary Blue text. No shadow.
- **Ghost:** Transparent background with Primary Blue text, subtle background fill on hover.

### Chat Bubbles
- **User:** Primary or Accent Blue background with white text. Asymmetrical rounding (bottom-right sharp).
- **AI/Bot:** Secondary Blue background (Light Mode) or Dark Card background (Dark Mode). Asymmetrical rounding (bottom-left sharp).

### Input Fields
- High-contrast borders in Light Mode, soft borders in Dark Mode. Focus state must use a 2px Primary Blue ring with a subtle glow. Use Geist font for technical input fields.

### Cards
- **Feature Cards:** Incorporate a `group-hover` effect that scales the internal Lucide icon and applies a subtle gradient overlay.
- **Medical Record Cards:** Flat, high-contrast typography, using Geist for ID numbers or dates.

### Custom Scrollbar
- Standard browser scrollbars are hidden. Use a custom `6px` wide scrollbar that matches the border color of the current theme, turning more opaque on hover.