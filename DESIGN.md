---
name: "تربية خاصة — رف المواد"
description: "A calm Arabic RTL teaching workspace grounded in real learning materials."
colors:
  brand: "#714d35"
  brand-dark: "#5a3b28"
  brand-deep: "#3f2a1e"
  brand-night: "#1f1611"
  tan: "#a87c5c"
  tan-light: "#d9bfa6"
  olive: "#4c5730"
  ink: "#2c1f22"
  muted: "#6e5f62"
  line: "#e4d4cb"
  canvas: "#f5efeb"
  paper: "#fffbf9"
  cream: "#f7efe0"
  sage: "#e5eadb"
  sand: "#f3e7d3"
  rose: "#f3e2e4"
  sky: "#dfe6e8"
  hover-line: "#c7b29d"
  on-brand: "#fff7ea"
  sidebar-muted: "#e6cfbd"
  admin-wordmark: "#fff1db"
  answer-green: "#6f8d58"
  preview-paper: "#f8f5ef"
  preview-line: "#ded8cf"
  preview-night: "#25262c"
  preview-night-border: "#414149"
  preview-night-sidebar: "#16171c"
  preview-night-line: "#5c5f68"
typography:
  display: { fontFamily: "Readex Pro, Tajawal, sans-serif", fontSize: "clamp(32px, 2.65vw, 40px)", fontWeight: 700, lineHeight: 1.4 }
  heading: { fontFamily: "Readex Pro, Tajawal, sans-serif", fontSize: "28px", fontWeight: 700, lineHeight: 1.45 }
  page-heading: { fontFamily: "Readex Pro, Tajawal, sans-serif", fontSize: "42px", fontWeight: 700, lineHeight: 1.4 }
  editor-heading: { fontFamily: "Readex Pro, Tajawal, sans-serif", fontSize: "32px", fontWeight: 700, lineHeight: 1.4 }
  body: { fontFamily: "Readex Pro, Tajawal, sans-serif", fontSize: "18px", fontWeight: 400, lineHeight: 1.75 }
  control: { fontFamily: "Readex Pro, Tajawal, sans-serif", fontSize: "18px", fontWeight: 600 }
rounded:
  control: "10px"
  button: "11px"
  card: "16px"
  tile: "14px"
  hero: "18px"
  nav: "9px"
  status: "7px"
  inset: "12px"
  small: "8px"
  grade-badge: "20px"
  preview-line: "2px"
components:
  button-primary: { backgroundColor: "{colors.brand}", textColor: "#ffffff", rounded: "{rounded.button}", padding: "10px 22px", typography: "{typography.control}" }
  button-secondary: { backgroundColor: "{colors.paper}", textColor: "{colors.brand-deep}", rounded: "{rounded.button}", padding: "10px 22px", typography: "{typography.control}" }
  panel: { backgroundColor: "{colors.paper}", textColor: "{colors.ink}", rounded: "{rounded.card}" }
---

# Design System: رف المواد

## Overview

**Creative North Star: "Learning materials within reach"**

The brown school identity (espresso, saddle brown and tan, with olive as the second colour), original wordmark and clay learning materials anchor a calm, legible Arabic RTL workspace. Warm paper surfaces support preparation, teaching and observation; quieter olive rooms keep the learner's immediate task central. This records the approved implementation direction and the actual build. Generated concepts supplied the visual target and production imagery; full-page pixel fidelity has not been measured.

**Key Characteristics:**
- Arabic RTL structure with clear Arabic typography and deliberate mixed-direction fields.
- Brown identity, warm paper panels and clay imagery grounded in teaching materials.
- Compact teacher navigation and immediate actions; quiet learner surfaces.
- Real catalog content, functional settings and existing access rules.

Scope: the React web workspace. The separate React Native/Expo application has not been restyled or visually reverified by this web pass; do not apply these web measurements as native tokens.

Source order in `src/workspace/Workspace.tsx` is `packs.css`, `workspace.css`, `theme.css`, `refinement.css`, `dark.css`, then `dark.generated.css`. The theme establishes identity and typography; refinement supplies the current canvas, density, shapes and reduced depth; later dark styles supply night-mode overrides. Component-specific styles and learner preferences still apply.

## Colors

