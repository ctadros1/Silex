# Deployment

The converter is a separate static-assets Cloudflare Worker named `silex-converter`. Its single route is `project.christiantadros.com/silex-converter*`, on the `christiantadros.com` zone. Assets live at `dist/silex-converter/`, preserving the prefix for scripts, workers, styles, and reference files. HTML handling redirects the bare path to its trailing-slash directory; the canonical identifies the requested base path.

The project subdomain is already a Custom Domain for SortLab. Worker routes take priority for matching paths; the Silex route leaves `/sortlab/` and the root redirect alone. No DNS record, hostname ownership, redirect rule, personal-site source, CMS binding, or existing Worker is replaced.

There are no runtime bindings, secrets, databases, buckets, upload handlers, or inference endpoints. Caching of model files occurs in the browser. The default hosting limits/plan still apply to static assets; this design creates no server storage for visitors' images.

Run `npm ci`, `npm test`, and `npm run build` before `npx wrangler deploy`. Source changes are published to the public `ctadros1/Silex` repository. GitHub Actions tests and builds the converter on pushes and pull requests; it does not hold deployment credentials or automatically deploy.

Model weights are pinned to Hugging Face revision `44b42469f9e192814bfd90440e3b377d89ba7a13`. The compiled model library is pinned to binary-mlc-llm-libs revision `00fe7a40e57e5e8eb9fef87526a4bf28ad5846c0`. The inference runtime and build/deploy dependencies are pinned in the lockfile.
