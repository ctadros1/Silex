# Deployment

The converter is a static-assets Cloudflare Worker named `silex-converter`. Its single route is `project.christiantadros.com/silex-converter*`. Assets live under `dist/silex-converter/`, including scripts, inference workers, model shards, styles, and reference files. The bare converter path redirects to the directory’s trailing-slash URL.

Cross-origin isolation headers permit parallel browser WASM inference. External optional-model requests use CORS; the script policy permits WASM compilation without dynamic JS evaluation.

There are no runtime bindings, inference endpoints, secrets, databases, buckets, upload handlers, or visitor-image storage. Translation and image decoding run in the browser. Ordinary static hosting limits still apply to downloaded model files.

Run `npm ci`, `npm run prepare-model`, `npm test`, and `npm run build` before `npx wrangler deploy`. The prepared model release must exist before another checkout runs `prepare-model`; its manifest pins asset sizes and SHA-256 digests. Large ONNX/WASM assets are split into 16 MiB files and assembled locally in the browser.

GitHub Actions verifies the source, prepared assets, unit tests, and build on pushes and pull requests. It does not hold deployment credentials or deploy automatically. To host elsewhere, update `wrangler.jsonc` with that account and route.

The AMR model, English segmentation model, runtime assets, and optional multilingual model are pinned and attributed in [Model Preparation](Model-Preparation.md) and [Third-Party Notices](../THIRD-PARTY-NOTICES.md).
