# Third-party notices

This converter depends on, and attributes, the following projects:

- [WebLLM / MLC AI](https://github.com/mlc-ai/web-llm), browser inference runtime, version 0.2.86.
- [Qwen3.5](https://github.com/QwenLM/Qwen3.5), on-device language model; [MLC 4B weights](https://huggingface.co/mlc-ai/Qwen3.5-4B-q4f16_1-MLC), pinned to revision `44b42469f9e192814bfd90440e3b377d89ba7a13`.
- [Apache TVM](https://github.com/apache/tvm), used by the MLC runtime.
- [esbuild](https://github.com/evanw/esbuild), browser bundling.
- [Cloudflare Wrangler](https://github.com/cloudflare/workers-sdk), deployment tooling.

Model weights and compiled model libraries are downloaded directly from their original hosts; this repository does not redistribute them. Dependency license texts accompany their packages. The browser bundle preserves legal comments; the WebLLM package's license text is served with the converter's reference files.

The language research cites Shannon, Church, Rissanen, Grünwald, and RFC 1950 through primary-source links in its specification. Those works are references, not copied source components.
