# Silex v1: glyphs, grammar, semantics, and expressibility

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

In an executed stress probe, an exact TEXT literal containing 1,000 repeated ASCII a characters required 35,200 square pixels in the direct profile and 1,368 square pixels in the automatically selected compressed profile, at u = 2 pixels. The complete compressed PNG decoded back to all 1,000 exact characters. This 25.73-fold transport reduction exploits repetition in that particular literal; it is not a general semantic-density estimate.

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

| ID | Head | Children | Meaning or ordered roles |
|---|---|---|---|
| 0 | TRUE | 0 | constant true proposition |
| 1 | FALSE | 0 | constant false proposition |
| 2 | NOT | 1 | proposition -> proposition |
| 3 | AND | 2 | proposition, proposition |
| 4 | OR | 2 | proposition, proposition |
| 5 | IF | 2 | antecedent, consequent; material implication |
| 6 | ALL | 2 | bound restriction, bound body |
| 7 | SOME | 2 | bound restriction, bound body |
| 8 | LAM | 1 | one bound body |
| 9 | APP | 2 | function, argument |
| 10 | LET | 2 | definition, body with bound definition |
| 11 | EQ | 2 | two values of the same declared type |
| 12 | AT | 2 | context, proposition |
| 13 | SAY | 2 | agent, proposition content or exact text |
| 14 | KNOW | 2 | agent, proposition; factive |
| 15 | BELIEVE | 2 | agent, proposition |
| 16 | CAUSE | 2 | cause event, effect event |
| 17 | BEFORE | 2 | earlier event, later event |
| 18 | PAIR | 2 | first value, second value |
| 19 | NIL | 0 | empty sequence |
| 20 | NAT | 0 | unsigned integer payload |
| 21 | TEXT | 0 | UTF-8 literal payload |
| 22 | REF | 0 | binding-distance payload |
| 23 | SYMBOL | 0 | UTF-8 semantic-identifier payload |
| 24 | CALL | variable | argument count, function, counted arguments |
| 25 | THE | 1 | bound unique-entity restriction |
| 26 | QUOTE | 1 | closed expression as exact syntax |
| 27 | V0 | 0 | innermost bound value |
| 28 | V1 | 0 | next outer bound value |
| 29 | V2 | 0 | third bound value |
| 30 | ME | 0 | utterance speaker |
| 31 | YOU | 0 | utterance addressee |
| 32 | NOW | 0 | utterance context c0 |
| 33 | PAST | 1 | proposition at some earlier time |
| 34 | FUTURE | 1 | proposition at some later time |
| 35 | POSSIBLE | 1 | proposition in some accessible world |
| 36 | NECESSARY | 1 | proposition in all accessible worlds |
| 37 | WANT | 2 | agent, desired proposition |
| 38 | OUGHT | 1 | proposition in all normative ideal worlds |
| 39 | ASK | 1 | proposition or closed answer function |
| 40 | CHILD | 1 | entity is a child |
| 41 | BIRD | 1 | entity is a bird |
| 42 | RED | 1 | entity is red |
| 43 | SEE | 2 | viewer, viewed entity |
| 44 | GIVE | 3 | giver, given entity, recipient |
| 45 | LOVE | 2 | lover, loved entity |
| 46 | PERSON | 1 | entity is a person |
| 47 | BOOK | 1 | entity is a book |
| 48 | READ | 2 | reader, read entity |
| 49 | BUILD | 2 | builder, built entity |
| 50 | SCIENTIST | 1 | entity is a scientist |
| 51 | CITY | 1 | entity is a city |
| 52 | LIVE | 2 | resident, inhabited place |
| 53 | HELP | 2 | helper, helped entity |
| 54 | REMEMBER | 2 | rememberer, remembered entity or content |
| 55 | DIE | 1 | entity dies in the evaluation context |
| 56 | MACHINE | 1 | entity is a machine |
| 57 | SOLVE | 2 | solver, solved problem |
| 58 | PROBLEM | 1 | entity is a problem |
| 59 | PROVE | 2 | prover, proposition proved |
| 60 | FAIL | 1 | entity/project fails in the evaluation context |
| 61 | RUN | 1 | entity runs in the evaluation context |
| 62 | WATER | 0 | water substance/type value |
| 63 | DRINK | 2 | drinker, consumed substance/entity |


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

