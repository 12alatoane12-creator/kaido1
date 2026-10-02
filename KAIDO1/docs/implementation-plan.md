# KAIDO interrupted-upgrade recovery — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task.

**Goal:** Finish the requested KAIDO/NOVA motion upgrade and produce a downloadable, checked archive.

**Architecture:** Templates and optimized original media compile into the two existing HTML entry points. Shared motion modules provide navigation readiness, scheduling, presentation and accessibility without changing server interfaces.

**Tech Stack:** HTML, CSS, JavaScript, Canvas 2D, Node built-ins, WebP.

**Spec:** docs/design-upgrade.md

## Global constraints

- Preserve backend/API/configuration bytes and all 39 initial video entries.
- No external runtime animation or 3D dependency.
- Respect OS reduced motion and a persistent user motion choice.
- Cap scene DPR at 1.6 and metadata concurrency at three.
- Keep both entry points below 2.7 MB and retain embedded artwork.

## Review focus

- Old navigation readiness and queued callbacks must not hide the new loader.
- Hidden/reduced-motion scenes must not keep a rendering loop alive.
- A stalled content request must return embedded content.
- Search must still receive archive metadata while requests are throttled.
- Mobile menus, video controls and dialogs must retain keyboard operation.

## Task 1 — Runtime contracts

**Files:** motion/engine.js, motion/loader.js, test/engine.test.js, test/loader.test.js.
**Interfaces:** KNMotion.createFrameLoop, quality, project, createQueue; KNLoader.create with begin/ready/fail callbacks guarded by page and navigation ID.

- [x] Write behavioural tests for cadence, hidden scenes, reduced motion, projection, queue limits, stale readiness, duplicate readiness, queued entrance and slow/error state.
- [x] Run the tests and observe missing-feature failures.
- [x] Implement the two modules; run their tests and the original backend suite.

## Task 2 — Media and editable pages

**Files:** source/pages, source/shell-local.html, source/shell-hosted.html, source/media.json, source/media, scripts/media.js, scripts/sync-motion.js.
**Interfaces:** source asset tokens compile to embedded WebP; build emits both existing entry paths.

- [x] Add an emitted-entry size/catalogue regression test and observe the original size failure.
- [x] Optimize original assets, retain IDs in a manifest, and recompose the hero while retaining existing content and handlers.
- [x] Compile source deterministically and confirm size/catalogue regression passes.

## Task 3 — Presentation and interaction

**Files:** motion/experience.css, motion/policy.js, motion/content.js, motion/scene.js, motion/page.js, motion/accessibility.js, motion/shell.css, motion/shell.js.
**Interfaces:** child KN_PAGE_READY/KN_PAGE_ENTER and KN_MOTION_POLICY messages carry navigation IDs; policy event KN_MOTION_CHANGE controls all animation.

- [x] Add the stalled-content integration regression and observe the original failure.
- [x] Inject modules through the original bridge; wire guarded loading, six-second timeout, scene, reveal, hover, image lifecycle, motion toggle, tabs and dialogs.
- [x] Run the complete suite and parse scripts from the actual generated child documents.

## Task 4 — Review and delivery

**Files:** README_AR.md, TEST_RESULTS.txt, deliverable KAIDO1.zip.

- [x] Review the complete implementation with fresh context and fix important findings.
- [x] Verify build, tests, original backend bytes, contacts, catalogue and deterministic output.
- [x] Package sources and outputs; check ZIP CRC and equality to source files.
- [x] Save and present the actual downloadable file.
