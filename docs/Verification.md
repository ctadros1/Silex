# Converter verification

Evidence recorded on 2026-10-12. Source tests, native model execution, browser WASM behavior, and deployed files are separate checks. None establishes universal semantic interpretation accuracy.

## Unit and compatibility checks

`npm test` passes 41 tests. The new graph checks cover repeated statements with local references, open concepts/roles, reentrancy, separate literal tags, exact large numbers, original non-English atoms, Unicode/escaped-string dictionary highlight positions, malformed references, learned Unicode sentence ranges, and SHA-256 asset integrity.

Compatibility checks retain all 13 original Python specimens with identical words, packets, and geometry; all 64 glyphs; exact Unicode and large integers; scope/type/arity rejection; compressed frames; single-bit corruption; and 1,000 deterministic random syntax trees. The legacy English/example compiler and its countermodels still pass, but it is no longer the forward text translator. Its authored sentence fixtures are not evidence for the trained parser’s accuracy.

## Actual frozen-model regression

`node scripts/check-meaning-model.mjs` executed the quantized BART-base meaning parser and learned UDPipe sentence tokenizer on the native CPU. It processed 243 inputs and 252 statements in 24.1 seconds on the development machine, with zero graph-compilation or codec-round-trip failures. This timing excludes model loading and is not a browser performance claim.

Inputs consisted of 16 additional document/technical examples, 160 varied existing sentence fixtures, and 67 texts selected by a fixed sampling rule from the externally sourced UD English EWT test partition. Categories include repeated statements, punctuation/abbreviations, technical vocabulary, names, observed events, paths, questions, negation, quantification, transfers, relative clauses, nested beliefs, modality, passive voice, concession, and quoted speech. Overlap with upstream model training sources was not audited.

Every decoded source witness matched its input character for character. Three outputs omitted closing graph parentheses; completed-node repairs were recorded. Assertions check that the reported repeated sentence has two graphs, the bird is the flight’s actor, and “you” is the walking event’s actor. These are automatic interpretation tests, rather than hand-supplied graphs.

A syntax-success count is not a semantic-accuracy estimate. Manual inspection found limitations: the biological sentence called a mitochondrion an enzyme, some frame roles differed from the author’s unquantized output, and an external name example reused a name node incorrectly. Source atoms retain the correct wording but do not correct the graph. No claim that all valid sentences have one correctly inferred formal meaning is made.

## Browser and deployment checks

The actual browser WASM parser, rather than the native ONNX runtime, is tested separately. The recorded browser cases include the repeated bird statements and the reported flight/walking inputs; their graphs preserved the intended count and actors. The interface exposes download bytes, statement stage, output activity, elapsed time, and cancellation without sending sentence text to an inference server.

Additional final browser/export/deployment evidence is recorded after the final build is published. The original area comparisons remain limited to the original formal specimens; the graph-and-source packages have not been compared at matched recognition error against English or Mandarin.
