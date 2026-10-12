# Scoped compilation and lexical profile 3

The converter interprets natural language, compiles that interpretation into a scoped expression, then encodes the expression. AMR graph nodes and edges are intermediate inputs. Current normal images do not contain graph-record calls, source wording or serialized JSON. The older graph formats remain readable.

## Translation procedure

The trained BART AMR parser generates concepts and semantic relationships for each sentence. UDPipe supplies learned sentence boundaries, morphology and dependency annotations. Source text is discarded from the export. The compiler:

- Resolves participants and their noun properties. Definite descriptions use `THE`; indefinites use `SOME`; universals use `ALL`. `LET` retains a definite referent across uses without repeating its restriction.
- Attaches properties and inverse relative clauses to the same bound participant. An inverse `ARG0-of` injects that participant into role 0 of the subordinate predicate, rather than changing its object.
- Composes predicates with their participants or nested propositional contents. Event content supplied to an entity-taking perception predicate uses explicit `EVENT` denotation.
- Places motion and path properties together. A path’s directional modifier uses the moving participant and the path as arguments.
- Applies negation, tense, aspect, modal, conditional and question operators. Temporal operators on an action remain inside its outer condition. Wh-questions bind an answer variable; polarity questions use `ASK`.
- Shares participants between coordinated clauses when their interpreted identity is shared. Every statement occurrence remains in the ordered document; identical closed statements may share a definition through `LET`.

Named variables exist only during compilation. The compiler calculates de Bruijn distances: `V0` is the nearest binder, `V1` the next, `V2` the next; `REF` encodes larger distances. No model needs to calculate these distances.

When exactly one unfamiliar source verb and one unmatched interpreted predicate remain, the compiler aligns that predicate with the source verb while retaining its interpreted roles. The local language model then grounds the new atomic sense. This bounded lexical repair is reported for review and does not guarantee arbitrary alignment.

Compilation rejects unbound references, invalid signatures, unsupported constructs, unresolved lexical concepts, and unconsumed interpreted nodes or relationships. It never substitutes a whole-sentence text literal after failure. Exact text is an explicit separate user action.

Nominal source words attached to a person’s inverse role can use the corresponding WordNet noun sense, so an engineer is described by an occupational property rather than asserting a current engineering action. Article annotations attach to that person.

The annotator can make mistakes. The adapter includes general repairs for a doubled-final-consonant lemma, irregular inflected past forms mislabelled as infinitives, and determiner attachments to a verbal concept when a following nominal participant is aligned. These are morphology and attachment rules, not authored sentence matches. Repairs are not a complete English parser. The vocabulary chooses the first lemma-specific WordNet sense of the appropriate part of speech when AMR supplies no noun sense; this can still be wrong in context.

## Examples

```text
I see you.
(SEE ME YOU)

I see the red bird.
(SEE ME (THE (AND (BIRD V0) (RED V0))))

I see the red bird flying across the sky.
(SEE ME
  (@EVENT
    (LET (THE (AND (BIRD V0) (RED V0)))
      (@ONGOING
        (AND (@pb:fly-01/2 V0)
          (LET (THE (@sky.n.01 V0)) (@ACROSS V1 V0)))))))
```

The flight example’s `/2` is the role mask with `ARG1` present. PropBank links this role to agent, self-mover and theme alternatives as well as its original passenger/cargo label. The decoder displays both the original role description and linked semantic labels. The parser can choose a different valid role on a different input; the compiler preserves its chosen role instead of silently treating every second argument as an object.

The displayed notation uses readable lexical keys. The image contains numeric sense indexes. The exact nesting and body cost of a model-produced expression are recorded in verification, rather than inferred from this formatted example.

## Complete compositional extension grammar

All original core heads, arities, binding rules, numbers, exact strings, functions and application remain available as specified in [the original grammar](Silex-Specification.md). Profile 3 adds:

```text
expression := core-expression
            | lexical-head expression{arity}
lexical-head := SYMBOL-escape nonzero-index [verb-arity | frame-role-mask]
```

The ordered shared registry consists of `Logic-Vocabulary.json.operators`, followed by its `entries`. The published file is part of the decoder specification. Index `i` is transmitted as `i+1`; zero is reserved for a literal `SYMBOL` escape. Registry order and vocabulary version are immutable once published. A modified registry requires a new vocabulary version.

- Compositional operator entries contain ordered argument types, result type and a definition. All are fixed arity. They include aspect, spatial and temporal relations, contextual pronouns, count and plurality, names, event denotation, causal/temporal clause links, regions and semantic attributes.
- WordNet noun and adjective senses have type `entity → prop`; adverb senses have type `prop → prop`. Verb complements are derived from published WordNet frames. The browser grammar permits their specified argument signatures and transmits the chosen arity. Ordinary source verbs use their distinct PropBank frame when available, rather than equating WordNet and PropBank sense numbers.
- PropBank entries have result type `prop`. A six-bit mask selects roles `ARG0` through `ARG5`; arguments follow increasing role number. All present roles retain their published definitions. These predicates describe an occurrence/state with the supplied role constraints. Omitted roles remain unspecified and can be absent; they do not assert the existence of every optional role listed in the frame.
- An atomic concept absent from the shared book needs a local declaration. The local model supplies a contextual definition and an ordered signature. The compiler validates them before use. Only the new concept is declared, never the entire sentence. If the model cannot define it reliably or the device lacks the required GPU, the converter reports the limitation.