Saddle brown carries the identity and primary actions; espresso frames navigation. Tan marks small edges, focus and selection. Olive belongs to learner rooms. Sage, sand, rose and sky group supporting content without competing with primary actions. Warm paper, muted ink and fine borders make dense teaching information readable.

**The Identity Rule.** Preserve the original logo, brown identity and catalog imagery. The configurable brand color continues to drive the primary brand token; status also requires readable text.

System, light and dark appearance choices are implemented in `themeChoice.tsx`. Night mode uses dark canvas, paper and readable ink overrides recorded in the sidecar; it is screen-only. Learner rooms, printable sheets and presentation previews retain their own daylight palettes. Miniature light/dark theme previews are exempt from automatic dark recoloring in scripts/dark-theme.mjs, so each example remains consistent in either surrounding theme. Do not infer learner appearance from the teacher's selected theme.

## Typography

Self-hosted Readex Pro now carries headings, body copy, controls and learner prompts; web h1–h3 use weight 700. Tajawal remains the fallback. El Messiri remains imported for legacy brand-specific declarations, but no longer defines the workspace heading hierarchy. The base body is 18px with 1.75 line-height. Home headings scale to 40px, ordinary page headings are 42px, editor headings are 32px and administration page headings are 40px. Section headings are generally 28px, while editor/profile sections use 26px. Primary controls are 18px/600 and common form labels and fields use 17px. At the phone breakpoint home headings use 1.9rem, editor headings 28px and lesson-detail headings 30px. Context-specific overrides remain in source.

Use natural Arabic line spacing, zero heading letter spacing and tabular numerals where the workspace already applies them. Email, URL and password fields use LTR entry inside the RTL form. Keep Arabic labels and mixed-direction values legible.

## Layout

Teacher navigation sits on the right, 288px wide on desktop and 224px at widths up to 1100px. Administration navigation is 304px on desktop and 224px at the medium breakpoint. The main teacher container has a 1560px maximum width with 24px right and 34px left padding, reduced to 20px at 1100px and 16px on phones. At 760px and below, navigation becomes an off-canvas menu and content takes the full width.

The home composition uses a 292px-minimum hero, four quick-entry tiles on wide screens, three lesson rows and a Today/review aside. Compact onboarding follows, with a separate student strip below. Page banners share the warm artwork treatment, with surface-specific art and heights: the base is 292px, lessons 238px, IEP 276px, and games/tools 244px. At 1300px tiles become two columns; at 1100px the lesson/aside composition becomes one main column; phone asides stack. Exact visible content depends on viewport height and live data.

Settings are two vertical stacks of real panels until 1100px, then one column. The IEP directory uses a semantic table and an eight-part guide, becoming labeled student cards on phones. Weekly summaries expose their five-session strip, which becomes a vertical list on phones. Learner cards group identity and grade, descriptive information, current goal and access preferences. The presentation start screen previews the selected lesson's actual title and cover beside its functional authoring controls.

Administration uses an RTL CSS grid with the sidebar spanning header and content rows. Its overview has four factual status cards. Appearance pairs editable fields with a live unsaved preview; accounts have three groups and catalog editing has four. Features use two columns; backups use a full-width section, two half-width sections and a final full-width section. These collapse responsively without hiding functional fields.

Editors place the real step navigation in a 290px left rail beside the main form in the RTL workspace, sticky above 1100px. Below that width the rail and form stack; phone steps scroll horizontally. Learner profiles use a 1.65:1 content/preferences grid and a portrait-led heading, stacking below 1100px. Lesson detail uses an illustrated 1.7:1 hero and a 1.65:1 content/aside layout. The detail hero stacks on phones. Library cards use covers associated with each lesson and a horizontal image/content composition. Pack cards pair a 40% illustration column with content and a full-width action row; their grid changes from three to two to one columns. Resource layouts adapt again at 480px. Privacy content uses a two-column grid with 28px padding and 24px/36px gaps, collapsing to one column with 20px padding on phones. Review copy and labels use 17px text with 1.8 body line-height. Worksheet toolbar labels and selectors use 17px text and a 48px minimum selector height. These are web layout rules, not native layout tokens.

## Elevation & Depth

Fine borders and shallow warm shadows define teacher surfaces. The refinement layer removes the former heavy sidebar shadow, most hover lifts and image drop shadows. Its three light-mode shadows are recorded in the sidecar; dark mode supplies its own values. Learner tiles retain clear selected/answer outlines with restrained depth.

