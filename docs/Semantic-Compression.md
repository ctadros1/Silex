# Semantic compression in the converter

This document describes an older image format, retained for decoding compatibility. Current normal translations use [scoped compilation and lexical profile 3](Scoped-Compilation.md). Measurements below apply to the older pipeline.

Normal translation writes meaning using Silex’s original 64 heads. It does not copy the source’s words, whitespace, punctuation, language name, or JSON into the image. Exact-text mode is deliberately separate. The six-site binary appearance is the physical glyph alphabet, not a character-by-character encoding of English.

## Native compilation

The trained model produces an AMR graph. The compiler maps known semantic frames to original heads, including SEE, LOVE, READ, BUILD, GIVE, HELP, DRINK, RUN, DIE, FAIL, KNOW, BELIEVE, WANT, SAY, REMEMBER, RED, POSSIBLE, and NECESSARY. Participants use ME, YOU, WATER, definite descriptions, or bound variables. Properties use the original noun/property heads. Negation, time, questions, and quantifiers become their original compositional operators.

This is a mapping of semantic constructors and roles, not a lookup table of complete sentences or English grammar patterns. It accepts native output only when **all** graph nodes, edges, and supported grammatical annotations were consumed. Unrecognized modifiers, concepts, cycles, extra roles, aspect, and grammatical distinctions force a complete compact graph instead of being discarded.

UDPipe supplies learned local determiner/auxiliary links, morphology, and lemma alignment. Definite articles select THE; indefinite participants select SOME; universal participants select ALL. Past/future markers select PAST/FUTURE, and questions wrap the time/negation proposition with ASK. Conflicting or unaligned annotations keep the graph and produce a review note. Multiple native participants use source mention order to select quantifier scope within their clause; this is an interpretation convention, not proof that every ambiguous sentence has that scope. Attitude contents keep their own nested quantifiers.

```text
I see you.
(SEE ME YOU)                                                   3 glyphs

I see the red bird.
(SEE ME (THE (AND (BIRD V0) (RED V0))))                         8 glyphs

I see the red bird. I see the red bird.
(LET (SEE ME (THE (AND (BIRD V0) (RED V0))))
     (PAIR V0 (PAIR V0 NIL)))                                 14 glyphs
```

All counts include meaning syntax/payload heads and exclude frame overhead, which is reported separately below. The repeated example stores one closed definition and two references. It retains the two ordered statement occurrences; it does not replace repetition with one assertion.

## Ordered documents and sharing

One statement is its ordinary expression. Multiple statements form a list `PAIR(statement, PAIR(statement, ... NIL))`. Under the converter’s declared document convention, each item is a separate ordered utterance. Core PAIR itself remains an ordered value constructor. Long lists are grouped into balanced ordered chunks to stay within browser recursion limits. A profitable shared closed statement can be defined with LET and referenced by the list’s items. Bound-variable distances still obey the original scope rules. No sentence-specific giant glyph is introduced.

## Compact extension: g2/1

Concepts absent from the small original registry and graphs that cannot safely become native expressions use:

```text
package    = CALL(SYMBOL("g2"), dictionary, graph+)
dictionary = NIL | CALL(SYMBOL("s"), SYMBOL(local-label)+)
graph      = PAIR(NAT(root), PAIR(nodes, edges))
nodes      = CALL(SYMBOL("n"), concept-record+)
concept-record = NAT(concept-code) | PAIR(NAT(concept-code), NAT(feature-flags))
edges      = CALL(SYMBOL("e"), (NAT(source-node), NAT(role-code), target)*)
target     = NAT(local-node-id) | TEXT(quoted-value) | SYMBOL(numeric-or-symbolic-value)
           | PAIR(NAT(value-type), NAT(local-dictionary-index))
```

The existing counted CALL syntax makes this self-delimiting. Shared concept and relation codes are indexes into the frozen [g2/1 codebook](../reference/Semantic-Codebook.json). An index at or above its corresponding shared array length refers to a local declaration at `index − shared-length`. Concepts and relations have separate shared arrays but one local string table. A label is declared once per compact package; repeated uses are numeric references. No source-word list exists in this grammar.

