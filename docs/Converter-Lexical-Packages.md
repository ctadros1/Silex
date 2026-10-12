# Legacy lexical packages

This convention remains supported for existing formal-expression images. The current text translator uses [Meaning Graphs](Meaning-Graphs.md). The grammar and model-tree compiler described below are compatibility components, not the forward text-translation pipeline., version 1

This convention belongs to the converter's declared semantic model. It uses the unchanged Silex v1 syntax and physical framing. A bare v1 decoder recovers the same finite tree; it is not expected to infer the convention without this document.

A package is `PAIR(TEXT(metadata), content)`. Metadata is exact UTF-8 JSON with `schema` equal to `silex-lexicon/1` and an `entries` array. Each entry has:

- `id`: a unique identifier matching `urn:silex:lex:[a-z0-9-]{1,64}`;
- `roles`: an ordered list of zero to 32 nonempty role labels, at most 40 characters each;
- `definition`: a specific English sense definition, between 3 and 1,000 characters.

The converter permits up to 128 entries per package as a browser resource limit, rather than a limit on the language. Every entry must be used. Every SYMBOL in model-created content must be the first child of CALL and refer to a supplied entry. CALL's argument count must equal its entry's role count. These lexical functions denote propositions; unknown nouns are unary predicates and become entity descriptions through ALL, SOME, or THE. The declared model grounds the predicate by the supplied sense and ordered roles. A zero-argument entry is a proposition, not an automatic entity constructor.

The content is interpreted using that local model and the ordinary utterance/evaluation contexts. The converter presents it as the package's sentence interpretation. This assertion convention is additional shared knowledge: the core language otherwise presents PAIR as data. The package neither evaluates English as code nor turns a prose definition into an algorithmically proven denotation. Readers need the English grounding prior and context.

All UTF-8 metadata bytes, byte-count fields, CALL counts, and full identifiers are counted in the image. There are no new sentence-specific glyphs, hidden sidecars, hashes substituting for unknown meanings, or server vocabulary lookups. Images remain portable between converter instances without a per-image database.

Examples of consequences:

- `happy(entity: ME)` means the chosen declared sense of happiness applies to the speaker.
- A declared `astronaut(entity)` property may be used in `THE(CALL(SYMBOL(astronaut), V0))`; uniqueness is still a presupposition.
- Two distinct senses require distinct declarations. A shared spelling does not resolve polysemy by itself.
- An incorrect model-generated sense is faithfully encoded but remains an incorrect translation. The interface exposes the definition and literal reading for review.

The converter generates direct profile 1 images, which permits exact glyph/subtree highlighting. Uploaded profile 2 images decompress locally; their individual heads cannot be assigned separate compressed rectangles, so the interface highlights a reconstructed direct frame and states that distinction.

## Expressiveness and interpretation

The 64 heads are grammatical primitives, not an exhaustive inventory of words. Predicate signatures and sense definitions are open; they can represent new objects, actions, events, relationships, technical terms, and proposition-level operators. Named translation variables compile to the core language's de Bruijn distances, including REF for deeper scope. Repeated clauses compose through quantifiers, conjunction, implication, attitude operators, functions, and paid predicates. Resource ceilings in this web implementation can be raised or a document split across frames; they are not linguistic vocabulary boundaries.

The legacy compiler uses a deterministic English grammar for familiar constructions. For new words it can ask the on-device model only for contextual senses and inflections, then compile the structure itself. Other structures use a nested meaning tree with ordinary entity descriptions and explicit clause relationships. The compiler generates the CALLs and bindings and validates the result before encoding. Unused proposed declarations are excluded; only predicates actually constructed by the compiler are transmitted. The actual used content is checked for omitted English content words, negation, universal quantification, future tense, and questions. This is an omission guard, not a semantic equivalence proof: incorrect roles, word senses, attachment or quantifier scope may still pass. Ambiguity choices are shown for review.

No automatic TEXT fallback is counted as successful semantic translation. Exact wording is an explicit, separate user action. Literal payloads inside a semantic expression remain appropriate for names, numbers, and actual quoted speech.

Natural language does not uniquely determine one formal meaning, even with valid words. Context, polysemy, figurative language, generic statements, and disputed philosophical concepts require interpretation or additional grounding. Expressive completeness of the formal language cannot establish correctness or completeness of a learned translator. A failed automatic interpretation is a converter limitation and must be reported honestly; it does not mean the concept cannot be expressed in Silex.

## Meaning-tree compiler

The legacy meaning-tree interface accepts a nested array such as `["see", ["every", "child"], ["a", "bird"]]`. The compiler lifts noun phrase scope from left to right, constructs `(ALL (CHILD V0) (SOME (BIRD V0) (SEE V1 V0)))`, and derives the visual glyphs from that tree. Explicit named scopes can select a different order, for example `["some", "$bird", ["bird", "$bird"], ["all", "$child", ["child", "$child"], ["see", "$child", "$bird"]]]`. These are translation intermediates, not another wire format.

New definitions have a source-word name, kind (noun, adjective, relation), ordered roles, and a specific contextual sense. The compiler constructs the corresponding namespaced SYMBOL/CALL expressions automatically. It may retain vocabulary definitions supplied during an earlier grammar attempt so a later meaning-tree attempt does not lose noun meanings. Missing object/role signatures in vocabulary generation get a targeted repair request; they do not authorize inventing an omitted participant.
