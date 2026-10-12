import {RELATIONS} from './semantic-codebook.js';
import manifest from './logic-vocabulary-manifest.json' with {type:'json'};

// These are compositional operators, pronouns and relations, never sentences.
// Indexes form part of profile 3 / vocabulary version 1 and must stay fixed.
export const BASE_LEXICON=[
 ['ONGOING',['prop'],'prop','The described event is in progress at the reference time; completion is not asserted.'],
 ['PERFECT',['prop'],'prop','The described event precedes the reference time and has current relevance.'],
 ['CONDITIONAL',['prop'],'prop','The content is conditional or hypothetical rather than an unconditional assertion.'],
 ['ACROSS',['entity','entity'],'prop','The first entity moves along a trajectory traversing the second place in the evaluation context.'],
 ['THROUGH',['entity','entity'],'prop','The first entity moves along a trajectory through the interior of the second place.'],
 ['DOWN',['entity','entity'],'prop','The first entity moves along or towards the lower end of the second path or place.'],
 ['AWAY',['entity'],'prop','The entity moves farther from the contextually salient location.'],
 ['TOWARD',['entity','entity'],'prop','The first entity moves in the direction of the second.'],
 ['IN',['entity','entity'],'prop','The first entity is located inside the second place.'],
 ['ON',['entity','entity'],'prop','The first entity is located on the second entity or surface.'],
 ['UNDER',['entity','entity'],'prop','The first entity is spatially below the second.'],
 ['OVER',['entity','entity'],'prop','The first entity is spatially above the second.'],
 ['BESIDE',['entity','entity'],'prop','The first entity is spatially next to the second.'],
 ['AT_PLACE',['entity','entity'],'prop','The first entity is situated at the second location.'],
 ['FROM',['entity','entity'],'prop','The first entity originates from the second entity or place.'],
 ['TO',['entity','entity'],'prop','The first entity has the second entity or place as its destination.'],
 ['WITH',['entity','entity'],'prop','The entities participate together in the contextually described situation.'],
 ['USING',['entity','entity'],'prop','The first entity uses the second as an instrument in the described situation.'],
 ['HAS',['entity','entity'],'prop','The first entity possesses the second.'],
 ['NAMED',['entity','text'],'prop','The entity has the exact supplied proper name.'],
 ['COUNT',['entity','nat'],'prop','The entity is a group with exactly the supplied number of members.'],
 ['PLURAL',['entity'],'prop','The referent is a plural group rather than a single individual.'],
 ['NEAR',['entity'],'prop','The referent is demonstratively near the utterance context.'],
 ['FAR',['entity'],'prop','The referent is demonstratively distant from the utterance context.'],
 ['WE',[],'entity','The speaker and contextually identified companions.'],
 ['HE',[],'entity','The contextually identified male third-person referent.'],
 ['SHE',[],'entity','The contextually identified female third-person referent.'],
 ['IT',[],'entity','The contextually identified nonpersonal third-person referent.'],
 ['THEY',[],'entity','The contextually identified plural or gender-neutral third-person referent.'],
 ['GREET',['entity','entity'],'prop','The first participant performs a greeting addressed to the second.'],
 ['THANK',['entity','entity'],'prop','The first participant expresses gratitude to the second.'],
 ['EVENT',['prop'],'entity','The contextually identified event described by the supplied proposition.'],
 ['BECAUSE',['prop','prop'],'prop','The first proposition holds because of the second; a causal or explanatory connection is asserted.'],
 ['WHEN',['prop','prop'],'prop','The first proposition holds at the time described by the second.'],
 ['WHILE',['prop','prop'],'prop','The first and second propositions hold during overlapping times.'],
 ['UNTIL',['prop','prop'],'prop','The first situation continues up to the onset of the second.'],
 ['AFTER',['prop','prop'],'prop','The first situation occurs after the second.'],
 ['BEFORE_P',['prop','prop'],'prop','The first situation occurs before the second.'],
 ['DESPITE',['prop','prop'],'prop','Both propositions hold; the second would normally provide a reason to expect the first not to hold.'],
 ['COUNTERFACTUAL',['prop','prop'],'prop','In the closest relevant worlds where the antecedent holds, the consequent holds; the antecedent is contrary to the shared factual context.'],
 ['MORE',['any','any'],'prop','The first value exceeds the second in the contextually identified ordering.'],
 ['LESS',['any','any'],'prop','The first value is smaller than the second in the contextually identified ordering.'],
 ['ROLE',['entity','entity','text'],'prop','The first entity has the supplied explicitly named semantic relation to the second.'],
];
for(const role of new Set([...RELATIONS,'polite','month','day','year','weekday','dayperiod','season','timezone','calendar','century','decade','frequency','duration','medium','li',...RELATIONS.filter(r=>!r.endsWith('-of')).map(r=>r+'-of')]))BASE_LEXICON.push(['R_'+role,['any','any'],'prop',`The first referent has the second referent as its AMR ${role} semantic relation. This relation is interpreted in the evaluation context.`]);
for(const key of ['date-entity','temporal-quantity','monetary-quantity','temperature-quantity','url-entity'])BASE_LEXICON.push([key,['entity'],'prop',`The referent is an AMR ${key}; its components are explicitly related using the semantic attributes.`]);
BASE_LEXICON.push(['ALONG',['entity','entity'],'prop','The first trajectory or place follows the length of the second reference place.'],['OUT_OF',['entity','entity'],'prop','The first trajectory leads from the interior to the exterior of the second place.'],['BEFORE_TIME',['entity','entity'],'prop','The first temporal region precedes the second temporal referent.'],['AFTER_TIME',['entity','entity'],'prop','The first temporal region follows the second temporal referent.'],['REGION',['function'],'entity','The contextually selected aggregate region or trajectory satisfying the supplied predicate.'],['SALIENT',[],'prop','The proposition salient in the current discourse context.']);
BASE_LEXICON.push(['THIS',[],'entity','The contextually identified demonstratively near referent.']);
BASE_LEXICON.push(['GROUP',['entity','entity'],'entity','The plural entity consisting of the first and second referents.']);
let entries=BASE_LEXICON.map(([key,types,result,definition],id)=>({id,key,label:key,types,result,definition,part:'x'})),byKey=new Map(entries.map(e=>[e.key,e])),byLemma=new Map(),loaded=false,pending;
export function installVocabulary(data){
 if(JSON.stringify(data?.operators)!==JSON.stringify(BASE_LEXICON))throw Error('Silex operator registry mismatch.');
 if(data?.version!==1||data.entries?.length!==manifest.entries)throw Error('Unsupported Silex lexical vocabulary.');
 const seen=new Set();entries=BASE_LEXICON.map(([key,types,result,definition],id)=>({id,key,label:key,types,result,definition,part:'x'}));byLemma=new Map();
 for(const row of data.entries){
  const [key,part,lemmas,definition,frames,ranks]=row;if(seen.has(key)||!['n','v','a','r','p'].includes(part)||typeof definition!=='string')throw Error('Invalid lexical vocabulary.');seen.add(key);
  const entry={id:entries.length,key,label:key,part,lemmas:lemmas.split('|'),definition,frames,ranks,result:'prop',roles:part==='p'?frames:null,types:['v','p'].includes(part)?null:[part==='r'?'prop':'entity']};entries.push(entry);
  for(const lemma of entry.lemmas){const list=byLemma.get(lemma)||[];list.push(entry);byLemma.set(lemma,list);}
 }
 byKey=new Map(entries.map(e=>[e.key,e]));loaded=true;return entries;
}
export const vocabularyManifest=manifest;
export const vocabularyReady=()=>loaded;
export const lexicalEntry=key=>byKey.get(key);
export const lexicalAt=id=>entries[id];
export const lexicalCount=()=>entries.length;
export function resolveLexical(n){
 const shared=lexicalEntry(n.key);if(shared)return shared;
 const local=n.lexical;
 if(!local||local.key!==n.key||!['n','v','a','r','x','p'].includes(local.part)||typeof local.definition!=='string'||local.definition.length<3||local.definition.length>600||!/^local:[\p{L}\p{N}_-]{1,80}$/u.test(local.key)||local.part==='x'&&(!Array.isArray(local.types)||!['entity','prop','nat','text','context','function','any'].includes(local.result)||local.types.some(t=>!['entity','prop','nat','text','context','function','any'].includes(t))))throw Error(`Unknown or ungrounded Silex predicate ${n.key}.`);
 if(local.part==='p'&&(!local.roles||Object.entries(local.roles).some(([k,v])=>!/^([0-5])$/.test(k)||v!=='ARG'+k)))throw Error('Invalid local frame roles.');
 return {...local,id:null,label:local.key,types:['v','p'].includes(local.part)?null:local.part==='x'?local.types:[local.part==='r'?'prop':'entity'],result:local.result||'prop'};
}
export function senses(lemma){const key=lemma.toLowerCase().replaceAll(' ','_');return [...(byLemma.get(key)||[])].sort((a,b)=>(a.ranks?.[key]??999999)-(b.ranks?.[key]??999999));}
export function lexicalSignatures(entry){
 if(entry.part!=='v')return [entry.types];
 if(!entry.frames?.length)return [['entity'],['entity','any'],['entity','any','any']];
 const signatures=[];
 for(const frame of entry.frames){
  // WordNet's published verb frames determine active complements. PP slots
  // are represented by separate compositional spatial/semantic relations.
  const types=[1,2,3,4,22,23].includes(frame)?['entity']:[14,15,16,17,18,19,31].includes(frame)?['entity','entity','entity']:[5,24,25,30].includes(frame)?['entity','entity','prop']:frame===34?['prop']:[6,7,26,28,29,32,33,35].includes(frame)?['entity','prop']:['entity','entity'];
  if(!signatures.some(s=>s.join()===types.join()))signatures.push(types);
 }
 return signatures;
}
export function lexicalTypes(entry,arity){
 if(entry.part==='p')return Array(arity).fill('any');
 if(entry.part==='v'){const options=lexicalSignatures(entry).filter(s=>s.length===arity);if(!options.length)throw Error(`${entry.key} does not have a ${arity}-argument signature.`);return options[0].map((t,i)=>options.every(s=>s[i]===t)?t:'any');}
 if(entry.types.length!==arity)throw Error(`${entry.key} requires ${entry.types.length} arguments.`);return entry.types;
}
export async function loadVocabulary(onProgress=()=>{}){
 if(loaded)return entries;if(pending)return pending;
 pending=(async()=>{
  onProgress('Loading the shared Silex vocabulary…');
  const url='/silex-converter/reference/Logic-Vocabulary.json';let cache=null;try{if(typeof caches!=='undefined')cache=await caches.open('silex-vocabulary-'+manifest.sha256);}catch{}
  let response=await cache?.match(url);if(!response)response=await fetch(url);if(!response.ok)throw Error('The shared Silex vocabulary could not be loaded.');
  const bytes=new Uint8Array(await response.arrayBuffer());const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  if(bytes.length!==manifest.bytes||digest!==manifest.sha256)throw Error('Silex vocabulary integrity check failed.');
  const result=installVocabulary(JSON.parse(new TextDecoder().decode(bytes)));try{await cache?.put(url,new Response(bytes,{headers:{'Content-Type':'application/json'}}));}catch{}return result;
 })();try{return await pending;}finally{pending=null;}
}
