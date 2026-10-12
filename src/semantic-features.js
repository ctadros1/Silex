import {lexicalEntry} from './logic-vocabulary.js';
// Shared grammatical distinctions, not sentence patterns. UDPipe learns the
// local det/aux dependencies; AMR remains the event/participant interpreter.
export const FEATURES={INDEFINITE:1,DEFINITE:2,ALL:3,NEAR:4,FAR:5,NEGATIVE:6,PAST:16,FUTURE:32,ONGOING:64,PERFECT:128,PLURAL:256,CONDITIONAL:512};
export function taggedSentences(conllu){
  return conllu.trim().split(/\n\s*\n/).map(group=>group.split('\n').filter(line=>/^\d+\t/.test(line)).map(line=>{
    const f=line.split('\t');return {id:Number(f[0]),form:f[1],lemma:f[2].toLowerCase(),pos:f[3],features:Object.fromEntries(f[5].split('|').filter(s=>s.includes('=')).map(s=>s.split('='))),head:Number(f[6]),relation:f[7]};
  }));
}
export function semanticFeatures(graph,tokens=[]){
  const flags=graph.nodes.map(()=>0),order=graph.nodes.map(()=>null),notes=[],nominals={};
  const byLemma=new Map();graph.nodes.forEach((n,id)=>{const key=n.concept.replace(/-\d\d$/,'').toLowerCase();const ids=byLemma.get(key)||[];ids.push(id);byLemma.set(key,ids);});
  const tokenLemmas=new Map();for(const t of tokens){const a=tokenLemmas.get(t.lemma)||[];a.push(t);tokenLemmas.set(t.lemma,a);}
  function align(t){
    const normalized=!byLemma.has(t.lemma)&&(t.lemma.endsWith('e')||/(.)\1$/.test(t.lemma))&&byLemma.has(t.lemma.slice(0,-1))?t.lemma.slice(0,-1):t.lemma;let candidates=byLemma.get(normalized);
    if(['NOUN','PROPN'].includes(t.pos)&&!candidates){const derived=graph.edges.filter(e=>/^ARG[0-5]-of$/.test(e.role)&&e.target.kind==='node'&&lexicalEntry('pb:'+graph.nodes[e.target.id].concept)?.roles?.[e.role[3]]?.split(/[^\p{L}]+/u).includes(t.lemma));if(derived.length===1)candidates=[derived[0].target.id];}
    if(candidates?.length!==1||tokenLemmas.get(t.lemma)?.length!==1)return null;const selected=candidates[0];
    if(['NOUN','PROPN'].includes(t.pos)&&/-\d\d$/.test(graph.nodes[selected].concept)){const incoming=graph.edges.filter(e=>/^ARG[0-5]-of$/.test(e.role)&&e.target.kind==='node'&&e.target.id===selected&&!/-\d\d$/.test(graph.nodes[e.source].concept));if(incoming.length===1){nominals[selected]=t.lemma;return incoming[0].source;}}return selected;
  }
  for(const t of tokens){
    const id=align(t);if(id===null)continue;
    order[id]=t.id;
    if(['VERB','AUX'].includes(t.pos)){
      if(t.features.Tense==='Past'&&t.features.VerbForm==='Fin')flags[id]|=FEATURES.PAST;
      // A learned tagger can label an irregular past form as an infinitive.
      // Repair only an inflected, non-s/non-ing lexical verb without a real auxiliary.
      const auxiliaries=tokens.filter(a=>a.head===t.id&&a.relation.startsWith('aux')&&['be','have','do','will','shall','can','may','must','should','would','could','might'].includes(a.lemma));
      if(t.pos==='VERB'&&t.features.VerbForm==='Inf'&&t.form.toLowerCase()!==t.lemma&&!/(s|ing)$/.test(t.form.toLowerCase())&&!auxiliaries.length)flags[id]|=FEATURES.PAST;
      if(t.features.VerbForm==='Ger'||t.features.VerbForm==='Part'&&t.features.Tense==='Pres')flags[id]|=FEATURES.ONGOING;
      for(const aux of auxiliaries){
        if(['will','shall','wo'].includes(aux.form.toLowerCase())&&['will','shall'].includes(aux.lemma))flags[id]|=FEATURES.FUTURE;
        if(aux.form.toLowerCase()==='would')flags[id]|=FEATURES.CONDITIONAL;
        if(aux.lemma==='be'&&t.features.VerbForm==='Part'&&t.features.Tense==='Pres')flags[id]|=FEATURES.ONGOING;
        if(aux.lemma==='have')flags[id]|=FEATURES.PERFECT;
        if(['be','have','do'].includes(aux.lemma)&&aux.features.Tense==='Past'&&aux.features.VerbForm==='Fin')flags[id]|=FEATURES.PAST;
      }
    }
    if(['NOUN','PROPN'].includes(t.pos)){
      if(t.features.Number==='Plur')flags[id]|=FEATURES.PLURAL;
      const det=tokens.find(a=>a.head===t.id&&a.relation==='det');
      if(det){const q={a:1,an:1,the:2,every:3,each:3,all:3,this:4,these:4,that:5,those:5,no:6}[det.lemma];if(q)flags[id]=(flags[id]&~7)|q;else notes.push(`The determiner ${det.form} is outside the compact annotation inventory.`);}
    }
  }
  for(const det of tokens.filter(t=>t.pos==='DET')){const head=tokens.find(t=>t.id===det.head),id=head?align(head):null;if(id!==null&&!/-\d\d$/.test(graph.nodes[id].concept))continue;const noun=tokens.filter(t=>t.id>det.id&&t.id<=det.id+3&&t.pos==='NOUN'&&align(t)!==null&&!/-\d\d$/.test(graph.nodes[align(t)].concept)).sort((a,b)=>a.id-b.id)[0];const q={a:1,an:1,the:2,every:3,each:3,all:3,this:4,these:4,that:5,those:5,no:6}[det.lemma];if(noun&&q){const target=align(noun);flags[target]=(flags[target]&~7)|q;notes.push('A determiner attachment was repaired using the following aligned nominal participant.');}}
  if(tokens.some(t=>t.pos==='DET'&&align(tokens.find(n=>n.id===t.head)||{lemma:''})===null))notes.push('Some determiner attachments could not be aligned unambiguously to the meaning graph.');
  return {flags,order,notes,nominals};
}
