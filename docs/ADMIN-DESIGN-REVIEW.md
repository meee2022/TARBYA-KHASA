# Administration implementation record — 2026-10-31

Disposition: **recapture**. This is a source comparison, not visual acceptance. No current desktop or mobile screenshots were available: Windows was previously locked, and the subsequent computer-use connection timed out. Browser layout, Arabic font rendering, keyboard operation, screen-reader announcements and touch behavior remain unverified.

## Identity comparison

Compared `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json` and `.impeccable/admin-surface.md` with `src/workspace/AdminConsole.tsx`, `src/workspace/admin.css`, `src/workspace/site.tsx` and `docs/ADMIN.md`, using Impeccable's document reference.

The administration surface extends the existing Arabic teaching workspace: Tajawal, burgundy actions, warm neutral backgrounds, restrained sage feedback, white bordered sections and existing branded/primary/secondary controls. It reuses `--wine`, shared button styles, 8px field corners, 10px navigation corners, 22px field spacing and 24px grid gaps. Site settings expose the primary color through the existing brand-color variable. The default identity remains the incumbent one.

Administration-specific literals are local adaptations, not exact copies of every global token: its canvas is #f8f7f3, sections have 12px corners, fields use a #c8bfc1 border, and keyboard focus uses a 3px #aa7890 outline. These local choices do not establish a replacement global palette or component system. `DESIGN.md` and `.impeccable/design.json` are preserved without edits by this documentation pass; no new global system decision warrants regeneration. No new raster images were introduced by the administration surface.

## Implemented patterns

- **Settings workbench:** six labeled navigation sections, one active section, explicit separation between shared server settings and browser-local educational records. No invented analytics. Appearance fields include a brand preview before saving.
- **Forms and switches:** persistent visible field labels, 46px minimum input height, explanatory text, native checkbox inputs with switch semantics, 48px minimum navigation controls and disabled fieldsets during requests. Switch position and color both change. Settings remain a draft until the user saves; a sticky save/discard bar appears only when changes exist.
- **Status and recovery:** textual service/account states, success messages with status semantics and a check icon, errors with alert semantics, a preview of imported workspace counts, and confirmations explaining replacement/deletion effects. Restore points are described separately from centrally saved settings.
- **Arabic and numbers:** the shell declares RTL; logical borders, margins and text alignment support reading order. Login identifiers, passwords, color codes and numeric input isolate LTR content; usernames use bidi isolation. Dates use `ar-QA-u-nu-latn`, and content normalization retains Arabic prose with 0–9 digits. The review finding about administrator display names is addressed by `publicUser` applying `latinDigits` in `server/admin.mjs`; this is confirmed in source, not a visual test. Identifiers and passwords retain their original values.

## Responsive intent

The desktop shell caps content at 1440px with a 240px navigation column. At 1000px the navigation narrows to 200px, form columns collapse, and the audit layout reduces its columns. At 680px navigation becomes a horizontally scrollable row, content becomes a single column, actions wrap, section padding reduces and the save bar adapts to the available width. These are implemented CSS behaviors; overflow, long Arabic names, focus visibility and save-bar reachability still require desktop and phone capture after the final build.

## Verification evidence

The parent implementation reported 21 passing tests, passing native TypeScript checking and passing lint. The final production web rebuild passed after the administration page was split into a lazy-loaded chunk. The 6 administration/digit tests were rerun and passed after the display-name fix. HTTP probes confirmed 403 responses for direct and /@fs access to the private administration directory, and the first-run session endpoint remained available without creating an account. This documentation pass did not rerun those checks and does not substitute them for visual or assistive-technology verification. The finish-review verdict remains **recapture**, with no approved composition or visual acceptance claimed.
