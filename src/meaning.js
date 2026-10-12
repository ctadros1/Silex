import {semanticFeatures} from './semantic-features.js';
import {compileScopedMeaning,unresolvedConcepts,groundSourcePredicates} from './scoped-compiler.js';
import {loadVocabulary} from './logic-vocabulary.js';
import * as ai from './ai.js';
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
      (async()=>{await loadVocabulary(stage=>onProgress({stage,detail:'Loading shared predicate definitions.'}));for(const part of data.parts)if(part.tokens)part.features=semanticFeatures(part.graph,part.tokens);groundSourcePredicates(data.parts);for(const part of data.parts)if(part.tokens)part.features=semanticFeatures(part.graph,part.tokens);const unknown=unresolvedConcepts(data.parts);const definitions=unknown.length?await ai.defineConcepts(unknown,text,onProgress):[];return compileScopedMeaning(data.parts,definitions);})().then(resolve,reject);
    };
    worker.postMessage({id,text});
  });
}
