# Silex

An experimental visual language for compositional meaning, with a browser-local converter.

**[Open the converter](https://project.christiantadros.com/silex-converter)** · **[Language specification](docs/Silex-Specification.md)** · **[Meaning-graph format](docs/Meaning-Graphs.md)** · **[Research report](reference/Silex-Research-Report.pdf)**

![Written Silex specimens](docs/written-specimens.png)

Silex separates meaning from its visual carrier. Its 64 glyphs each contain six binary sites in two columns and three rows, weighted `32,16 / 8,4 / 2,1`. Fixed-arity heads, counted calls, explicit variable scope, exact numbers, UTF-8 literals, functions, and declared concepts support arbitrary finite descriptions. The complete image also pays for its border, length, checksum, and padding.

For example, the original formal grammar distinguishes:

```text
Every child sees a bird.
(ALL (CHILD V0) (SOME (BIRD V0) (SEE V1 V0)))

There is one bird that every child sees.
(SOME (BIRD V0) (ALL (CHILD V0) (SEE V0 V1)))
```

## Translate and inspect

1. Enter text, choose its language, and press **Translate**.
2. Review the model’s literal meaning graph and the source words retained in the image.
3. Select a concept, relation, source word, or glyph to highlight the fields and dictionary entry that encode it.
4. Download PNG/SVG or copy the image.
5. Choose **Silex image** to decode a complete raster panel locally.

English translation uses **a trained AMR meaning parser**, followed by a semantic compiler. It does not match a list of sentences or encode the input’s letters. The compiler uses the original Silex heads for complete meanings it can represent, including participants, properties, quantifiers, negation, attitudes, questions, and time. A trained UDPipe annotator supplies local article and morphology distinctions that AMR omits.

```text
I see you.                  → (SEE ME YOU)                                  3 meaning glyphs
I see the red bird.          → (SEE ME (THE (AND (BIRD V0) (RED V0))))       8 meaning glyphs
Repeated red-bird statement → a shared LET definition and two ordered uses 14 meaning glyphs
```

Original wording, punctuation, whitespace, and JSON are **excluded from normal images**. Unknown concepts and richer structures use a [compact semantic extension](docs/Semantic-Compression.md), with shared concept/role codes and counted local declarations. Every graph node, relation, and supported grammatical feature is retained; the compiler does not drop modifiers to force a small output. Exact wording remains an explicit, separate TEXT mode.

The first English translation downloads about **270 MB** of model/runtime assets. Inference runs in a background worker, using up to four CPU threads where browser isolation permits. The page shows checked download bytes, statement progress, output activity, elapsed time, and an animated indicator. **Stop** terminates the attempt. Browser caches reuse verified unchanged weights across annotator updates.

Spanish, French, German, Italian, Portuguese, Mandarin, Japanese, Korean, Arabic, Hindi, and Russian use an optional **Qwen3.5 4B** model through WebLLM to produce an English interpretation before semantic compilation. It requires WebGPU, shader-f16, approximately 2.4 GB of downloads and sufficient GPU memory. Other languages and natural readings of complex graphs use this same local model.

On image input, the converter reads **the encoded meaning** and regenerates wording in the selected output language. It cannot recover wording that was intentionally not stored. The original core codec, explicit **Silex expression** mode, old graph-and-source images, and lexical packages remain readable.

## Semantic compression

The [compiler specification](docs/Semantic-Compression.md) describes native operators, ordered documents, LET sharing, and the `g2/1` open graph convention. Familiar concepts use shared codes; new labels are declared once within the image. Names, actual quotations, and exact numerical values pay their literal costs. The published [codebook](reference/Semantic-Codebook.json) is shared decoder knowledge, not a per-image sidecar.

Across 243 tested inputs containing 252 statements, the current compiler reduced complete direct-frame module area by **65.8%** compared with the previous graph-plus-source converter, at the same module size. The repeated bird example fell from **364 to 14 meaning glyphs**, and from **2,640 to 208 frame modules**, including framing and padding. Only 30 statements in that varied sample fit native heads completely; the rest used compact semantic declarations. The improvement is not a claim that all outputs use the small native inventory or outperform English and Mandarin typography.

This comparison deliberately stops preserving exact surface wording. It measures the intended semantic format against the old verbose converter, not lossless text compression, semantic entropy, or matched human recognition error. Model interpretation may still be wrong. See [verification](docs/Verification.md) and [compression measurements](docs/Semantic-Compression.md).

## Privacy

Sentences, images, and model inference stay in the browser. Images are decoded from pixels using local file APIs. There is no upload endpoint, remote inference, account, analytics, or server storage for visitor images. Model downloads are ordinary static-file requests; optional language-model downloads contact Hugging Face and GitHub. Model caches occupy the visitor’s device storage.

Use an intact PNG or crisp lossless raster panel with its white margin. Integer scaling and rotations are supported. Photos, blur, captions, cropping, and noninteger resizing may fail safely. Clipboard support depends on the browser; downloading a PNG is the fallback.

## Run locally

Use Node.js 22.12 or newer:

```sh
npm ci
npm run prepare-model
npm test
npm run dev
```

Open `http://localhost:8792/silex-converter/`. Model assets are downloaded from this repository’s versioned public release and verified against [SHA-256 checksums](models/manifest.json). They are separate from Git source history. See [model preparation](docs/Model-Preparation.md) to reproduce the conversion or run the actual-model regression check.

`npm run deploy` builds and publishes the static converter to the account/route in `wrangler.jsonc`. A Cloudflare login is required. For another deployment, change that configuration. No inference API keys or image-storage credentials are needed. GitHub Actions checks source and builds; it does not deploy.

The independent Python reference can encode/decode the original wire format:

```sh
python3 -m pip install Pillow
python3 reference/silex_codec.py '(SEE ME YOU)' --png message.png
python3 reference/silex_codec.py --decode-png message.png
```

## Evidence and limitations

The new trained pipeline completed **243 inputs containing 252 statements**, including 67 externally sourced English texts, without graph-compilation or codec-round-trip failures. Each new expression decoded exactly; compact graph escapes retained their complete graphs and grammatical feature flags. Three model outputs needed completed closing brackets, which are reported as interpretation notes. This checks operational reliability, not universal semantic accuracy. Browser checks and the distinction between unit tests, model tests, and live deployment evidence are recorded in [Verification](docs/Verification.md).

AMR is an interpretation representation, not complete first-order semantics. It does not fully specify tense, articles, exact quantifier scope, or cross-sentence coreference. A model can choose the wrong concept, identity, attachment, or role. For example, the tested biological sentence classified a mitochondrion as an enzyme. Native compilation preserves represented distinctions; it cannot recover meaning the parser failed to infer. Review the literal interpretation. The formal language’s expressiveness and the automatic translator’s accuracy are different claims.

The original 13-example area experiment found Silex 8.6% smaller than English and 16.3% larger than Mandarin at equal nominal 32-pixel character height. It did not control recognition error or measure semantic entropy. Those results apply to the original scoped specimens, **not** the current semantic compiler. No universal density optimum or universal translation accuracy is claimed. See the specification and [research records](research) for measurement definitions and decoder costs.

| Path | Contents |
|---|---|
| `src/codec.js` | Original syntax, framing, rendering, and pixel decoding |
| `src/meaning-worker.js`, `src/meaning.js` | Trained local interpretation and cancellation |
| `src/semantic-compiler.js`, `src/compact-graph.js` | Native semantics, compact graph escapes, reuse, and visual field maps |
| `src/semantic-features.js`, `src/document-interpreter.js` | Learned grammar annotations and request-local model reuse |
| `src/meaning-graph.js` | Legacy graph-and-source image compatibility |
| `src/document-segments.js`, `src/model-assets.js` | Learned boundary adapter and verified asset caching |
| `src/ai.js`, `src/ai-worker.js` | Optional local language translation |
| `src/app.js`, `src/index.html`, `src/style.css` | Converter interface |
| `scripts/`, `models/manifest.json` | Model reproduction, downloads, and integrity records |
| `reference/`, `docs/`, `research/` | Language specification, visual atlas, reports, and provenance |
| `tests/` | Codec, graph, legacy compiler, and streaming checks |

Dependencies are pinned. Attribution and component licenses are in [third-party notices](THIRD-PARTY-NOTICES.md).
