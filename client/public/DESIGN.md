---
name: The Design System
colors:
  surface: '#f8faf1'
  surface-dim: '#d8dbd3'
  surface-bright: '#f8faf1'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f5ec'
  surface-container: '#ecefe6'
  surface-container-high: '#e6e9e0'
  surface-container-highest: '#e0e4db'
  on-surface: '#191d17'
  on-surface-variant: '#45483b'
  inverse-surface: '#2e322c'
  inverse-on-surface: '#eff2e9'
  outline: '#757969'
  outline-variant: '#c5c8b6'
  surface-tint: '#4f661b'
  primary: '#4f661b'
  on-primary: '#ffffff'
  primary-container: '#8fa956'
  on-primary-container: '#2b3c00'
  inverse-primary: '#b5d179'
  secondary: '#55642a'
  on-secondary: '#ffffff'
  secondary-container: '#d8eba1'
  on-secondary-container: '#5b6a2f'
  tertiary: '#586150'
  on-tertiary: '#ffffff'
  tertiary-container: '#99a38f'
  on-tertiary-container: '#31392a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d1ed92'
  primary-fixed-dim: '#b5d179'
  on-primary-fixed: '#141f00'
  on-primary-fixed-variant: '#384e01'
  secondary-fixed: '#d8eba1'
  secondary-fixed-dim: '#bcce88'
  on-secondary-fixed: '#161f00'
  on-secondary-fixed-variant: '#3d4c14'
  tertiary-fixed: '#dce6d0'
  tertiary-fixed-dim: '#c0cab4'
  on-tertiary-fixed: '#161e10'
  on-tertiary-fixed-variant: '#414939'
  background: '#f8faf1'
  on-background: '#191d17'
  surface-variant: '#e0e4db'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 16px
  margin: 20px
  space-xs: 4px
  space-sm: 8px
  space-md: 16px
  space-lg: 24px
  space-xl: 32px
---

## Brand & Style

This design system embraces a contemporary, flat-yet-tactile aesthetic optimized for a student time-credit skill exchange platform. The visual narrative combines youthful energy with dependable structure, utilizing organic olive tones, deep charcoal card surfaces, and crisp white and lime accents. 

- **Personality:** Approachable, collaborative, dynamic, and trustworthy.
- **Target Audience:** University students and campus mentors exchanging skills through time credits.
- **Emotional Response:** Inspiring, focused, friendly, and refreshing.
- **Design Style:** Modern flat-minimalism paired with high-contrast card layering and rounded organic geometry.

## Colors

The color system builds upon an earthy, modern palette of deep olive greens, soft sage accents, dark charcoal container surfaces, and brilliant lime highlights.

- **Primary (`#8FA956`):** The foundational olive green used for primary brand elements, active states, and key actions.
- **Secondary (`#D4E79E`):** Soft mint/sage for supportive tags, subtle highlights, and background tints.
- **Tertiary (`#1B2315`):** Deep charcoal/black utilized for high-contrast card surfaces and structural containers.
- **Neutral (`#F4F7EE`):** Crisp off-white to light olive canvas background, ensuring optimal legibility and a cohesive, calming environment.
- **Text & Accents:** Pure white (`#FFFFFF`) and vibrant lime (`#C0FF33`) for high-priority text and callouts.

## Typography

Typography relies on a single, highly readable geometric sans-serif family (**Plus Jakarta Sans**) to maintain a clean, modern interface. Hierarchy is established strictly through font sizing, weight contrasts (from regular 400 to bold 700), and intentional color pairing (crisp white and vibrant lime against dark charcoal cards).

## Layout & Spacing

The layout is built on a responsive mobile-first fluid grid system utilizing a 16px gutter and 20px outer canvas margins. 

- **Breakpoints:** Mobile (< 640px) uses a single-column stacked card layout; Tablet (640px - 1024px) introduces two-column modular grids; Desktop (> 1024px) centers the mobile application frame with supportive multi-column side panels for scheduling and skill matching.
- **Rhythm:** Spacing follows an 8px base grid, ensuring consistent vertical rhythm between skill listings, time-credit balances, and booking modules.

## Elevation & Depth

Depth is primarily communicated through high-contrast tonal layering rather than heavy drop shadows. 
- **Surfaces:** Dark charcoal (`#1B2315`) cards float cleanly against the soft olive canvas (`#F4F7EE`), establishing immediate focal points for session summaries and skill credits.
- **Outlines:** Low-contrast soft borders and subtle inset shadows separate interactive containers, keeping the UI flat, clean, and modern.

## Shapes

The design system employs a heavily rounded, pill-inspired shape language (`3`) to create a friendly, approachable environment suitable for student engagement.
- **Containers & Cards:** Generous corner radii (`rounded-xl` / 24px) soften the dark charcoal surfaces.
- **Buttons & Chips:** Fully pill-shaped (`9999px`) components provide tactile, satisfying touch targets for booking sessions and claiming time credits.

## Components

- **Buttons:** Pill-shaped, high-impact primary actions rendered in solid olive or vibrant lime with dark text; secondary actions use translucent sage or outlined strokes.
- **Chips & Tags:** Compact, rounded pills used for skill categories (e.g., "Programming", "Design", "Languages") and time-credit price tags.
- **Lists:** Clean vertical timelines and session history feeds separated by subtle divider lines, featuring clear thumbnail avatars and credit counts.
- **Checkboxes & Radios:** Custom rounded indicators with lime checkmarks for marking skill exchange milestones and daily tasks complete.
- **Input Fields:** Generously padded, dark or soft-tinted pill/rounded inputs with clear placeholder text for searching skills and scheduling sessions.
- **Cards:** Dark charcoal modular surfaces containing user profiles, credit balances, active skill listings, and upcoming booking slots.
- **Specialized Components:** Time-credit balance counters, session status badges (Pending, Confirmed, Completed), and star-rating feedback modals.