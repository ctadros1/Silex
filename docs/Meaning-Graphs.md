# Legacy graph-and-source images

This document describes an older image format, retained for decoding compatibility. Current normal translations use [scoped compilation and lexical profile 3](Scoped-Compilation.md). Measurements below apply to the older pipeline.

This historical format remains decodable. Normal translation no longer generates it: it copied source wording and verbose metadata, which defeated semantic compression. See [Semantic Compression](Semantic-Compression.md) for the current format.

# Silex meaning graphs, version 1

This is a declared interpretation convention within the original Silex v1 wire grammar. It adds no physical glyphs. A core decoder recovers a `PAIR` value; a graph-aware decoder interprets that value using the following schema. Reading the graph requires shared AMR concepts, PropBank frame roles, English grounding, and context. It does not require the encoder model or a per-message database.

## Complete compositional grammar

```text
package   = PAIR(TEXT(metadata), CALL(SYMBOL("d"), statement+))
statement = CALL(SYMBOL("g"), NAT(root), concepts, relations, source)
concepts  = CALL(SYMBOL("n"), NAT(dictionary-index)+)
relations = CALL(SYMBOL("e"), (NAT(source-node), NAT(role-index), NAT(target))*)
source    = CALL(SYMBOL("a"), NAT(tail-index),
                (NAT(preceding-whitespace-index), NAT(word-or-punctuation-index))+)
```

Parentheses here are reference notation; the physical grammar uses head arities and counted `CALL` argument lists. All identifiers, argument counts, natural-number values, UTF-8 bytes, and length fields are encoded and counted.

`metadata` is UTF-8 JSON:

```json
{"schema":"silex-meaning-graph/1","language":"en","strings":["","see-01","i","ARG0","I"," ","see","."]}
```

The dictionary’s first entry is the empty string. Concepts, role labels and lexical values are unrestricted finite strings. A node’s identity is its zero-based position in the statement’s concept array, not its spelling. Several nodes may have the same concept. Roots and node references are local to their statement. Statement order and repetitions are preserved. Graph references permit shared participants, reentrancy and cycles without ambiguous pronoun guesses. Cross-statement coreference is not inferred by this version.

Each relation target is `4 × index + tag`:

| Low two bits | Target |
|---|---|
| `00` | Node at `index` in this statement |
| `01` | Quoted string at dictionary `index` |
| `10` | Exact decimal numerical lexeme at dictionary `index` |
| `11` | Symbolic value at dictionary `index`, such as polarity `-` |

Numbers remain textual decimal lexemes and are never rounded through JavaScript floating point. A numeric `12` and a quoted `"12"` have distinct tags. Incoming references, counts, tags, constructor names, and dictionary entries are checked before interpretation.

Source words and punctuation are individual atoms. Whitespace precedes each atom; trailing whitespace has its own reference. Concatenating them recovers every original source character. They are supplementary evidence, not a whole-sentence `TEXT` replacing meaning analysis. For non-English input, the statements contain the English intermediate and metadata additionally contains:

```text
original = {language: language-code,
            atoms: [[gap-dictionary-index, form-dictionary-index], ...],
            tail: dictionary-index}
```

This preserves the selected source language and its complete word witness separately from the English model interpretation. All of its bytes also occupy the frame.

## Example interpretation

For “I see the red bird flying away.” the tested model produced the graph:

```text
see-01
  ARG0 → i
  ARG1 → fly-01
             ARG0 → bird
                       ARG1-of → red-02
             direction → away
```

The bird is the flyer. `see-01` relates the observer to the flight event. This is AMR’s representation, not a rewrite into the original formal grammar’s entity-only `SEE` head. No predicate-arity rule is violated or weakened: the graph is data carried by the open `CALL` convention. A meaning-graph decoder supplies its AMR interpretation.

“I see the red bird. I see the red bird.” contains two separately indexed statement records. Pooling shared concept strings saves dictionary space; it never deletes the second statement or merges its nodes into the first.

## Semantic limits and information costs

The trained parser can process vocabulary and constructions absent from this repository’s English example grammar. Its BART subword tokenizer does not require a hand-maintained list of valid English words. Neural interpretation can still be wrong, and valid words do not uniquely determine meaning without context.

AMR captures many participants, events, negations, modalities, conditions and relations, but incompletely represents tense, definiteness and quantifier scope. The source witness retains those surface distinctions for a reader, rather than pretending the model supplied rigorous scoped logic. Exact first-order distinctions should be written directly using Silex’s original quantifiers and binders when required.

The package is self-contained as an encoded graph plus wording. Its shared interpretation prior is substantial: English, AMR, contextual world knowledge, and frame-role grounding. These are decoder costs. The roughly 270 MB browser parser/runtime is an encoder resource and is not necessary for pixel decoding. Neither cost is free in a from-first-principles density comparison.

The dictionary and source witness make these packages much larger than the original short formal specimens. They improve general conversion and auditable recovery at the expense of area. The original English/Mandarin area measurements do not apply to this profile. No unmeasured semantic-bit density claim is made.

The browser currently limits input to 1,200 characters, 512 statements, 512 nodes and 2,048 relations per statement. These are resource ceilings, not a vocabulary limit of the compositional convention. The decoder has additional frame/pixel limits to fail safely on damaged or excessive files.

## Visual mapping and compatibility

A selected concept highlights its actual numeric dictionary-reference field and the UTF-8 dictionary bits containing its label. A relation highlights the actual source/role/target fields plus its role dictionary entry. A source word highlights its gap/form fields and dictionary entry. UTF-8 byte offsets are converted to overlapping six-bit glyph sites; a glyph may straddle adjacent dictionary bytes. Highlights are overlays and are excluded from exports.

Direct profile 1 permits field locations to be identified exactly in the original image. Compressed profile 2 inputs are decoded locally and shown in a reconstructed direct carrier for field mapping, with that distinction explained. The original glyph registry, framing, and Python codec remain unchanged.

The graph compiler rejects malformed model output instead of substituting a sentence quotation. An otherwise complete model graph missing closing parentheses can be closed structurally; the interface records that repair as a note. This never supplies an omitted concept or role and does not establish semantic correctness.
