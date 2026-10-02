# KAIDO1 Motion Refinement Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan inline. Steps use checkbox syntax.

**Goal:** Remove WhatsApp and substantially refine the latest KAIDO1 interface and motion.

**Architecture:** Preserve packed child pages and the parent navigation/assistant shell. New form mathematics stays independent of rendering; a scene renderer consumes it. Page details use native DOM/CSS and the existing motion policy.

**Tech Stack:** HTML, CSS, Canvas 2D projected 3D, vanilla JavaScript, Node built-in tests/build.

**Spec:** `docs/design-next.md`

## Global Constraints

- No WhatsApp functionality or number in emitted site.
- Preserve 39 catalogue entries and backend/player contracts.
- Self-contained entries below 2.7 MB, no runtime dependencies.
- Shared motion policy, visibility and offscreen pause; real readiness without minimum delay.

## Review Focus

- Rapid form switching must start at the currently displayed geometry.
- Reduced motion and small devices must retain an attractive static, usable scene.
- Changing artist during loading must not reveal or enter the stale page.
- Empty/changed live catalogues must have truthful counts and working keyboard controls.
- No contact deletion may leave an orphaned handler that prevents page initialization.

### Task 1: Remove the contact service

**Files:** `source/pages/kaido.html`, both `source/shell-*.html`, `motion/experience.css`, `test/contact.test.js`.
**Interfaces:** Existing social anchors replace the two primary contact actions; catalogue builders remain unchanged.

- [x] Add a test decoding both actual packed entries and checking service identifiers, URLs and phone removal.
- [x] Run it against the existing build; expect failure on removed service traces.
- [x] Remove markup, styles, scripts, number and assistant references; update contact copy.
- [x] Build and run `node --test test/contact.test.js`; expect all checks passed.

### Task 2: Sculptural forms and scene

**Files:** create `motion/forms.js`, `test/forms.test.js`; change `motion/scene.js`, pages, build script and stage styles.
**Interfaces:** `KNForms.createMesh(rings,segments)` returns `forms`, seam-safe grid and sizes. `KNForms.createMorph(forms,initial)` exposes `values`, `select(name,{instant})`, `advance(seconds)` and `settled`. No renderer dependency.

- [x] Add tests for finite/bounded geometry, closed seams, steady and rapid-retarget interpolation, static selection and quality budgets; run RED.
- [x] Implement reusable typed arrays and continuous interpolation; run GREEN.
- [x] Render depth-shaded forms, sparse particles and projection with cached rotation, no per-frame layout queries; wire three scene controls.
- [x] Run forms/engine tests and build/inline syntax checks; expect pass.

### Task 3: Entrance, navigation and details

**Files:** create `motion/journey.js`, `motion/details.js`, `motion/refinement.css`; change pages, `motion/page.js`, shell CSS and build script.
**Interfaces:** New modules consume `knCanAnimate`, `KN_MOTION_CHANGE`, existing card/dialog classes. Existing accessibility module owns keyboard/focus behavior. Section navigation writes `aria-current` and actual scroll progress.

- [x] Test section selection and normalized progress with empty, short, bottom and long page cases; run RED.
- [x] Implement pure journey helpers and RAF-coalesced section navigation; run GREEN.
- [x] Add letter-mask entrances, light curtains, numbered dividers, tab markers, card numbering/real counts, featured card and contact layouts.
- [x] Confirm reduced-motion fallback, tab/dialog behavior and all actual inline scripts with the existing suite.

### Task 4: Verify and deliver

**Files:** documentation, test results and final ZIP.

- [x] Run full tests/build/frontend checks; compare backend/player files against prior ZIP.
- [x] Obtain one fresh whole-change code review; resolve material findings with regression tests.
- [ ] Check archive CRC, contents and deterministic build; replace the identified deliverable with guarded version 3.
- [ ] Return the verified KAIDO1.zip download and concise Arabic description, accurately stating any visual QA limitation.