The lexical extension supports arbitrary finite new concepts through explicit definitions and the original higher-order grammar. It is not a finite sentence vocabulary. Automatic interpretation remains a separate, fallible step.

`EVENT(prop)` denotes the event selected in the evaluation context and described by that proposition. Context selection is required for deixis and underspecified event identity. `REGION(function)` denotes the contextually selected aggregate region/trajectory satisfying its predicate. These are explicit contextual semantic functions. Complete interpretation requires that context, just as `ME`, `YOU` and discourse pronouns do.

Named semantic attribute operators `R_role` relate their two arguments according to the declared AMR role in the evaluation context. They are predicates within scopes, not graph records with node IDs. Their registry definitions are shared and inspectable. Attributes not in the shared registry require an explicit extension instead of an unknown code.

## Wire representation

Each physical body cell is a six-bit word with the original two-column, three-row layout. The prefix notation has no separators in the image. Fixed arity, explicit variable scope, integer lengths and declared signatures make parsing deterministic.

In profile 3, the original `SYMBOL` word (`23`) is an escape:

1. Read a canonical base-32 variable-length unsigned integer.
2. Zero means an original UTF-8 symbol payload follows.
3. A nonzero value selects shared index `value−1`, or a local entry appended after the shared book.
4. For a WordNet verb, read its arity as a canonical unsigned integer. For a PropBank frame, read one six-bit role mask. Other lexical entries have fixed arity.
5. Recursively read the prescribed arguments.

A lexical head can occupy several cells. The UI shows those cells together as a compound meaning symbol; it does not hide them when reporting body cells or panel area.

The complete frame is:

```text
3 · 1 · uint(local-count) · declarations · uint(body-cell-count) · body · CRC12
```

`3` identifies the profile and `1` the vocabulary version. Each declaration is:

```text
counted-UTF8(key) · part-code · counted-UTF8(definition) · [signature]
```

Part codes in order are `n,v,a,r,x,p`. A local `p` frame stores one six-bit mask identifying its declared roles. Their meanings are supplied by its general sense definition; its body uses a six-bit mask for the roles expressed in that occurrence. This retains one definition across active/passive uses with different expressed roles. An `x` signature is one result-type code, an argument count, then ordered type codes. Type codes in order are `entity,prop,nat,text,context,function,any`. Local keys use the `local:` namespace and cannot redefine shared entries. Duplicate, conflicting and unused declarations are rejected. Definitions, identifiers and literal padding pay their full UTF-8 costs.

Unsigned integers use five payload bits and one continuation bit per cell, least-significant group first; redundant leading groups are invalid. UTF-8 bytes are packed into six-bit words with zero terminal padding. The existing CRC12, borders, orientation marks, margin, rectangular layout and zero frame padding remain unchanged. Profiles 1 and 2 remain compatible with the original reference codec.

[The independent Python decoder](../reference/silex_logic_codec.py) parses profile-3 pixels, declarations, role masks and scopes without the source sentence or browser state.

## Decoder cost, provenance and tradeoffs

The shared book contains 117,659 Princeton WordNet 3.0 senses and 11,306 PropBank/AMR rolesets, plus the compositional operators. It costs approximately 18.4 MB and is hash-verified and cached locally. WordNet entries are ranked for physical indexes by usage frequency; sense selection uses the requested lemma’s own sense order, preventing a frequent synonym from overriding its ordinary sense. Noun sense disambiguation is still imperfect.

The generator excludes source example sentences. WordNet source archive SHA-256 is recorded in the book. PropBank source is pinned at `c66e0ccf28b53f00051b187db83e937b5bee2e32`. Definitions, aliases, numbered roles and linked semantic labels are adaptations, with attribution and licenses in [third-party notices](../THIRD-PARTY-NOTICES.md). The generated vocabulary’s adapted PropBank content remains CC BY-SA 4.0; WordNet notices are retained.

To reproduce, extract the pinned WordNet archive and PropBank source, then run:

```sh
node scripts/build-logic-vocabulary.mjs /path/to/wordnet/dict /path/to/propbank-frames
```

The generator snapshots the operator registry, extracts lexical data, publishes the vocabulary and updates its size/SHA manifest. Source example sentences are not included in the codebook.

This is a significant shared decoder cost, amortized across messages. Rare lexical indexes need more cells; genuinely new definitions can dominate a short message. Compact closed predicates outperform graph-record packaging on the measured examples, but no universal visual-density optimum, semantic-accuracy guarantee, or advantage over English/Mandarin typography follows from that comparison.