Node IDs are array positions local to their graph. The same concept can label different nodes without merging their identities. Reentrancy and cycles use explicit node IDs. Out-of-range references, constructor mismatches, empty labels, and malformed edge counts are rejected.

TEXT targets are actual quoted semantic values, such as a name or quoted speech. SYMBOL targets matching the decimal-number grammar are exact numerical lexemes; other SYMBOL targets are symbolic values such as negative polarity `-`. Repeated long literal values may also be shared through a typed dictionary reference: type 0 quoted string, 1 exact number, 2 symbolic value. The compiler uses this only when it saves transmitted words. They are never converted through floating point. A quoted `"12"` and numeric `12` remain different. Unknown concepts/roles have counted UTF-8 labels; those bytes occupy the image.

Feature flags have a three-bit determiner code: 0 unspecified, 1 indefinite, 2 definite, 3 universal, 4 near demonstrative, 5 far demonstrative, 6 negative determiner. Higher bits are 16 past, 32 future, 64 ongoing, 128 perfect, 256 plural, and 512 conditional modality. Features absent from a node require no extra pair. These supplement AMR’s omissions; they do not give an underspecified graph complete first-order scope or resolve cross-sentence coreference.

The original Python codec decodes the containing expression unchanged. A graph-aware reader additionally needs this convention, the shared codebook, AMR frame-role grounding, English concept knowledge, and context. Changing the codebook’s index meanings requires a new profile identifier. The image contains no external per-message vocabulary database or hidden sidecar.

## Decoding and explanation

Reverse conversion realizes the encoded meaning. Native examples can be read without a model. Other meanings have a structural English reading; the optional local language model realizes them naturally in English or another supported language. It receives only decoded meaning, not a stored copy of the original sentence. Surface phrasing is intentionally unavailable outside exact-text mode and legacy images.

Selecting a native head highlights its actual encoded subtree. Selecting a compact node or relation highlights the actual reference fields and, for a local label, its paid declaration. Shared labels come from the codebook and occupy no hidden text area in the frame. Exports exclude explanatory overlays.

## Measured visual area

The comparison uses the same direct profile 1 carrier, optimal existing rectangle layout, identical module width, and counts the complete allocated panel, including margin, orientation border, length, checksum, and zero padding. Area below is in square modules; multiply by module width squared for pixel area. Meaning glyphs each have six bit sites.

| Input | Previous meaning glyphs | Current meaning glyphs | Previous panel modules | Current panel modules |
|---|---:|---:|---:|---:|
| I see you. | 227 | 3 | 1,720 | 120 |
| I see the red bird. | 286 | 8 | 2,116 | 156 |
| Repeated red-bird statement | 364 | 14 | 2,640 | 208 |
| Red bird flying away | 359 | 98 | 2,576 | 840 |
| You walking down the street | 348 | 111 | 2,530 | 930 |

In the executed 243-input, 252-statement sample, old bodies totalled 84,570 glyphs and new bodies 24,852. Complete panel areas totalled 609,170 versus 208,076 square modules, a **65.8% area reduction** at the same module size. Only 30 statements fit the native inventory completely; the rest used the compact extension. This measures savings over the previous converter, not a guarantee of a smaller output than English or Mandarin for each unseen sentence.

The old format retained exact surface wording as well as a graph. The new format intentionally removes that redundancy and non-semantic formatting, while native expressions and feature flags retain interpreted distinctions. This is semantic representation, not lossless compression of identical text data. These figures do not measure semantic entropy or compare recognition errors between writing systems.

The shared codebook and its grounding are real decoder costs. Teaching it to a new reader has a cost; transmission claims should amortize it explicitly. Model/runtime weights are encoder resources. The original research’s small scoped-specimen English/Mandarin comparison remains unchanged and cannot be transferred to these new messages without a new matched experiment.

## Limits

The model can misinterpret a word, role, idiom, or scope. Compression preserves the chosen interpretation; it cannot make an incorrect analysis faithful. Unknown labels require grounding beyond their spelling. Complex compact graphs may still occupy more area than familiar natural-language writing. The converter is not a universal semantic oracle or a proof of globally optimal density.
