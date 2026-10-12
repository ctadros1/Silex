# Third-party notices

The converter and prepared model release use these components:

| Component | Version/source | License and use |
|---|---|---|
| [amrlib meaning parser](https://github.com/bjascob/amrlib-models) | `parse_xfm_bart_base-v0_1_0` | Author repository MIT; converted BART-base weights are distributed in the prepared model release. No Silex fine-tuning. [Notice](reference/licenses/amrlib-MIT.txt). |
| [BART](https://github.com/facebookresearch/fairseq/tree/main/examples/bart) | Standard `facebook/bart-base` tokenizer and BART architecture | Underlying pretrained model/tokenizer attribution; amrlib supplies the AMR-trained weights. |
| [UDPipe](https://github.com/ufal/udpipe) | 1.3.1, commit `da13c46cccc55fc0772ff221abbea3f798237115` | MPL 2.0; compiled to WASM. The wrapper/source build is in `scripts/`; original sources are available at the pinned commit. [License](reference/licenses/UDPipe-MPL-2.0.txt). |
| [BNOSAC English UD model](https://github.com/bnosac/udpipe.models.ud/tree/1fe8235746b37af642c906c2fb6080cf65013306) | `english-ud-2.1-20180111.udpipe` | CC BY-SA 4.0; redistributed unchanged for learned sentence, morphology, and dependency annotations. Credit BNOSAC and Universal Dependencies English treebank contributors. [Model notice](reference/licenses/English-UD-CC-BY-SA-4.0.txt), [license](reference/licenses/CC-BY-SA-4.0-legalcode.txt). |
| [Transformers.js](https://github.com/huggingface/transformers.js) | 4.3.1 | Apache 2.0 browser inference/tokenization. [License](reference/licenses/Transformers-Apache-2.0.txt). |
| [ONNX Runtime](https://github.com/microsoft/onnxruntime) | Exact npm versions in lockfile | MIT browser WASM and native regression inference. [License](reference/licenses/ONNX-Runtime-MIT.txt). |
| [WebLLM / MLC AI](https://github.com/mlc-ai/web-llm) | 0.2.86 | Apache 2.0 optional browser GPU language translation; [license](reference/WebLLM-LICENSE.txt). |
| [Qwen3.5](https://github.com/QwenLM/Qwen3.5) | [MLC 4B weights](https://huggingface.co/mlc-ai/Qwen3.5-4B-q4f16_1-MLC), revision `44b42469f9e192814bfd90440e3b377d89ba7a13` | Optional language model downloaded directly from its upstream host. |
| [Apache TVM](https://github.com/apache/tvm) | MLC compiled runtime, pinned library revision | Apache 2.0; used by WebLLM. |
| [Emscripten](https://github.com/emscripten-core/emscripten) | Official emsdk 6.0.1 container pinned by digest | Build tooling for the UDPipe WASM adapter. |
| [esbuild](https://github.com/evanw/esbuild), [Cloudflare Wrangler](https://github.com/cloudflare/workers-sdk) | Lockfile versions | Build/deploy tooling; dependency notices accompany npm packages. |

The prepared model release includes these notices and license texts. The CC BY-SA component keeps its own license; this does not relicense unrelated source components. The AMR and ONNX assets are derived conversions, with their preparation and SHA-256 digests published in [Model Preparation](docs/Model-Preparation.md) and `models/manifest.json`. Browser bundles preserve legal comments.

The model regression sample uses [UD English EWT](https://github.com/UniversalDependencies/UD_English-EWT), CC BY-SA 4.0, only when downloaded by the tester. It is not bundled with the converter or copied into this source repository.

The original language research links to Shannon, Church, Rissanen, Grünwald, and RFC 1950 as references rather than copied source components.
