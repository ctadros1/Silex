import {BartTokenizer,AutoModelForSeq2SeqLM,Text2TextGenerationPipeline,env,TextStreamer} from '@huggingface/transformers';
import {parseAmrSerial} from './meaning-graph.js';
import {documentSegments} from './document-segments.js';
import {createAssetLoader} from './model-assets.js';
let parser,tokenizer,loadAssets,ready;
const base=new URL('../models/meaning-model/',import.meta.url);
function progress(detail){self.postMessage({type:'progress',...detail});}
async function initialize(){
  if(ready)return ready;
  ready=(async()=>{
    const response=await fetch(new URL('manifest.json',base));if(!response.ok)throw Error('The meaning model is unavailable.');
    const manifest=await response.json();
    const expected=['ort-wasm-simd-threaded.jsep.wasm','document-tokenizer.wasm','english.udpipe','tokenizer.json','tokenizer_config.json','config.json','generation_config.json','onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx'];
    const totalBytes=expected.reduce((n,name)=>n+manifest.files[name].bytes,0);
    loadAssets=createAssetLoader(base,manifest,p=>progress({stage:'Loading the meaning model on this device…',detail:`${(p.completed/1000000).toFixed(1)} of ${(totalBytes/1000000).toFixed(1)} MB checked${p.completed>=totalBytes?' · Starting the local parser…':''}`,download:{...p,totalBytes}}));
    env.allowRemoteModels=false;env.allowLocalModels=true;env.localModelPath=new URL('../models/',import.meta.url).href;
    env.backends.onnx.wasm.numThreads=self.crossOriginIsolated?Math.min(4,Math.max(1,(navigator.hardwareConcurrency||2)-1)):1;
    console.info(`Silex meaning parser: ${env.backends.onnx.wasm.numThreads} CPU threads.`);
    env.backends.onnx.wasm.wasmBinary=await loadAssets('ort-wasm-simd-threaded.jsep.wasm');
    env.backends.onnx.wasm.wasmPaths={mjs:new URL('ort-wasm-simd-threaded.jsep.mjs',base).href};
    env.fetch=async (input,options)=>{
      const url=String(input);const relative=url.startsWith(base.href)?url.slice(base.href.length):null;
      if(relative&&manifest.files[relative])return new Response(await loadAssets(relative),{headers:{'Content-Type':relative.endsWith('.json')?'application/json':'application/octet-stream'}});
      if(!url.startsWith(base.href))throw Error('The meaning parser requested an undeclared remote asset.');
      return fetch(input,options);
    };
    // The generated module has no dynamic JS evaluation. Only its own WASM runs.
    const {default:createTokenizer}=await import(/* @vite-ignore */ new URL('document-tokenizer.mjs',base).href);
    tokenizer=await createTokenizer({wasmBinary:await loadAssets('document-tokenizer.wasm')});
    tokenizer.FS.writeFile('/english.udpipe',await loadAssets('english.udpipe'));
    if(!tokenizer.initModel('/english.udpipe'))throw Error('The document tokenizer could not load.');
    // Load explicit components: generic repository discovery cannot infer the
    // locally assembled virtual ONNX files served by this static deployment.
    const [model,modelTokenizer]=await Promise.all([
      AutoModelForSeq2SeqLM.from_pretrained('meaning-model',{dtype:'q8',device:'wasm'}),
      Promise.all([loadAssets('tokenizer.json'),loadAssets('tokenizer_config.json')]).then(([data,config])=>new BartTokenizer(JSON.parse(new TextDecoder().decode(data)),JSON.parse(new TextDecoder().decode(config))))
    ]);
    parser=new Text2TextGenerationPipeline({task:'text2text-generation',model,tokenizer:modelTokenizer});
    progress({stage:'Meaning model ready.',detail:'Downloaded files are cached on this device.'});
  })();return ready;
}
self.onmessage=async event=>{
  const {id,text}=event.data;
  try{
    await initialize();
    const sources=documentSegments(text,tokenizer.segmentDocument(text)),parts=[];
    for(let i=0;i<sources.length;i++){
      progress({stage:`Interpreting statement ${i+1} of ${sources.length}…`,detail:'A trained meaning parser is building concepts and their relations.',sentence:i+1,total:sources.length});
      let tokens=0;
      const streamer=new TextStreamer(parser.tokenizer,{skip_prompt:true,skip_special_tokens:true,callback_function:()=>{if(++tokens%8===0)progress({stage:`Interpreting statement ${i+1} of ${sources.length}…`,detail:`${tokens} generated pieces · working on this device`});}});
      const result=await parser(sources[i].trim(),{max_new_tokens:1024,num_beams:1,do_sample:false,streamer});
      parts.push({source:sources[i],graph:parseAmrSerial(result[0].generated_text.trim())});
    }
    self.postMessage({type:'result',id,parts});
  }catch(error){console.error('Silex meaning worker:',error.stack);self.postMessage({type:'error',id,message:error.message});}
};
