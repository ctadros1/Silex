import {parseAmrSerial} from './meaning-graph.js';
import {semanticFeatures} from './semantic-features.js';
// A request-local optimization of model work, not an authored sentence table.
// Occurrences remain separate; no user text is persisted in model-file caches.
export async function interpretStatements(sources,tagged,generate,onStage=()=>{}){
  const cache=new Map(),parts=[];
  for(let i=0;i<sources.length;i++){
    const key=sources[i].trim(),cached=cache.has(key);onStage({index:i,total:sources.length,cached});
    const graph=cached?cache.get(key):parseAmrSerial(await generate(key,i));cache.set(key,graph);
    parts.push({graph,features:semanticFeatures(graph,tagged[i]),source:sources[i],tokens:tagged[i]});
  }
  return parts;
}