Motion is brief and functional. The existing reduced-motion media query removes animations and transitions. Learner calm, contrast and access preferences take precedence over decorative treatments.

## Shapes

Panels use the card radius, fields use the control radius, buttons use the button radius, and hero/banner frames use the hero radius in the frontmatter. Quick-entry tiles are slightly tighter; navigation and status labels are tighter still. Phone hero frames use the tile radius. Inset cards, previews and mobile IEP rows use the inset radius. Grade badges, small status/announcement details and miniature preview strokes have their own documented radii. These local exceptions are not defaults for every panel.

## Components

Primary buttons use a restrained 160-degree brand-to-brand-dark gradient, a solid darker hover state and visible keyboard focus. Secondary buttons use paper with a fine border. Both retain functional disabled states and a 48px minimum height; compact contextual actions have their own overrides. Text fields keep explicit labels, a 46px minimum height and a visible focus treatment.

The sidebar uses a deep espresso felt with cream active items and 20px text-plus-icon navigation (16px at the medium breakpoint); administration uses a pale rose selected item. The long presentation link has a 16px fit override. Its original wordmark is 200px wide in the teacher shell and 214px in administration. Panels group real lessons, learners and settings; status labels communicate factual state. Selection controls retain pressed/current states. Theme choices use a keyboard-operable radio group with light/dark thumbnails. Trial-record table headers on paper sheets use dark ink on a light neutral ground. On phones, game actions and the collapsible communication entry stay in normal flow so they do not cover each other. Student rooms use olive grounds and cream targets, with high-contrast and learning settings taking priority over their default palette.

Clay learning content remains catalog data, replaceable through administration. Earlier illustrations retain their provenance in public/images/content/PROVENANCE.md. The five v2 production assets (classroom hero and four navigation illustrations) remain in use, with their prompts/source paths recorded in artifacts/site-concepts-2026-11-06/production-assets.json. The closer-fidelity pass adds fourteen v3 assets: a lesson banner, four lesson covers, animal deck art, a planning desk and seven learner-tool illustrations. Each WebP has a JSON provenance sidecar. Library covers follow their associated lesson. The original real brand logo remains intact. The default home hero preserves a configured custom hero. Mockup imagery does not authorize fabricated data or simulated controls.

Verification record (2026-11-06, closer-fidelity pass): artifacts/fidelity-comparison-2026-11-06 contains 31 teacher/learner route captures, eight administration section captures, desktop/admin check records and mobile checks. Recorded mobile checks at 390×844 report no overflow or broken images. The comparison index and comparisons.json map all 39 desktop captures to their reference compositions. These are route/layout checks, not proof that every functional flow was manually exercised. Focused manual checks confirmed that the draft filter and lesson search each returned one row, the phone menu opened and closed, and editor step navigation worked. The final reviewer issued SHIP for the six named fixes, with all six resolved; that disposition applies to the reviewed fix scope. Some final CSS refinements followed the initial capture batch; individual captures should be checked against their generation time before being treated as final-state proof.

Final verification after the review, privacy and worksheet refinements passed all 81 tests (zero failures and zero skipped) and a production build in 21.57 seconds. The inspected logs are .impeccable/review/fidelity/tests-final.log and .impeccable/review/fidelity/build-final.log; existing bundle-size/dynamic-import warnings remain. Earlier detailed checks and logs in .impeccable/review/implementation remain historical evidence. The current fidelity pass follows the approved generated compositions more closely, but whole-page pixel fidelity remains unmeasured. Detailed learner-access variants, production mutations, AI generation, a complete accessibility audit and the native application were not comprehensively verified. No production deployment is claimed.

## Do's and Don'ts

- **Do** preserve the original logo, brown identity, Arabic RTL structure and real catalog content.
- **Do** keep status text, visible focus and functional selected states alongside color.
- **Do** preserve learner preferences and platform access rules when refining presentation.
- **Do** inspect the final desktop, phone and dark-mode surfaces, and report verification gaps honestly.
- **Don't** treat unmeasured mockup reproduction as pixel-exact fidelity or fictional profiles as real student evidence.
- **Don't** introduce fake controls or remove existing settings to imitate a mockup.
- **Don't** transfer web values to the separate native app without inspecting its own implementation.
- **Don't** treat successful tests or bundling as complete visual or accessibility verification.
