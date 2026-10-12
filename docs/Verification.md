# Converter verification

Evidence recorded on 2026-10-12. Unit tests, native model execution, visual area measurements, browser inference, and deployed files are separate checks. None proves universal interpretation accuracy.

## Current encoding and compatibility checks

`npm test` passes 56 tests. New semantic-compilation checks establish:

- “I see you” becomes exactly `(SEE ME YOU)`, three original semantic glyphs and a 120-square-module complete frame. It has no source TEXT or JSON payload.
- Definite descriptions, quantifiers, time, negation, and question scope use original heads and named-variable compilation.
- Repeated red-bird statements remain two ordered items while sharing one definition through LET, using 14 meaning glyphs.
- Every graph node/edge and supported grammatical feature is consumed by native compilation or retained by the compact extension. Unknown concepts, extra roles, aspect, and cycles are not discarded to force small output.
- Open labels, exact large numbers, quote/number distinctions, Unicode, local identities, reentrancy, and typed shared literal values survive codec round-trips.
- Three hundred statement occurrences retain their order and count in a bounded-depth document.
- Identical statements reuse model work only within the active request; they are not deduplicated as utterances or persisted as a source-text database.
- The published codebook matches the decoder’s concept and relation indexes.

All 13 original Python specimens still have identical words, packets, geometry, and decoding. Other compatibility tests retain all 64 glyphs, large integers, UTF-8, scope/type/arity rejection, compressed frames, single-bit packet corruption, and 1,000 deterministic random syntax trees. Legacy graph-plus-source packages and lexical packages remain readable. Legacy grammar fixture tests are not measurements of the current translator’s accuracy.

## Actual-model and compression checks

The frozen quantized BART-base model and learned UDPipe annotator processed 243 inputs and 252 statements. There were zero compilation or codec-round-trip failures. Thirty statements used native heads completely; the remainder used compact semantic declarations. Escaped graphs retained all model concepts, relation targets and supported feature flags. The run included 67 externally sourced texts from a fixed sample of UD English EWT, alongside authored regression inputs. Overlap with model training sources was not audited.

The old graph-and-source format used 84,570 meaning glyphs and 609,170 square modules of complete direct-frame area. The current format used 24,852 meaning glyphs and 208,076 square modules, a **65.8% area reduction** at the same module width. Border, margin, length, checksum, and padding are included. Details and individual examples are in [Semantic Compression](Semantic-Compression.md).

This compares interpreted meaning with the old representation that also retained exact wording. It is not lossless compression of identical text data, a measurement of semantic entropy, or a matched recognition-error comparison with English/Mandarin typography. The original scoped-specimen research measurements remain unchanged.

Model error is distinct from encoding error. Inspection has found wrong biological classifications and an incorrect analysis of the idiom “take flight.” French realization of the compact flight graph also chose an indefinite article despite its encoded definite flag; the literal reading still exposes the retained distinction. Three model outputs needed completed closing parentheses, with those repairs recorded. Native compilation does not repair semantic errors or infer omitted content. The compact extension retains the model’s representation, which may itself be incomplete or wrong.

## Browser, exports, and deployment

Browser tests use the actual WASM model, not the native ONNX timing as a substitute. The native English example visibly renders SEE, ME and YOU with a three-glyph caption, native literal reading, and correct field highlights. The compiled source exposes no source-word witness in normal exports. Progress and Stop remain available during local interpretation.

The browser rendered the repeated red-bird document with 14 glyphs and decoded its bitmap into both statements. The flying-bird example rendered a 98-glyph compact graph, retaining the bird as the flight actor, the direction, definiteness, and ongoing aspect. Selecting its flight concept highlighted its reference and paid declaration. Public PNG and SVG downloads completed; the independent Python decoder recovered `(SEE ME YOU)` from the downloaded PNG. Clipboard pasting recovered the same expression through the browser's pixel decoder. Native meaning readback produced English and French without source text.

Desktop and 375-pixel mobile views were inspected, with no horizontal page overflow in the mobile view. The deployed application, worker, manifest, and codebook were compared with local build hashes. The upload URL rejects POST with 405. Browser evidence and source/model artifact checks are separate from the area benchmark. Source wording can only be recovered from explicit exact-text mode or historical images that stored it.

The server serves static files and configures no inference or image-upload runtime bindings. Model asset hashes are pinned. The original and current grammars, semantic codebook, and model reproduction instructions are public.
