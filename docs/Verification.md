# Converter verification

Evidence recorded on 2026-10-12. Unit tests, provider deployment, and rendered browser behavior are separate checks. This document does not claim universal automatic interpretation accuracy.

## Executed local checks

`npm test` passes 21 tests, including:

- Exact wire words, packets, frame geometry and decoding for all 13 original Python specimens.
- All 64 glyph patterns, large integers, Unicode, scope/arity/type rejection, and compressed frames.
- All single-bit corruptions of the original specimen packets and 1,000 deterministic random syntax trees.
- 60 authored examples across 12 languages and 35 everyday English semantic translations.
- An independent finite-model test that distinguishes quantifier scope.
- Independent perception countermodels: changing the walker, observer, street/path, ongoing aspect, or observation of the event makes the reported sentence false.
- Rejection of dropped walking/path words even when unused declarations contain those words.
- Open vocabulary beyond 12 declarations, named scope beyond V2, contextual vocabulary extensions, relative clauses, belief, and modality.
- Cardinality, modal negation, meaning-tree compilation, passive voice, concession, and infinitive control.

`npm run build` produces a static page, browser scripts and a worker for on-device inference. `wrangler deploy --dry-run` reports no runtime bindings.

## Browser evidence

The interface was tested in Chrome. Model files were fetched from their pinned upstream revisions.

| Input or action | Observed result |
|---|---|
| “I see you walking down the street.” | Compiles without AI. The encoded event is ongoing walking by YOU, along the unique street; ME sees YOU and that event. |
| “The engineer repairs the telescope.” | On-device vocabulary definitions plus deterministic scope compilation. Engineer is actor, telescope is object. |
| “Every engineer who owns a telescope believes that a distant planet may support life.” | Nested relative restriction, existential telescope, engineer-bound belief, and possibility are preserved. Word-sense selection still needs review; a structurally valid translation can use an overly broad definition. |
| “Although the engine was repaired, the pilot refused to fly.” | Compiles after correcting the fly signature: an unnamed repair actor, both past clauses, concession, refusal, and unasserted flight content are preserved. |
| Copy PNG, select Silex image, paste with Cmd+V | The actual clipboard PNG is decoded from pixels in the browser and recovers “I see the red bird.” |
| “I am happy.” → image → English | Recovers “I am happy.” through local decoding and on-device realization. |
| Same happy image → Spanish | Produces “Estoy experimentando placer o satisfacción.” The output preserves the supplied sense, though another phrasing could be more idiomatic. |
| Download generated paid-lexicon PNG | The original Python reference decoder independently recovers its exact lexical package and content. |

Raster decoding was tested through actual clipboard PNG imports. The file-picker workflow was not automated in this run.

The converter uses Qwen3.5 4B for word-sense assistance and meaning-tree interpretation. Grammar compilation and omission checks do not prove source/translation equivalence. Exact text is a separate mode.

## Visual comparison

The initial [design concept](images/design-concept.png) is compared against the final rendered page at its 1435 × 1096 reference viewport. Five comparison points:

1. White page, dark heading, muted introductory sentence, restrained blue action color.
2. Two language selectors, centered direction control, and a bordered two-panel translator.
3. Left sentence editor with example, character count, privacy hint, and translation action; right image with export controls.
4. Below-panel literal reading, inspectable glyphs, semantic tree, highlighted assembly, and exact expression.
5. Typography, spacing, border treatment, and a single-column mobile layout.

The actual message is an intact two-dimensional Silex frame rather than the concept's decorative glyph strip. It includes required borders, margin, length and checksum. Paid lexical definitions make unfamiliar concepts substantially larger. Blue highlights are explanatory overlays and are excluded from PNG/SVG exports.

A 375 × 812 mobile viewport is checked for horizontal overflow and legible stacked controls. Temporary viewport overrides are reset after testing. Screenshots are captured using the browser's screenshot API, not an image generator.

## Release evidence

The live converter serves the expected HTML, application assets and security headers. Its static server rejects an empty POST with HTTP 405. The browser performs image decoding and inference locally. The public repository contains the language specification, research report and records, reference codec, converter code, tests, and a build/test workflow. It does not contain model weights, private keys, or visitor data.
