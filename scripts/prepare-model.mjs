import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const manifest=JSON.parse(await readFile('models/manifest.json','utf8'));
const root='.parser-cache/browser-model';await mkdir(root,{recursive:true});
const sha=data=>createHash('sha256').update(data).digest('hex');
const entries=Object.entries(manifest.files).flatMap(([name,r])=>r.chunks||[{path:name,...r}]);
for(const r of entries){
  const file=path.join(root,r.path);let cached;try{cached=await readFile(file);}catch{}
  if(cached?.length===r.bytes&&sha(cached)===r.sha256)continue;
  const response=await fetch(`https://github.com/ctadros1/Silex/releases/download/${manifest.version}/${path.basename(r.path)}`);
  if(!response.ok)throw Error(`Download failed: ${r.path} (${response.status})`);
  const data=Buffer.from(await response.arrayBuffer());if(data.length!==r.bytes||sha(data)!==r.sha256)throw Error(`Checksum mismatch: ${r.path}`);
  await mkdir(path.dirname(file),{recursive:true});await writeFile(file,data);console.log('Verified',r.path);
}
await writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
if(process.argv.includes('--native')){
  for(const [name,r] of Object.entries(manifest.files)){
    if(!name.endsWith('.json')&&!name.endsWith('.onnx'))continue;
    const file=path.join('.parser-cache/meaning-model',name);await mkdir(path.dirname(file),{recursive:true});
    if(r.chunks){const bytes=Buffer.concat(await Promise.all(r.chunks.map(c=>readFile(path.join(root,c.path)))));if(bytes.length!==r.bytes||sha(bytes)!==r.sha256)throw Error('Invalid assembled model.');await writeFile(file,bytes);}
    else await copyFile(path.join(root,name),file);
  }
}
