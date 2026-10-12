import {build} from 'esbuild';
import {mkdir,readFile,writeFile,cp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const output=path.join(root,'dist','silex-converter');
// This directory contains this build's disposable output only.
await rm(path.join(root,'dist'),{recursive:true,force:true});await mkdir(path.join(output,'assets'),{recursive:true});
await build({absWorkingDir:root,entryPoints:{app:'src/app.js','ai-worker':'src/ai-worker.js','meaning-worker':'src/meaning-worker.js'},outdir:path.join(output,'assets'),bundle:true,splitting:true,format:'esm',platform:'browser',target:['chrome121','safari18'],minify:true,chunkNames:'chunks/[name]-[hash]',logLevel:'info'});
await cp(path.join(root,'.parser-cache','browser-model'),path.join(output,'models','meaning-model'),{recursive:true});
await cp(path.join(root,'src','index.html'),path.join(output,'index.html'));
await cp(path.join(root,'src','style.css'),path.join(output,'assets','style.css'));
await cp(path.join(root,'reference'),path.join(output,'reference'),{recursive:true});
await writeFile(path.join(root,'dist','_headers'),`/silex-converter/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: SAMEORIGIN
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co https://*.xethub.hf.co https://raw.githubusercontent.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'self'
  Cache-Control: public, max-age=0, must-revalidate
`);
console.log('Built browser-only Silex converter.');
