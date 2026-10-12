# Model assets and reproduction

The text translator uses amrlib’s frozen `parse_xfm_bart_base-v0_1_0` model. No Silex sentence examples, fine-tuning, or sentence lookup tables are added. Greedy decoding runs with a maximum of 1,024 generated tokens. The original author’s model benchmark is not a browser accuracy or speed benchmark.

## Use the prepared release

```sh
npm ci
npm run prepare-model
npm run build
```

`models/manifest.json` names every static asset, its byte count and SHA-256 digest. Large ONNX and runtime WASM files are divided into 16 MiB chunks so each file fits the static host’s individual-file limit. The browser verifies chunks and the assembled file, caches verified chunks on the device, and runs the model locally. Assets are published separately under the release tag `meaning-model-v0.1.0`, keeping large weights out of Git source history.

For native regression testing:

```sh
node scripts/prepare-model.mjs --native
node scripts/check-meaning-model.mjs
```

The second command runs the actual frozen ONNX model, the actual learned document tokenizer, graph compilation, and word decoding. Results are written only to ignored `.parser-cache/meaning-model-check.json`. This is a native CPU check; it does not substitute for browser WASM and UI testing.

To include the externally sourced English sample, download the pinned [UD English EWT test partition](https://github.com/UniversalDependencies/UD_English-EWT/tree/b7711cce01cdd4f5fcc0a8199b8a50d951b16c0c) to `.parser-cache/ewt-test.conllu`. The script selects every 31st text of at most 700 characters, up to 80 texts. The executed sample contained 67. It is external to the converter’s authored fixtures; overlap with the model’s training sources was not audited.

## Reproduce conversion

Use Python 3.12 with `torch==2.14.1`, `transformers==4.57.6`, `optimum==2.1.0`, `optimum-onnx==0.1.0`, `onnx==1.23.2`, and `onnxruntime==1.31.0`. Install `sentencepiece` and the pinned tokenizer dependencies as needed by Transformers. The prepared release checksums are authoritative for the distributed artifacts; a different platform/library version may produce byte-different but functionally equivalent ONNX files.

1. Download the [author’s model release](https://github.com/bjascob/amrlib-models/releases/tag/parse_xfm_bart_base-v0_1_0). Its archive SHA-256 is `ecaa2d9b6b17d6a86af54a784e9ed1dd1c879a23f79918aa68b53b4a3766cc26`.
2. Extract into `.parser-cache/model_parse_xfm_bart_base-v0_1_0`. Save the standard `facebook/bart-base` tokenizer into that folder with `AutoTokenizer.from_pretrained(...).save_pretrained(...)`.
3. Export using `python -m optimum.exporters.onnx --model .parser-cache/model_parse_xfm_bart_base-v0_1_0 --task text2text-generation-with-past --opset 18 .parser-cache/amr-onnx`.
4. Run `python scripts/export-meaning-model.py .parser-cache/amr-onnx .parser-cache/meaning-model`. Dynamic unsigned 8-bit weights are applied to MatMul/Gather, including merged-decoder subgraphs. Config training-path metadata is removed; generation uses one beam and no sampling.
5. Download `english-ud-2.1-20180111.udpipe` from [BNOSAC’s pinned model repository](https://github.com/bnosac/udpipe.models.ud/tree/1fe8235746b37af642c906c2fb6080cf65013306) as `.parser-cache/english-ud-2.1.udpipe`. It is distributed unchanged under CC BY-SA 4.0.
6. Run `sh scripts/build-document-tokenizer.sh`. It pins UDPipe 1.3.1 and the official Emscripten container by digest. The wrapper uses only trained token/sentence segmentation, emits Unicode code-point ranges, and disables dynamic JS evaluation. It does not run a dependency parser or introduce English sentence templates.
7. Run `node scripts/pack-browser-model.mjs`. ONNX Runtime browser assets come from the pinned npm dependency. Publish its resulting files and notices under the manifest’s release tag before other machines run `prepare-model`.

The quantized encoder is 82,260,974 bytes and decoder 135,870,763 bytes. All distributed assets total 268,292,695 bytes before license texts; only needed assets are fetched at runtime. Tokenizer JSON, the English segmentation model, and WASM runtime contribute additional download size beyond neural weights.

## Optional multilingual model

WebLLM 0.2.86 uses `Qwen3.5-4B-q4f16_1-MLC` at revision `44b42469f9e192814bfd90440e3b377d89ba7a13`. Its compiled library is pinned to revision `00fe7a40e57e5e8eb9fef87526a4bf28ad5846c0`. This model only translates ordinary text or realizes legacy formal readings; it no longer invents Silex JSON structures or lexical definitions.

See [third-party notices](../THIRD-PARTY-NOTICES.md) for licenses and source attribution.
