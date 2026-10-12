# Current scoped-converter verification

Recorded 2026-10-12. Codec validity, compiler coverage, learned-model accuracy and deployed behavior are separate claims.

## Automated checks

- 71 tests pass, including the 13 original Python-compatible specimens, 1,000 random scoped trees, corruption rejection, lexical registry integrity, relative-clause argument injection, path composition, questions, shared participant identity and conditional tense scope.
- Local lexical declarations round-trip with one shared sense across active/passive role masks. Conflicting/unused definitions and malformed readable masks are rejected.
- A fresh native ONNX CPU execution of the actual trained model processed 42 varied inputs through the production scoped compiler. All 42 compiled and decoded without errors. These include new verbs/nouns, perception, motion, relative clauses, passive voice, negation, aspect, conditionals, quantifiers, questions, speech, quantities and repetitions.
- The model test and inspectable expressions are in [scoped-model-results.json](scoped-model-results.json). Runtime code never reads this test corpus.

Those 42 inputs reduced summed complete direct-frame area by **61.13%** against the preceding native-plus-graph-record compiler, at the same module pitch. The measurement includes profile headers, checksum, margin, border and padding, and counts each resulting panel once. It does not charge the 18.4 MB shared decoder book to each panel. That book is a substantial amortized cost. The comparison does not establish an advantage over English or Mandarin at matched recognition error.

| Input | Previous body cells | Current body cells | Previous panel modules | Current panel modules |
|---|---:|---:|---:|---:|
| I see the red bird flying across the sky. | 119 | 32 | 992 | 380 |
| I see the red bird flying away. | 98 | 25 | 840 | 320 |
| I see you walking down the street. | 111 | 26 | 930 | 320 |
| I see the red bird. I see the red bird. | 14 | 14 | 208 | 208 |

## Actual browser checks

The browser's real WASM parser completed an 18-statement batch. The initial result exposed two semantic issues despite valid syntax: an inappropriate slang sense for “cat” and missing grammatical distinctions. Lemma-specific sense ordering, morphology alignment and scope corrections then yielded the animal sense, perfect-plus-ongoing swimming, past-tense questions, and future repair inside its condition. Occupational noun restrictions now attach their articles to the participant.

A browser run of “The programmer refactored the algorithm” also completed the new-concept path. The model parser initially supplied the broader “refashion” predicate; bounded source grounding retained its argument relationships and requested a dictionary definition of refactoring. The local language model defined restructuring without changing external behavior. The final expression has two definite participants and a past-tense local predicate. Its **28 body cells** exclude the paid declaration; its complete **42 × 61 module** panel includes that declaration. New senses can therefore enlarge a short message.

The downloaded PNG was decoded independently from pixels by `reference/silex_logic_codec.py`, recovering the same expression. Clipboard copying followed by an actual paste into image mode decoded the same local sense and regenerated English. Selecting the new sense highlighted its compound body head and paid header declaration. The browser does not receive a source-sentence sidecar when decoding.

The final regression pass also verifies past-tense copular predicates: “She was happy” and “She was an engineer.” Both retain PAST, and occupational membership applies directly to the referent without a redundant domain relation.

## Accuracy limits

A valid expression is not proof of a faithful translation. AMR, source alignment, noun sense selection, grammatical annotation and natural-language realization remain fallible. The current coverage audit checks all interpreted concepts and relationships, rather than all possible readings of the source. The English readback may be awkward; the structural literal reading exposes the actual encoded constraints. Cross-sentence coreference and subtle attachment/scope are unresolved risks.

The formal grammar admits arbitrary finite extensions and descriptions. The browser imposes input, depth, pixel and memory limits. A difficult sentence can still fail interpretation; it is reported rather than silently stored as a whole-sentence literal or graph package. Exact wording is a separately selected mode. No universal “every sentence is correct” claim is made.

## Release checks

Local test output and downloaded-pixel checks precede publication. GitHub Actions executes the current 42-input model check and the build. Deployment and canonical-page checks are verified separately from local tests; a passing build alone is not evidence of rendered behavior.
