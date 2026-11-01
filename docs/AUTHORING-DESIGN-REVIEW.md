# Authoring extension design review

Reviewed 2026-10-31 using Impeccable's documenter reference. This is a source review of an extension to the existing teacher workspace. `DESIGN.md` remains authoritative; it and `.impeccable/design.json` were not changed. No new visual identity or durable design-system expansion is implied.

## Evidence and continuity

- Reviewed `src/workspace/PresentationStudio.tsx`, `AiAuthor.tsx`, `presentations.css`, `packages/domain/presentations.ts`, `packages/presentation/export.ts`, and `apps/mobile/src/app/presentations.tsx`; compared against `DESIGN.md`, `src/workspace/workspace.css`, and native `components/ui.tsx`. Functional scope and service limits are recorded in `docs/AUTHORING.md`.
- The web extension inherits Tajawal, the burgundy primary action, white bordered panels, shared fields and the existing Arabic workspace. Authoring separates selection, editing, preview and explicit review before export. AI proposals remain drafts until the teacher applies them; status, errors and selected states have textual or semantic cues.
- Native reuses `Screen`, `Card`, `Txt`, `Field`, `Choice` and `Button`, preserving the platform's actual palette, spacing, rounded cards and minimum control heights. It is a native screen rather than a web layout embedded in the app.
- Web editing uses a slide rail, preview/form and settings column; settings move below the preview at 1250px, then the editor stacks and the rail scrolls horizontally at 760px. These are local authoring layouts, not replacements for the workspace grid.
- Slide themes are separate output choices: calm green, platform burgundy and black/white. Web previews set direction per deck; PPTX sets language, RTL text and RTL option ordering. Export uses editable text/shapes and Arial rather than the UI's Tajawal, with teacher answers in notes. This intentional output difference is already disclosed in `docs/AUTHORING.md`.

## Differences and follow-up checks

- The stylesheet introduces several literal green shades and local heading sizes (including 21–24px), plus a 43px introductory sample heading. These are consistent in general character with the incumbent sage treatment but are not canonical tokens. The reported detector completed with exit 0 and palette/type advisories; it is not visual acceptance. Keep these local until repeated usage justifies deliberate token consolidation.
- An authoring focus rule declares blue `#2358ad`, while the workspace specifies `#a5647a`. The shared element selectors have greater specificity for ordinary controls, so computed-style inspection is needed before describing a visible change. Prefer one deliberate focus treatment in a future cleanup.

## Findings resolved in source

Targeted rereading after the bounded correction verified:

- Web slide-tool minimum dimensions now match the shared 44px action target.
- Web cover slides have explicit large-text overrides: heading 5.8cqw and body 4cqw, superseding their ordinary cover sizes.
- Native preview title/body now set right/left alignment from the deck language. Choices set RTL/LTR writing direction explicitly and change from 20 to 24 units with large text enabled.

These corrections resolve the corresponding source findings. Actual touch operation, mixed-language text, text fit and larger-text appearance still need rendered verification; no device or PowerPoint pass is implied.

These are source-based observations, not claims of visible defects proven by a current screenshot. Any implementation fixes made after this review require a corresponding recheck.

## Verification limits

No current rendered desktop, phone, or native-device capture was available for this review. The latest computer-use capture showed the Windows lock screen. The parent workflow reported successful web build, native type checks, automated tests and Android export before the final style corrections; web, TypeScript and lint verification after those corrections was underway at this update. Those checks were not independently rerun by this documenter and do not establish visual, assistive-technology, or PowerPoint acceptance.

Final visual disposition: **recapture**. Inspect desktop and narrow-screen authoring, keyboard focus and presenter exit, Arabic/English content, larger text, and representative long question/image slides. Open the generated PPTX in PowerPoint and inspect it separately from the browser preview. Native sharing, system-back handling, physical-device fonts and assistive access still require device verification. Live AI generation remains unverified without the configured provider service.
