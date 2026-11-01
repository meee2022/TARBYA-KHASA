---
name: "تربية خاصة — رف المواد"
description: "Arabic RTL teaching platform. Learning materials on a shelf: clay and wood objects, olive felt table, burgundy, brass."
colors:
  wine: "#801b3b"
  wine-dark: "#63152e"
  wine-deep: "#4a0e24"
  wine-night: "#2e0916"
  brass: "#b98a3e"
  brass-light: "#e2c07f"
  olive: "#4c5730"
  ink: "#2c1f22"
  muted: "#6e5f62"
  line: "#e8e0d7"
  canvas: "#f1ece5"
  paper: "#fffdfa"
  cream: "#f7efe0"
  sage: "#e5eadb"
  sand: "#f3e7d3"
  rose: "#f3e2e4"
  sky: "#dfe6e8"
typography:
  display: { fontFamily: "El Messiri", fontWeight: 700 }
  heading: { fontFamily: "El Messiri", fontWeight: 600 }
  body: { fontFamily: "Readex Pro", fontWeight: 400 }
  student-prompt: { fontFamily: "Readex Pro", fontWeight: 600 }
rounded:
  control: "14px"
  card: "22px"
  tile: "24px"
  hero: "28px"
  pill: "999px"
---

# Design System: رف المواد

Source of truth: `src/workspace/theme.css`, applied after `workspace.css` and `packs.css`.

## Idea

The real object of this profession is the tray of learning materials: wooden animals, felt cards, abacus, beads. The interface is that shelf. Teachers work on warm paper surfaces beside a burgundy felt sidebar. Students sit at an olive felt table with a brass and burgundy frame, and answer on thick cream tiles they want to press.

## Colour

Burgundy carries identity and primary action, brass only marks edges and focus, olive is the student ground. Four pale tints (sage, sand, rose, sky) separate sections without new accents. Admin's brand colour still drives `--wine` through `--brand-color`. Status always has a text label too.

## Type

El Messiri for headings: legible Arabic with character. Readex Pro for body and for student prompts, because students need the clearest letterforms. A decorative Kufi was tried and rejected as hard to read. Both fonts are self-hosted so a demo works offline.

## Imagery

All pictures share one soft clay style, generated with Higgsfield (GPT Image 2.5), recorded in `public/images/content/PROVENANCE.md`. They are data in the catalog, replaceable from `/admin`. Children appear only as fictional clay characters, never photos. Scene images keep an empty wall for text; text must never cover a person in the picture.

## Depth and motion

Three tinted shadow levels (`--shadow-1..3`). Student tiles have a physical bottom edge and press down. Motion is short with one ease-out curve: tiles rise on entry, objects lift on hover. `prefers-reduced-motion` and the learner's "بلا حركة" setting remove it.

## Accessibility overrides

Learner settings outrank decoration. High contrast replaces felt and tiles with black on white and removes pictures' tinted grounds. Calm mode removes texture and motion. Target size, hand side, steady tap, dwell and scanning work on every student surface.

## Rules

- No eyebrow labels above headings, no gradient text, no glass, no emoji as icons in chrome. Emoji remain only as a teacher's quick fallback for a pack item.
- UI icons come from lucide at one stroke weight. Objects and symbols use the clay library.
- New content goes in the catalog, never as literals in components.
- Dark mode is not implemented.
