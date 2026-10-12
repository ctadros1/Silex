import {encodeMeaningDocument} from './meaning-graph.js';
let worker,active,sequence=0;
export function cancel(){worker?.terminate();worker=null;active?.reject(new Error('Translation stopped.'));active=null;}
export function analyze(text,language='en',onProgress=()=>{},original=null){
  if(active)throw Error('A meaning translation is already running.');
  if(!text.trim()||text.length>1200)throw Error('Enter up to 1,200 characters.');
  worker??=new Worker(new URL('./meaning-worker.js',import.meta.url),{type:'module'});
  const id=++sequence;
  return new Promise((resolve,reject)=>{
    active={id,reject};
    worker.onerror=event=>{cancel();reject(new Error(event.message||'The local meaning parser could not start.'));};
    worker.onmessage=event=>{
      const data=event.data;if(data.type==='progress'){onProgress(data);return;}if(data.id!==active?.id)return;
      active=null;
      if(data.type==='error'){worker.terminate();worker=null;reject(new Error(data.message));return;}
      try{resolve({ast:encodeMeaningDocument(data.parts,language,original),method:'Trained on-device meaning parser',assumptions:[...data.parts.flatMap(p=>p.graph.warnings||[]),'This is the model’s AMR interpretation. AMR does not fully formalize tense, articles, or quantifier scope; the image also preserves every source word and punctuation piece for review.']});}catch(e){reject(e);}
    };
    worker.postMessage({id,text});
  });
}
