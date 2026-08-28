---
name: Version Radio
description: Underground NZ independent art-radio — digital brutalism. Monochrome with functional red/green status stickers; zero radius, 1px borders.
colors:
  primary: "#ffffff"
  on-primary: "#2f3131"
  background: "#141313"
  surface: "#141313"
  surface-low: "#1c1b1b"
  surface-med: "#201f1f"
  surface-high: "#2a2a2a"
  surface-highest: "#353434"
  on-surface: "#e5e2e1"
  on-surface-variant: "#c4c7c8"
  outline: "#8e9192"
  border-muted: "#333333"
  live-red: "#ff0000"
  on-air-green: "#00ff00"
typography:
  headline:
    fontFamily: "Anton"
  body:
    fontFamily: "Hanken Grotesk"
  label:
    fontFamily: "JetBrains Mono"
rounded:
  all: "0px"
spacing:
  grid-margin: "2rem"
  stack-sm: "8px"
  stack-md: "24px"
  stack-lg: "48px"
  gutter: "1px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#000000"
    rounded: "{rounded.all}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    border: "1px solid {colors.primary}"
    rounded: "{rounded.all}"
  chip:
    backgroundColor: "{colors.primary}"
    textColor: "#000000"
    rounded: "{rounded.all}"
---

# Design System: Version Radio Underground (Stitch)

## Overview

**Creative North Star: "Digital Brutalism"**

Version Radio's system is an exploration of Digital Brutalism and Minimalism for the underground broadcast scene: raw utility, high-contrast legibility, and a sense of independent urgency. Inspired by DIY culture of global independent radio (NTS, The Lot Radio) — unapologetic, information-dense, structurally transparent. The station's personality is **Independent, Curated, Raw**; the aesthetic says "sounds for the between times" — focus, discovery, late-night immersion. Metadata carries as much weight as editorial imagery. This supersedes the earlier "Static After Dark" system.

**Key Characteristics:**
- Strict monochromatic palette + high-saturation functional accents only (LIVE red, ON AIR green stickers)
- Zero radius everywhere — 1px pure-white borders define containers and hierarchy
- Anton headlines (tight leading), JetBrains Mono metadata, Hanken Grotesk body
- Fully flat; depth via layering and contrast, never shadows
- Inversion = the hover/focus language (background flips to white, text to black)

## Colors

- **Primary**: Pure White (#FFFFFF) — text, borders, functional iconography
- **Background/Surface**: #141313; ramp: #1c1b1b / #201f1f / #2a2a2a / #353434
- **On-surface**: #e5e2e1; variant #c4c7c8; outline/faint #8e9192; border-muted #333333
- **Status stickers (functional only)**: live-red #ff0000, on-air-green #00ff00 — used sparingly as "sticker" blocks, never as decoration

### Named Rules
**The Two-Accent Rule.** Red and green are status machinery, not palette entries: LIVE = red block/pulse, ON AIR/connected = green block. Everything else stays mono. If a hue appears anywhere else it was an accident.
**The Border-Not-Shadow Rule.** Containers are 1px white lines. Hover/flip states invert (white bg, black text); never shadows, never blur.

## Typography

Self-hosted webfonts (all intentionally loaded — the station is typography-strong):
- **Headlines (Anton)**: editorial statements, show titles, nav. Tight leading, slight negative tracking, uppercase.
- **Body (Hanken Grotesk)**: descriptions, chat, copy. 400; 600 for emphasis.
- **Metadata (JetBrains Mono 500)**: timestamps, schedule grids, dates, times, labels. 0.05em spacing, uppercase.

### Hierarchy
- **Headline XL** (Anton, clamp(2.75rem, 7vw, 7.5rem), 0.92 lh): hero show title
- **Headline LG** (Anton, clamp(2rem, 4.5vw, 4rem), 0.95 lh): section titles ("LATEST SHOWS")
- **Headline MD** (Anton, 1.75rem): card titles, link rows
- **Headline SM** (Anton, 1.25rem): schedule slot titles, buttons
- **Body** (Hanken Grotesk, 1rem, 1.5)
- **Mono label** (JetBrains Mono, 0.82rem, 500, 0.05em, uppercase): the metadata workhorse

**The Mono Label Rule.** Any unit of time/data/status is set in mono uppercase — it is the system's attention tool in place of colour.

## Layout

- **Rigid grid, visible gutters**: 12-col desktop / 4-col mobile, 2rem page margins; windowpane grids (adjacent 1px borders shared)
- **Information density** high: minimal internal padding, "wall of content" sections
- **Persistent player**: 64px global bar pinned to bottom, 1px top border
- Spacing: 8 / 24 / 48px stacks; 1px gutters

## Elevation & Depth

**Strictly flat.** Depth = layering + contrast. Borders are 1px white. Hover/focus = full inversion. Floating layers (player, menus) use solid surfaces to occlude, not shadows.

### Named Rules
**The Invert Rule.** Hover states flip colour pairs: white bg → black text (or black bg → white text). No tinting, no gradients, no opacity layering to fake depth.

## Shapes

**Zero radius.** No rounded corners anywhere, for any component. Stickers are rectangular blocks that look pasted on. The stepped-V mark is rectilinear and never rounded.

## Components

### Buttons
- **Primary**: solid white block, black text, Anton uppercase; hover inverts (black bg, white text)
- **Outline**: transparent, 1px white border, mono uppercase; hover inverts
- **Play**: full-height 64px segment of the global bar with 1px left border; hover inverts

### Stickers & Badges
- Rectangular blocks: white (neutral), black (replay/off-air on artwork), red (LIVE, pulsing dot), green (ON AIR / connected)
- Used in artwork corners and next to metadata, never elsewhere

### Cards (Show/Mix)
- 1px white border; windowpane grid so cards share borders
- Square art at top (grayscale; hover restores colour), mono metadata row, Anton title; sticker in art corner
- Hover: invert to white bg/black text

### Inputs / Fields
- Fully enclosed 1px white rule or plain underline; mono/uppercase placeholders; focus = 1px white border + 1px white ring (no glow)

### Audio Player Bar
- 64px fixed bottom bar, 1px top border; status sticker block left (green LIVE NOW / dark REPLAY), mono metadata (show · dj · track), play/pause segment far right; 1px separators between segments

## Do's and Don'ts

### Do:
- **Do** use white (#fff) for borders and primary fills; #141313 as canvas
- **Do** set metadata in mono uppercase (0.82rem, 0.05em)
- **Do** use red/green strictly for live/status stickers
- **Do** grayscale artwork at rest, restore colour on inversion/hover
- **Do** load Anton / Hanken Grotesk / JetBrains Mono (self-hosted)
- **Do** keep every corner at 0

### Don't:
- **Don't** round corners, ever — including images, chips, fills
- **Don't** add shadows, gradients, blur, or frosted glass
- **Don't** use red/green except as live/on-air status
- **Don't** soften the stepped-V mark or webfont its geometry
- **Don't** use saas/dashboard visual language: no floating cards, no glowing accents, no rounded pills for navigation
