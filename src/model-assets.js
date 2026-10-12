export async function verifiedBytes(response,record){
  if(!response.ok)throw Error(`A model asset could not be downloaded (${response.status}). Try again when connected.`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  const hash=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
  if(bytes.length!==record.bytes||hash!==record.sha256)throw Error('A model download failed its integrity check.');
  return bytes;
}
export function createAssetLoader(base,manifest,onProgress=()=>{},fetcher=fetch){
  const cachePromise=globalThis.caches?.open(`silex-${manifest.version}`).catch(()=>null);
  const totals=new Map();
  return async name=>{
    const record=manifest.files[name];if(!record)throw Error(`Unknown model asset: ${name}`);
    const chunks=record.chunks||[{path:name,...record}],cache=await cachePromise;
    let loaded=0;const whole=new Uint8Array(record.bytes);
    for(const chunk of chunks){
      const url=new URL(chunk.path,base).href;
      // Reuse unchanged, hash-verified weights across tokenizer releases.
      let response,bytes;
      try{response=await cache?.match(url)||await globalThis.caches?.match(url);}catch{/* Browser storage may be unavailable. */}
      if(response){try{bytes=await verifiedBytes(response,chunk);}catch{try{await cache?.delete(url);}catch{/* Fetch a verified replacement. */}}}
      if(!bytes){bytes=await verifiedBytes(await fetcher(url),chunk);try{await cache?.put(url,new Response(bytes));}catch{/* Storage quota failure does not invalidate inference. */}}
      whole.set(bytes,loaded);loaded+=bytes.length;totals.set(name,loaded);
      onProgress({asset:name,loaded,total:record.bytes,completed:[...totals.values()].reduce((a,b)=>a+b,0)});
    }
    // Full digest binds chunk ordering and the virtual file as well.
    return verifiedBytes(new Response(whole),record);
  };
}
