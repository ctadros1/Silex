# Silex

A compositional visual language and a browser-local meaning converter.

**[Use the converter](https://project.christiantadros.com/silex-converter/)** · **[Language specification](docs/Silex-Specification.md)** · **[Current compiler and lexical grammar](docs/Scoped-Compilation.md)**

![Silex specimens](docs/written-specimens.png)

Silex encodes logical structure rather than ordinary spelling. Its 64 foundational tiles each contain six binary sites. Operators, lexical senses, bound variables, quantifiers, negation, time and nested propositions compose into a meaning. The complete panel includes its border, length, vocabulary version, declarations when needed, checksum and padding.

```text
Every child sees a bird.
(ALL (CHILD V0) (SOME (BIRD V0) (SEE V1 V0)))

There is one bird that every child sees.
(SOME (BIRD V0) (ALL (CHILD V0) (SEE V0 V1)))
```

## Convert, inspect and export

Enter text, select its language, and press **Translate**. Review the literal reading and semantic tree. Selecting a meaning symbol highlights its actual cells in the final panel. Download PNG/SVG or copy the image. Select **Silex image** to decode an intact raster panel locally and regenerate wording in a common language.

The current translation pipeline performs these steps:

1. A trained AMR model identifies participants, actions and relationships. A learned grammatical annotator supplies article, tense and aspect information.
2. A general compiler restructures that interpretation into Silex restrictions, bound entities, scoped predicates, event content, modifiers and questions. It checks that every interpreted concept and relationship was handled.
3. Ordinary concepts use a shared lexical sense index. New concepts receive a small, paid sense declaration. The normal converter does not fall back to storing the graph, JSON or the input sentence.
4. The codec encodes the resulting expression and renders its cells. Repeated statements remain ordered and can share a closed definition through `LET`.

For example, “I see the red bird flying across the sky” becomes observation of an ongoing flight, with a definite red bird and a trajectory across the definite sky. A real browser run produced **32 body cells**, compared with **119** in the previous graph-record output. See [verification](docs/Scoped-Verification.md) for measured results and limits.

English inference runs on the device’s CPU after a first-use download of approximately **270 MB**, plus the **18.4 MB shared vocabulary**. A spinner, elapsed time, download bytes and statement progress indicate activity; **Stop** cancels it. Files are cached locally.

Spanish, French, German, Italian, Portuguese, Mandarin, Japanese, Korean, Arabic, Hindi and Russian use a local Qwen3.5 4B model to produce an English interpretation. The same model provides natural readings and definitions for concepts absent from the shared vocabulary. It requires WebGPU, shader-f16, sufficient GPU memory and approximately **2.4 GB** of downloads. Exact-text preservation is a separate mode, clearly labelled as such.

## Language and density

[Profile 3](docs/Scoped-Compilation.md) adds **117,659 WordNet senses**, **11,306 PropBank frames**, and published compositional operators. A lexical head transmits its index, not its UTF-8 spelling. PropBank heads also transmit a six-bit role mask. Definitions and roles are shared decoder knowledge; new declarations are counted in the image. [The vocabulary](reference/Logic-Vocabulary.json) includes the operator registry and source provenance.

The original [research report](reference/Silex-Research-Report.pdf) compares scoped specimens with English and Mandarin typography. Its measurements apply to those specimens, not every output of this converter. Silex does not guarantee an area reduction for every sentence. Shared vocabulary size, display scale, framing and recognition accuracy matter alongside the body-cell count.

## Privacy and limits

Text, images and inference stay in the browser. Images are read from pixels using local file APIs. There is no image-upload endpoint, visitor image storage, account, analytics or remote inference. Static model downloads contact this site, Hugging Face and GitHub. Browser caches consume space on the visitor’s device.

Formal expressiveness, codec validity and translation accuracy are separate properties. A learned model can misread an attachment, sense, pronoun, article or scope. The compiler preserves the interpretation it receives; its coverage check cannot prove that interpretation matches the source. Review the literal reading. The converter does not promise flawless translation of every sentence. Cross-sentence coreference and difficult ambiguity remain limitations.

Use an intact PNG with its white margin. Integer scaling and rotations are supported. Cropping, blur, camera photos and captions may fail safely. The original core format and older graph images remain readable for compatibility.

## Run and verify

Use Node.js 22.12 or newer:

```sh
npm ci
npm run prepare-model
npm test
npm run dev
```

Open `http://localhost:8792/silex-converter/`. Model assets are separate versioned release downloads with [SHA-256 checksums](models/manifest.json). [Model preparation](docs/Model-Preparation.md) explains reproduction. The current-model regression check is:

```sh
node scripts/prepare-model.mjs --native
node scripts/check-scoped-model.mjs
```

`npm run deploy` publishes the static site using `wrangler.jsonc`; change that configuration for your own account and route. GitHub Actions verifies tests, the current meaning pipeline and the build.

The independent Python decoder supports current lexical panels without a browser or source sentence:

```sh
python3 -m pip install Pillow
python3 reference/silex_logic_codec.py message.png
```

The original [Python codec](reference/silex_codec.py), formal grammar and research artifacts remain unchanged. Dependencies, models and vocabulary sources are attributed in [third-party notices](THIRD-PARTY-NOTICES.md).
