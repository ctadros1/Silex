# Silex

An experimental visual language for compact, compositional meaning, with a browser-local converter.

**[Open the converter](https://project.christiantadros.com/silex-converter)** · **[Read the complete specification](docs/Silex-Specification.md)** · **[Research report](reference/Silex-Research-Report.pdf)** · **[64-glyph atlas](docs/glyph-atlas.png)**

![Complete written Silex specimens](docs/written-specimens.png)

Silex separates a scoped semantic expression from its physical carrier. Its 64 glyphs each contain six binary sites in two columns and three rows. Their weights are:

```text
32 16
 8  4
 2  1
```

A head determines its argument count. Quantifiers introduce explicitly referenced variables. The resulting prefix expression needs no transmitted parentheses or spaces. Numbers, exact UTF-8 text, local definitions, functions, quotation, and declared primitives support arbitrary finite descriptions. A framed binary lattice carries length, checksum, and padding as well as the expression.

```text
I see you.
(SEE ME YOU)

I see the red bird.
(SEE ME (THE (AND (BIRD V0) (RED V0))))

Every child sees a bird.
(ALL (CHILD V0) (SOME (BIRD V0) (SEE V1 V0)))

There is a bird every child sees.
(SOME (BIRD V0) (ALL (CHILD V0) (SEE V0 V1)))
```

The last two expressions have different meanings. Scope is encoded explicitly; a reader never guesses pronoun binding from proximity.

## Use the converter

1. Select an input language and enter a sentence, or try an example.
2. Translate, review the literal reading, and inspect the semantic tree.
3. Select a glyph or tree node to highlight its exact location and subtree in the final frame.
4. Download a clean PNG/SVG or copy the PNG to the clipboard.
5. Swap direction or select **Silex image**, choose a raster image, and select an output language.

English, Spanish, French, German, Italian, Portuguese, Mandarin, Japanese, Korean, Arabic, Hindi, and Russian are available. Five shared constructions in all twelve languages and a broader compositional English grammar work immediately, including observed events, movement paths, possession, proper names, contextual pronouns, adjectives, spatial relations, cardinality, relative clauses, passive voice, infinitive control, concession, transfers, questions, ability, negation, and tense. Unseen multilingual and more complex sentences use an optional **Qwen3.5 4B** model through **WebLLM**, running on the browser's GPU. Its weights download about 2.37 GB plus tokenizer/runtime files; roughly 4 GB of GPU memory is needed. WebGPU and shader-f16 support are required for AI; grammar examples, image decoding, and exports do not require AI. Browser/device memory and download access can limit model loading.

For ordinary structures with unfamiliar words the local model supplies contextual word senses and the grammar compiler handles scope. More complex structures use a nested meaning tree with explicit clause relationships. The compiler constructs lexical calls and converts named semantic variables to scope distances. The converter validates syntax, binding, role counts, and conservative proposition typing, then derives the glyph explanations from the actual encoded tree. Validation is not proof that the interpretation matches the source. Review pronouns, quantifiers, tense, and lexical senses. The automatic translator is experimental.

The converter never silently substitutes quoted text for semantic translation. If analysis cannot be completed, the user can separately choose **Preserve exact wording**, which explicitly encodes a TEXT literal. The interface identifies that mode; it does not claim that preserving a quotation is semantic translation. Reverse conversion recovers the encoded content, not original wording that was never stored.

## New concepts and counted grounding

The converter can declare new predicate senses with explicit role signatures and English definitions. These travel in the same image using the original v1 grammar, not an external per-image database:

```text
PAIR
  TEXT {"schema":"silex-lexicon/1","entries":[
    {"id":"urn:silex:lex:happy","roles":["entity"],
     "definition":"Experiencing pleasure or contentment."}
  ]}
  CALL SYMBOL "urn:silex:lex:happy" ME
```

The actual TEXT is length-delimited UTF-8 JSON and the CALL has a counted argument list. All declaration bytes and repeated identifiers are paid for. The original codec recovers a PAIR value containing declarations and content. Interpreting that value as a lexical package requires the converter's explicitly declared model convention, documented in [the lexical package specification](docs/Converter-Lexical-Packages.md). English sense definitions remain a shared grounding prior, not a mathematical reduction of every human concept.

## Privacy and hosting

- Images are read using local browser file APIs and decoded from pixels.
- Sentence interpretation and translation run on the device; there is no remote inference.
- No upload endpoint, user account, analytics, R2 bucket, D1 database, or server image storage is used.
- Model downloads contact Hugging Face and GitHub. These hosts see ordinary model-file download requests; sentence text and images are not sent to them by this app.
- Model caching consumes storage on the visitor's device. Turning off AI releases its runtime but keeps those cached files.
- The page is served by a static-assets Cloudflare Worker with one route, `project.christiantadros.com/silex-converter*`. The existing project-subdomain root redirect and SortLab custom domain are preserved.

Upload an intact PNG, lossless WebP, or sufficiently crisp JPEG panel, including its white margin. Integer scales and rotations are supported. Photos, cropped panels, captions, blur, and noninteger resampling may fail safely. Clipboard image support depends on browser permissions; PNG download is the fallback. Exported SVGs can be rasterized, but uploaded SVG is intentionally not accepted because raster files cannot contain linked remote assets.

## Run locally

Use Node.js 22.12 or newer:

```sh
npm ci
npm test
npm run build
npm run dev
```

Open `http://localhost:8792/silex-converter/`. To deploy into the configured account and route, an authorized Cloudflare login is required:

```sh
npm run deploy
```

No inference API keys or storage credentials are required. Deploying to a different account requires updating `wrangler.jsonc`; do not assume access to the original hostname.

The Python language reference can independently encode and decode images:

```sh
python3 -m pip install Pillow
python3 reference/silex_codec.py '(SEE ME YOU)' --png message.png
python3 reference/silex_codec.py --decode-png message.png
```

## Evidence and limits

The browser codec is checked against all thirteen original Python specimens, including exact words, packets, and frame geometry. Tests cover all 64 glyph patterns, large integers, exact Unicode, binding and type rejection, 60 authored multilingual constructions, 35 everyday English semantic translations, independent observed-event countermodels, omission rejection, named-variable scopes, 1,000 random syntax trees, all single-bit corruptions in the specimen packets, compressed frames, an independent quantifier-scope countermodel, and paid lexical declarations.

In the original 13-example experiment, equal nominal 32-pixel character height gave Silex 8.6% less area than English and 16.3% more than Mandarin. Comparing tiny binary cells against conventional 32-pixel typography did not match recognition error. The demonstration corpus and dictionary were designed together; Mandarin glosses were not independently reviewed. No global optimality or measured semantic entropy is claimed. See the [research records](research) and complete specification for definitions, decoder cost, and limitations.

The converter uses direct profile 1 for inspectable output and accepts profiles 1 and 2 on input. Its pixel decoder is an intact-panel decoder, not camera OCR. Its English literal realizer explains structure; its semantic specification is broader than the implemented finite-model evaluator. Syntax tests do not establish complete model semantics or human readability.

## Repository map

| Path | Contents |
|---|---|
| `src/codec.js` | Browser Silex syntax, framing, rendering, and pixel decoding |
| `src/language.js`, `src/english.js` | English grammar, twelve-language examples, literal meanings, explanations |
| `src/semantic-plan.js`, `src/coverage.js` | Named-scope compilation and guards against dropped details |
| `src/lexicon.js` | Counted lexical packages and signature validation |
| `src/ai.js`, `src/ai-worker.js` | On-device model loading, analysis, and translation |
| `src/app.js`, `src/index.html`, `src/style.css` | Converter interface |
| `reference/` | Normative original grammar, Python codec, printable report |
| `docs/` | Complete language specification, visual atlas, laboratory, converter conventions |
| `research/` | Measurements, provenance, and original reproduction package |
| `tests/` | Original Python golden fixtures and executable browser-code unit tests |

Dependencies are pinned in `package-lock.json`. WebLLM and model attribution is listed in [third-party notices](THIRD-PARTY-NOTICES.md).

## Translation completeness

Silex has an open vocabulary; an unfamiliar word is not a missing character in a finite alphabet. New senses carry explicit definitions and ordered roles. The browser translator is an experimental implementation, not a guarantee that every possible natural-language sentence is interpreted correctly. Valid words can form ambiguous, figurative, context-dependent, or self-contradictory sentences. Check the chosen formal reading. The language's expressive mechanisms and the translator's measured coverage are different claims; [converter conventions](docs/Converter-Lexical-Packages.md) and [verification evidence](docs/Verification.md) make those limits explicit.
