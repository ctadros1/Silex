import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const source=process.argv[2]||'.parser-cache/meaning-model';
const output='.parser-cache/browser-model';
const sha=data=>createHash('sha256').update(data).digest('hex');
await mkdir(path.join(output,'shards'),{recursive:true});
const manifest={version:'meaning-model-v0.1.1',files:{}};
async function add(name,file,shard=false){
  const data=await readFile(file),record={bytes:data.length,sha256:sha(data)};
  if(shard){record.chunks=[];for(let at=0,i=0;at<data.length;at+=16*1024*1024,i++){
    const part=data.subarray(at,at+16*1024*1024),chunk=`shards/${name.replaceAll('/','_')}.${String(i).padStart(3,'0')}.bin`;
    await writeFile(path.join(output,chunk),part);record.chunks.push({path:chunk,bytes:part.length,sha256:sha(part)});
  }}else{await mkdir(path.dirname(path.join(output,name)),{recursive:true});await copyFile(file,path.join(output,name));}
  manifest.files[name]=record;
}
for(const name of (await readdir(source)).filter(n=>n!== 'checksums.json'&&/\.(json|txt)$/.test(n)))await add(name,path.join(source,name));
for(const name of ['encoder_model_quantized.onnx','decoder_model_merged_quantized.onnx'])await add(`onnx/${name}`,path.join(source,'onnx',name),true);
await add('english.udpipe','.parser-cache/english-ud-2.1.udpipe');
await add('document-tokenizer.mjs','.parser-cache/tokenizer-build/document-tokenizer.mjs');
await add('document-tokenizer.wasm','.parser-cache/tokenizer-build/document-tokenizer.wasm');
await add('ort-wasm-simd-threaded.jsep.mjs','node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs');
await add('ort-wasm-simd-threaded.jsep.wasm','node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm',true);
await writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await mkdir('models',{recursive:true});await writeFile('models/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared',Object.keys(manifest.files).length,'verified browser assets.');
