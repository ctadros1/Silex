# SILEX

## A visual semantic language, version 1

Experimental design and executed prototype. 11 October 2026.

Silex represents a meaning as a scoped expression, gives frequent expression heads one small glyph, and packs the glyphs into a binary visual lattice. Its novelty here is the particular language, codebook, binding rules, and writing protocol. Binary matrices, prefix coding, modal logic, and lambda calculus are established ideas. This is an original design proposal, not a claim that every ingredient or the name is unprecedented.

The deliverables include an exhaustive 64-glyph atlas, 13 worked translations, native and enlarged written specimens, a reference encoder and decoder, an area benchmark, and executed verification. The strongest result is qualified: a very small decoder-oriented display is possible, but an advantage over ordinary typography depends greatly on the display assumptions and shared dictionary. Silex has not been established as a global optimum or tested with human readers.

## 1. What the objective can mean

Visual density has two independent limits: how succinctly we describe the intended meaning, and how reliably we distinguish marks in an area. Removing a word does not necessarily save visual information. Moving a whole sentence into a dictionary does not remove its description cost.

Let X be a chosen formal meaning, R the reader's shared knowledge, A the allocated visual area, and epsilon the allowed decoding error. The design objective is high J(X | R)/A, with conditional surprisal J(X | R) = -log2 P(X | R). An empirical distribution over meanings would be needed to estimate J. No such distribution is claimed in this experiment.

For lossless coding of a source, expected code length is constrained by its conditional entropy. With a binary visual channel having at most one independently distinguishable bit per area u squared, ideal average area is bounded below by H(X | R) times u squared, before framing and reliability costs. This is a model of a channel, not a theorem about how much meaning a person perceives. [Shannon's original paper](https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf) supplies the source-coding foundation; the semantic objects and visual channel below are assumptions of this experiment.

The full accounting is:

```
L_total = L(decoder, grammar, lexicon | prior knowledge)
        + sum L(message | decoder, grammar, lexicon, declared context)
A_total = A_bootstrap + sum A_message
```

This follows the description-length discipline of paying for both model and data. [Rissanen's original paper](https://research.ibm.com/publications/modeling-by-shortest-data-description) and [Grunwald's tutorial](https://arxiv.org/abs/math/0406077) motivate that accounting. The measured file sizes below are engineering upper bounds, not minimum descriptions of human understanding.

There can be no universally best code without fixing a source, visual channel, and prior. A distribution concentrated on one sentence favors a different code from a distribution of new names, proofs, or poetry. For any proposed finite code, another can shorten a favored message while lengthening others. At finite area and resolution there are only finitely many distinguishable images, so an unbounded set of ideas necessarily requires unbounded area.

To compare paired renderings of the same selected claim, its information numerator is held fixed. The directly measured quantity is therefore an area ratio. Six times the number of Silex body glyphs is the serialized description length in bits; it is NOT an estimate of semantic entropy.

## 2. Designs explored before choosing the prototype

These are analytic design comparisons. Only the selected lattice prototype has been implemented and measured; the alternatives have not undergone an empirical optimization contest.

| Architecture | What carries meaning | Why it could be dense | Where its cost appears |
|---|---|---|---|
| Whole-idea ideographs | One learned picture per message | One mark for a frequent complete idea | An unbounded dictionary; arbitrary new ideas need new entries. Rejected as the forbidden sentence-character shortcut. |
| Pictorial feature bundles | Object silhouettes with property overlays | Simultaneous properties occupy one figure | Distinguishing many overlaps forces larger features; negation, scope, identity, and abstract relations still need syntax. |
| Port-connected semantic graphs | Nodes are entities; edge ports give argument roles | Repeated entities occur once; topology replaces some words | Wire crossings, port labels, routing gaps, and long edges consume area. A star or complete graph is a hostile layout. |
| Nested spatial regions | Quantifier and modality frames contain their scopes | Containment directly determines scope; parentheses disappear | Deep nesting needs several boundary widths; its rectangular packing can leave large voids. |
| Algebraic feature glyphs | Strokes specify predicate, tense, role, and polarity | Several frequent distinctions share one glyph | A 2^k glyph inventory still carries only k independent binary choices; overlays do not defeat resolution limits. |
| Multiscale/fractal writing | Position and detail at increasingly fine scales | Many levels fit inside one geometric boundary | At fixed minimum feature size, detail runs out. Magnification spends display area or reading time. |
| Pure compressed text in a matrix | A compressor encodes an existing sentence | Excellent carrier utilization with an established language | This changes the carrier, not the language; a decoder and model must be shared. It is an essential control. |
| Scoped expressions in a lattice | A compositional meaning tree plus local bindings | Fixed arity removes separators; variables share entities and definitions; binary cells use the channel directly | Formalization choices, learned head meanings, literal payloads, framing, and error control. Selected. |

I abandoned free-form semantic wiring as the default physical layout. Its attraction is genuine for some diagrams, but topology is information that must also be transmitted. In Silex, shared references express the graph; a regular lattice carries it. Two dimensions optimize packing rather than introduce a spatial metaphor for truth.

There is no claim that square black-and-white modules are best for every observer or medium. Color, orientation, gray levels, and time could enlarge channel capacity, but only if their distinguishable states and associated error rates are specified. This prototype uses static binary contrast and a minimum module width u.

## 3. The chosen system

Silex has three layers:

1. A semantic expression with explicit scope, ordered arguments, and local binders.
2. A prefix code using a closed set of 64 expression heads and self-delimiting payloads. This set is a small built-in vocabulary, not a limit on expressibility.
3. A two-dimensional lattice of six-site glyphs, with timing borders, a length header, and a checksum.

There is no spoken form, spelling, capitalization, or phonetic alphabet. The English head names used in the specification are explanatory transliterations. None of their letters appear in the actual Silex panels.

The design is optimized for a trained or assisted decoder. It does not preserve English word order, grammatical gender, articles that add no selected semantic distinction, or natural-language redundancy automatically. It DOES require paying for distinctions that matter: definiteness, scope, referents, tense when asserted, uncertainty, source attribution, and exact quoted text.

## 4. Foundational glyphs and physical writing

Each glyph has two columns and three rows of square binary sites:

```
32 16
 8  4
 2  1
```

Black means 1 and white means 0. Sum the black-site weights to identify the head. There are exactly 64 patterns, from a completely white tile to a completely black tile. This is a compositional alphabet whose construction rule is much smaller than 64 unrelated drawings.

Examples: AND has value 3, so its two bottom sites are black. ALL has value 6, so the middle-right and bottom-left sites are black. SEE has value 43 = 32 + 8 + 2 + 1. ME is 30 and YOU is 31. The fixed high bit often separates the structural half from the common-content half, but head meaning still comes from the registry; resemblance does not license guessing.

![The complete Silex glyph atlas](glyph-atlas.png)

In the dense edition glyphs touch. Their black regions may fuse. The frame establishes the grid, so glyph boundaries remain fixed even where there is no visible white gap. The blank TRUE glyph occupies a real, counted tile; invisible blank tiles are not free storage. In the reading edition, glyphs can be separated and labeled. That enlargement is an aid to inspection and is not the density benchmark.

At module width u, a glyph occupies 2u by 3u, or 6u squared. Its maximum payload is six bits. That saturates the assumed binary-cell capacity INSIDE the payload, but syntax restricts which glyph sequences are meaningful, and the whole frame incurs overhead. No above-capacity compression is claimed.

### Framing, layout, and robustness

For c glyph columns and r glyph rows, payload dimensions are 2c by 3r modules. Left and bottom borders are solid. Top and right borders alternate. A one-module quiet zone surrounds the border. The resulting total rectangle is:

```
W = 2c + 4
H = 3r + 4
A = W * H * u^2
```

Read glyphs left to right within each glyph row, then top to bottom. Each glyph is read top-left, top-right, middle-left, middle-right, bottom-left, bottom-right. Physical line breaks do not change grammar or scope.

The direct frame content is:

```
profile=1 ; U(body_word_count) ; body ; crc_high ; crc_low ; zero padding
```

The checksum is 12 bits, split into two six-bit words. Parameters are polynomial 0x80F, initialization 0xFFF, most significant bit first, no final XOR. It covers the profile tag, encoded count fields, and transmitted payload. There are four overhead glyphs when the body count fits one integer word; larger counts pay for additional count words. Layout padding is included in area and must be zero. The renderer searches all possible column counts and selects minimum rectangle area, then least padding, then an aspect ratio closest to square.

An optional compressed profile retains the identical semantic expression and uses this frame content:

```
profile=2 ; U(compressed_byte_count) ; U(decoded_body_word_count)
          ; six-bit-packed zlib bytes ; crc_high ; crc_low ; zero padding
```

First pack the body's six-bit words into bytes with zero padding, then encode a zlib stream using the [RFC 1950 format](https://www.rfc-editor.org/rfc/rfc1950). The reference encoder uses zlib level 9. Validate its stream termination, exact decompressed length, both layers of zero padding, checksum, and final expression syntax. The decoder selects the algorithm from the explicit profile tag. No compression codebook is inferred from an English caption. The default encoder computes both profiles' complete framed areas and chooses the smaller frame, then the smaller packet, and finally the direct profile. The 13 comparison examples all select the direct profile, so their reported measurements are unchanged. The compressed profile is useful for longer repeated data or syntax; it makes individual body glyph meanings inaccessible until decompression. The zlib implementation is part of the specified shared runtime prior and would need an additional charge if the reader lacks it.

@COMPRESSION_STUDY@

The border distinguishes upright orientation. The reference raster decoder requires an intact, upright, integer-scaled panel. It checks every module and the frame, then verifies the checksum, rather than sampling only convenient center pixels. It infers scale from the intact quiet zone; it needs no per-message semantic sidecar. Cropping, blur, perspective, reflections, and arbitrary camera images require additional detection software that has not been built here.

CRC is error detection, not correction. All single-bit header, body, and checksum corruptions of a tested real packet were rejected. Longer random corruptions can occasionally collide; 12 bits give only an approximately 1/4096 random-collision scale under appropriate error assumptions. There is no protection against a deliberate valid substitution. A production channel would need an empirically chosen error-correcting code and finder design. Its overhead would have to be counted for every competing representation.

## 5. Complete compositional syntax

The registry below is normative. A head with fixed arity k is followed by exactly k expressions. Neither parentheses nor spaces are transmitted. NAT, TEXT, REF, SYMBOL, and CALL have the additional payload rules below. The notation in parentheses is solely the readable reference notation.

```
Expression := FixedHead Expression^arity
            | NAT U
            | REF U
            | TEXT U(byte_count) SixBitWords(byte_count)
            | SYMBOL U(byte_count) SixBitWords(byte_count)
            | CALL U(argument_count) Expression Expression^argument_count
```

CALL's first expression denotes the function or relation. Zero-argument CALL is allowed and contains only that function expression. Semantic type validity is a separate requirement from this finite syntactic parse.

### Unsigned integers and literal payloads

U is a little-endian base-32 integer code. Each six-bit word contains five data bits; bit 32 says another integer word follows. The final word has bit 32 clear. Zero is one zero word. A final zero data group after an earlier group is forbidden, eliminating longer alternative representations of the same integer.

For example, 37 is transmitted as [37, 1]: low data digit 5 with continuation set, followed by high digit 1. NAT 37 consequently has three glyphs: the NAT head and those two payload words. A number needs a finite but unbounded number of words.

TEXT and SYMBOL carry a UTF-8 byte count, then the bytes packed most significant bit first into six-bit words. The final word is zero-padded at the low end. Padding is validated. Invalid UTF-8 is rejected. Unicode normalization is not silently applied: composed and decomposed spellings can remain different exact literals. An empty TEXT is permitted; an empty SYMBOL identifier is rejected.

TEXT is uninterpreted exact text. It is not automatically treated as a meaning definition or executed program. SYMBOL is a declared semantic identifier whose denotation and signature must be supplied by the shared model or a paid definition. A short hash or familiar-looking identifier cannot magically teach the reader its denotation.

### Local variables and binding

V0 means the innermost bound variable, V1 the next outer variable, and V2 the next. Larger distances use REF U(distance). The head shortcuts V0, V1, and V2 are canonical; REF 0, REF 1, and REF 2 are rejected on the wire.

ALL and SOME introduce one binder that scopes over BOTH their restriction and body. LAM introduces a binder over its body. THE introduces a binder over its restriction. LET introduces a binder only over its second argument, leaving the definition in the outer environment. Unbound references are errors. QUOTE requires its quoted expression to be closed; it resets the binding environment for validation.

There is no implicit pronoun resolution. A writer chooses a reference, quantifier, or declared contextual entity. If natural-language ambiguity is intended, it must be expressed as a disjunction, a set of readings, or an explicit underspecified object with paid parameters.

### Head registry

@REGISTRY@

All fixed content predicates are evaluated relative to a model and context. Their role order is stable. GIVE(giver, thing, recipient) does not change order in passive descriptions. A passive construction simply moves the relevant quantifier or changes what is asserted about the participants.

### Why the parse is unique

At an expression boundary, the first six-bit glyph determines the one head. After the declared carrier profile has been decoded, its registry entry fixes how many children follow or identifies one self-delimiting payload. Continuation integers terminate uniquely; literal byte counts fix exactly how many words follow; CALL fixes its child count. Applying this argument recursively yields one finite expression tree or a rejection. Binder distances then determine one syntactic referent. The packet count and validated zero padding fix where that expression ends.

This establishes unique decoding relative to the version-1 registry. It does not prove that two authors share an ontology, that all assertions are true, or that two different formulas can never be logically equivalent. General equivalence testing and executing an arbitrary program are not required for decoding.

## 6. Compositional meaning

Use a declared model M, evaluation context c, utterance context c0, and binding environment g. A context includes a world, time, and relevant domain restriction. The utterance context fixes speaker, addressee, and grounding. Deictic ME and YOU remain those utterance participants under modality and quotation; NOW denotes c0. A contextual domain restriction is shared knowledge and must be declared or transmitted if the reader lacks it.

The model supplies entities, events, contexts, typed values, relations, and accessibility relations. Sort and ordinary content predicates are total relations over the declared domain: values outside their appropriate extension give false, rather than making an entity quantifier fail on a nonmember. The ordered role labels constrain eligible tuples. Operators such as APP and AT still require a function and a context respectively; misusing those value types is a semantic error. A quantified body is required only for values satisfying its restriction. Ordinary predicates such as SEE return propositions. A proposition-taking operator receives a proposition's context-dependent content, not just its current true/false bit. Otherwise every true belief complement would collapse to the same content. The fixed attitude operators use the truth-conditional possible-world convention below; explicitly quoted syntax permits finer distinctions when required.

| Constructor | Meaning rule |
|---|---|
| TRUE, FALSE | Constant true and false propositions. |
| NOT P | Classical negation of P. |
| AND P Q; OR P Q | Ordered syntactic conjunction or inclusive disjunction; the truth rules are classical. |
| IF P Q | Material implication: NOT P OR Q. Counterfactuals and causation require different declared operators. |
| ALL R B | For every x in the current domain, if R under environment [x]+g holds, B under that same environment holds. No existence is implied. |
| SOME R B | For some x, both R and B under [x]+g hold. |
| LAM E | A function of x whose body is E under [x]+g. |
| APP F X | Apply F to X. CALL permits a declared n-argument function/relation. |
| LET E B | Evaluate the definition E in g; bind its resulting value while interpreting B. It is local, hygienic sharing. |
| EQ X Y | Identity/equality in the declared type, not approximate resemblance. |
| THE R | The unique x in the contextual domain satisfying R; otherwise a presupposition failure, not a guessed referent. |
| AT C P | Evaluate P at the explicit context denoted by C, retaining utterance grounding and outer bound entities. |
| PAST P; FUTURE P | P holds at some earlier/later time in the same world relative to c. They are existential temporal operators, not automatic English aspect. |
| POSSIBLE P; NECESSARY P | P holds at some/all accessible worlds, retaining the time and outer environment unless the declared accessibility relation specifies otherwise. |
| BELIEVE A P | P holds throughout A's belief alternatives. This is truth-conditional belief, not a guarantee of computational logical omniscience in real people. |
| KNOW A P | P holds at c and throughout A's epistemic alternatives; the explicit current-world condition makes this operator factive. |
| WANT A P | P holds throughout A's designated preferred alternatives; empty preference sets are a model presupposition failure. |
| OUGHT P | P holds throughout the designated normative ideal alternatives; those alternatives must be nonempty. |
| SAY A X | The model records A expressing proposition content X or exact text X. Truth of that content is not asserted. |
| ASK X | A question act. For a proposition, the alternatives are X and NOT X; for a closed function, its requested satisfying values define an open question. |
| CAUSE E F | A declared causal relation between events E and F. It is a primitive causal commitment, not derived from temporal order. |
| BEFORE E F | End time of event E precedes start time of event F. Event terms must be explicitly denoted. |
| PAIR X Y; NIL | Ordered pairing and the empty sequence; nested pairs construct arbitrary finite structures. |
| NAT U; TEXT ... | Exact natural-number and UTF-8 string values. |
| SYMBOL ... | A grounded model identifier. Unrecognized identifiers are unresolved, not guessed. |
| QUOTE E | Exact closed expression syntax as data, without asserting or reducing E. |
| V0/V1/V2; REF U | The value at the stated distance in g. |
| Content heads 40-63 | The stable roles stated in the registry, with model-supplied groundings. WATER denotes the water substance/type object used by the model. |

Correctly typed propositions are asserted when they are the root of an utterance. A root ASK performs its question act. Other root values are presented/described. Invalid semantic argument types do not receive alternative meanings: they are type errors. Decoding is total on valid finite syntax, whereas semantic evaluation can be partial, presupposition-dependent, or undecidable.

The current codec checks arity, binding, literal encoding, canonical representation, and framing. It is not a complete interpreter of the model semantics above. An independent finite-model evaluator has been run for the quantified-predicate subset; the remaining meaning rules are a specification. This distinction matters when calling the prototype viable: representation and decoding are implemented; full reasoning about its contents is not.

## 7. Expressibility beyond the built-in dictionary

A finite dictionary does not bound the number of expressions. Quantifiers nest without a language-level depth limit. Functions may take functions, relations, or structured values as arguments. Lists, numbers, exact text, quotation, and declared symbols make the space of finite descriptions unbounded.

### New concepts defined inside a message

Define a fresh property compositionally rather than assign it a secret code:

```
(LET
  (LAM (AND (PERSON V0) (SEE V0 V0)))
  (ALL (APP V1 V0) (REMEMBER V0 V0)))
```

The local function means a person who sees themself. ALL introduces a new entity variable, so the stored function is now V1 and the entity is V0. This definition and all uses occupy counted glyphs. The arbitrary explanatory name S need not be transmitted unless its spelling is itself part of the intended message.

For an irreducible new primitive, declare its signature and grounding, or point to a previously shared declaration using SYMBOL. A long identifier is encoded at full length. An unknown identifier alone does not convey a biological concept, cultural allusion, or subjective experience. Natural languages face the same grounding issue; Silex makes the boundary explicit.

### Numbers, mathematics, algorithms, and recursion

NAT represents any finite natural number. PAIR can represent signed integers, rational numerator/denominator pairs, tuples, and precision-tagged measurements, with their construction convention explicitly declared. There is no built-in uncharged 'prime', 'tensor', or 'counterfactual' glyph in v1. Such concepts use local definitions or declared signatures with counted identifiers.

The LAM/APP fragment can express the untyped lambda calculus, providing the finite variable/abstraction/application constructions used in [Church's original work](https://ics.uci.edu/~lopes/teaching/inf212W12/readings/church.pdf). For example, Church zero is `(LAM (LAM V0))`, and Church successor is:

```
(LAM (LAM (LAM (APP V1 (APP (APP V2 V1) V0)))))
```

A fixed-point combinator for recursive definitions is:

```
(LAM (APP
  (LAM (APP V1 (APP V0 V0)))
  (LAM (APP V1 (APP V0 V0)))))
```

Recursive programs can therefore be described without an infinite primitive list. Their reductions may not terminate. Universal computation establishes a constructive description mechanism, not an ability to decide the truth of every expressed idea. Higher-order quantified descriptions also need the intended type/domain conventions. No finite writing system can finitely specify every arbitrary real number or an otherwise indescribable private experience.

### Relative clauses, roles, mood, evidence, and nuance

A relative clause is a restriction expression inside a binder, as in AND(CHILD V0, SOME(BOOK V0, READ V1 V0)). Roles are fixed by the predicate signature instead of English position or case endings. A wh-question can use ASK(LAM(...)) with the answer variable scoped by that LAM.

Time intervals and event aspect are expressible using explicit event identifiers, temporal relations, and declared event predicates. The compact PAST/FUTURE operators do not silently imply perfective, progressive, completed, or repeated action. Evidential source and confidence likewise require explicit relations. Probabilities are numerical values attached using a declared probabilistic relation, not a mysterious certainty stroke.

Metaphor, irony, quotation, social register, and deliberate ambiguity are expressible as content plus declared interpretation/attitude relations, or exact quoted language when appropriate. Formalizing them may be expensive and imperfect. The small benchmark preserves selected truth-conditional readings, not every pragmatic effect of the original English. When wording matters, TEXT preserves it and loses the hoped-for semantic compression.

### Repetition and sharing

LET provides a lexical version of a directed acyclic graph. A repeated definition can be stored once and referenced. Without binder-index changes elsewhere, replacing k copies of an L-glyph subtree by one definition and references of cost r gives saving `(k-1)L - kr - 1`. Actual encoder comparison must include all shifted indices and application heads. A one-off definition can INCREASE size, as the fresh-property example demonstrates.

No global shortest-program search is claimed. Optimal compression of arbitrary meanings would require difficult or uncomputable equivalence judgments. A future compiler can safely compare finitely many explicitly supplied equivalent forms and choose the smaller verified encoding.

## 8. Worked translations with rendered writing

The English sentences and Mandarin glosses below are authored for this experiment. The Mandarin has not been independently checked by a native-language reviewer. Each note fixes the intended reading, so the translation is not being mistaken for an automatic, ambiguity-free mapping from English.

![Four complete, enlarged Silex utterances](written-specimens.png)

@EXAMPLES@

The central scope test is examples 04 and 05. Both contain nine body glyphs and 54 description bits, but they express different claims. In a model where child c1 sees only bird b1 and child c2 sees only bird b2, example 04 is true and example 05 is false. That countermodel was executed by an independent semantic evaluator.

Example 09 has 28 body glyphs and 168 body bits. Its complete frame, including count, version, checksum, finder, quiet zone, and layout padding, occupies 20 by 16 modules. At 2 pixels per module that is 40 by 32 pixels, or 1,280 square pixels. The enlarged illustration above is not the image size used for that calculation.

## 9. Visual efficiency: methods and measured results

This is a 13-example demonstration, not a random corpus, trained compression model, or held-out evaluation. The fixed dictionary was chosen while designing the examples. That favors the system and prevents population-level claims. The stress subset explicitly includes exact literal text, an out-of-dictionary term, a paid local definition, and a cardinality claim.

Area is the allocated rectangular bounding box, including white space between lines, framing, required margins, and padding. Black ink area alone would reward faint writing and invisible symbols, so it is not the density denominator.

### Protocol A: equal nominal em height

English uses Arial Regular; Mandarin uses Arial Unicode. Both use a 32-pixel em and 40-pixel line advance. Silex glyph height is 32 pixels, so its module width is 32/3 pixels. It retains the complete physical frame. This is an equal-em geometry comparison, not a guarantee of equal perceived size or recognition effort.

Natural text is greedily wrapped over every integer width from 32 to 512 pixels. English words are not hyphenated; Mandarin may break at any character. The minimum allocated area is selected, with compact aspect ratio breaking ties. A four-pixel quiet margin surrounds natural text. Silex selects the smallest valid frame rectangle. The simplified Chinese line-breaking rule can leave punctuation in typographically undesirable positions; it is specified so its effect is reproducible.

### Protocol B: fine binary display versus conventional typography

Keep the same English and Mandarin renderings, but set Silex modules to 2 pixels: its glyphs become only 4 by 6 pixels. Their primitive squares and narrow black/white transitions are explicit, counted features. This is an actual raster-area measurement, but NOT a matched perceptual-error experiment. Natural fonts were not separately optimized down to their own smallest reliably decodable sizes. The comparison measures the consequences of using a fine binary channel beside conventional typography, and is not evidence that a human language has thirty times less semantic capacity.

![One selected claim at the benchmark's native sizes](comparison-native.png)

@RESULTS@

A ratio above 1 means the natural-language rendering used more area than Silex. Ratios of sums are used, not averages of per-sentence ratios. The full-sample equal-em result is close to English parity and favors Mandarin. The core subset alone is more favorable to Silex; counting the stress cases changes that conclusion. The large fine-display ratios are primarily carrier-scale effects.

### Protocol C: all three through the same compressor and carrier

To reduce that carrier confound, serialize the 13 Silex bodies as a counted batch, pack their six-bit words, and compress with zlib level 9. The English and Mandarin strings are joined by newline, UTF-8 encoded, and compressed with the same zlib settings. All compressed outputs go through the same binary carrier and outer packet overhead, with 2-pixel modules. This control is outside the native expression grammar; zlib and the batch convention are additionally shared decoders.

@CONTROLS@

The large typography gap shrinks substantially. The residual benefit here can reflect the compact known head dictionary, removed surface wording, UTF-8 representation, and the chosen examples. It is not a language-wide victory. Text strings retain their exact wording while Silex retains selected formal meanings, which is another asymmetry. A serious follow-up would compare all systems under a shared, preregistered meaning inventory and optimized channel codes, including natural-language dictionaries and model costs.

### Sensitivity to readable module size

Silex area scales as u squared. Doubling required module width multiplies its area by four. For the full sample, the equal-area crossover against the fixed natural renderings is about 11.16 pixels per module for English and 9.89 for Mandarin. Glyph heights there are about 33.48 and 29.68 pixels. These crossovers are geometric consequences of the measured areas, not recommended or experimentally established readability thresholds.

An equal-error objective would be `expected semantic distinctions recovered / allocated area`, evaluated at a fixed decoding error ceiling. That experiment requires measured confusion matrices for Silex, English, and Mandarin under the same optics, blur, reader/decoder class, and exposure conditions. This project has not performed it. A bare area comparison cannot establish the best viable font size.

## 10. Decoder and dictionary cost

The shared alphabet rule is only the six-site weight arrangement, grid order, and framing convention. The registry has 64 learned expression heads with finite role signatures. Their semantic groundings can be much more costly than their numeric IDs. Common-context references also carry a dependency on previously shared state; if it is unavailable, the grounding declaration must be transmitted.

The measured bootstrap consists of the UTF-8 reference codec, registry, and a standalone extraction of this specification's glyph, grammar, semantics, and expressibility sections. It excludes the fonts, illustration pixels, interpreter runtime, research narrative, and a reader's pre-existing English, mathematics, zlib runtime, and world knowledge. The compressed byte count is a reproducible upper bound for transmitting these files to an English-reading programmer. It is not the total learning burden or the minimum possible formal specification.

@BOOTSTRAP@

For a novel code taught to a reader who already knows English, this is an additional charge. Comparing known English and Mandarin while pretending Silex's learned dictionary is free would overstate its benefit. If all systems are being taught from scratch, their dictionaries, grammars, fonts/recognizers, and grounding resources must be charged consistently. This experiment does not measure that much larger cognitive problem.

For M messages, use `A_bootstrap/M + mean(A_message)` to amortize the shared cost. A break-even count only makes sense after specifying which bootstrap, channel, prior, corpus, and competing model costs are included. The provided numerical estimate uses the fine-display carrier and an explicitly stated engineering bootstrap; it must not be read as a population-level learning claim.

## 11. Successes, failures, and tradeoffs

Silex succeeds at exact scope and identity, recursive composition, compact frequent predicates, paid local sharing, and a mechanically precise visual alphabet. It can express new descriptions without adding a character for every sentence. Its renderings and encoder are actual artifacts, and the native digital panels round-trip to their expressions.

It loses natural redundancy, immediate recognition, and most reading comfort. A single syntactic error can affect a large subtree; the checksum detects corruption but provides no correction. Sequential prefix reading can require a deep stack. Dense black regions are vulnerable to optical blur and thresholding. Manual handwriting is poorly suited to the prototype. Geometry alone has not established a psychologically viable alphabet.

It also loses much of the spontaneous pragmatics of ordinary language unless those details are explicitly encoded. Selecting an English reading is human interpretive work. Content primitives such as CHILD or KNOW are grounded conventions, not deductions from black squares. Logically equivalent formulas need not have identical codes. Possible-world attitudes do not capture every distinction among logically equivalent beliefs; QUOTE and declared finer-grained attitude relations can preserve such distinctions at a cost.

The built-in lexicon is demonstration-biased and finite. Irreducible new words, exact literary quotations, explicit event structure, and specialized technical ideas can expand markedly. A large learned ontology might improve message size but must be counted as a model. An unbounded dictionary, unmeasured microprint, or an unknown external referent would each hide the very cost the problem asks us to acknowledge.

The strongest honest conclusion is that this is a viable exact DIGITAL representation with a complete extensible syntax, and a candidate visual language requiring perceptual validation. It is not a proven optimal human writing system. Under a static, independently readable binary-cell model, its payload carrier reaches one bit per module, so further gains mainly come from better meaning compression, shared knowledge, reduced overhead, or a richer validated channel.

## 12. Verification and reproduction

Executed checks include all 64 visual patterns, 109 unsigned-integer round trips, nine Unicode literals, 1,000 randomized well-scoped syntax trees, 32 native PNG round trips over four integer scales, 78 detected single-bit packet corruptions, damaged-border rejection, and the quantifier countermodel. Random trees establish syntax reversibility; they are not necessarily semantically well typed.

An additional 100 randomized compressed-expression round trips, 12 compressed PNG round trips, and four malformed compressed-stream checks passed. Every one of the 13 final native specimen PNGs was also decoded and compared with its source expression. PDF pages and the final image specimens were visually inspected. The output directory includes raw results, exact example definitions, verification records, and the reference codec so the arithmetic and encoding can be independently checked.

The codec's core uses the Python standard library. PNG functions require Pillow. For example:

```
python3 silex_codec.py '(SEE ME YOU)' --png message.png --svg message.svg
python3 silex_codec.py --decode-png message.png
```

The complete package also provides the benchmark and verification scripts. Reproducing the typography measurements requires the recorded macOS Arial and Arial Unicode font files, Pillow, and the same line-layout conventions; another platform can run the language codec but will not necessarily reproduce the typography totals with substituted fonts. No internet connection, sentence lookup database, or external semantic service is used by the prototype.

## 13. The next experiment that would decide more

Freeze a useful dictionary on a training meaning corpus, then evaluate on unseen meanings and genuine out-of-domain vocabulary. Charge every transmitted definition. Specify the reader class: trained human, assisted human, or optical machine. Obtain confusion/error data while sweeping size, contrast, blur, and spacing for all three systems. Compare native scripts and identically optimized compressed carriers under equal error constraints. Include full semantic parity judgments by independent English and Mandarin readers.

Only after that could a measured density optimization choose the smallest viable glyph size, alphabet inventory, dictionary, and redundancy. The current experiment supplies a concrete candidate and a way to falsify exaggerated claims, rather than a theorem that language design has reached its endpoint.
