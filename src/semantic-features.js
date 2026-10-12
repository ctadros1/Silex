// Shared grammatical distinctions, not sentence patterns. UDPipe learns the
// local det/aux dependencies; AMR remains the event/participant interpreter.
export const FEATURES={INDEFINITE:1,DEFINITE:2,ALL:3,NEAR:4,FAR:5,NEGATIVE:6,PAST:16,FUTURE:32,ONGOING:64,PERFECT:128,PLURAL:256,CONDITIONAL:512};
export function taggedSentences(conllu){
  return conllu.trim().split(/\n\s*\n/).map(group=>group.split('\n').filter(line=>/^\d+\t/.test(line)).map(line=>{
    const f=line.split('\t');return {id:Number(f[0]),form:f[1],lemma:f[2].toLowerCase(),pos:f[3],features:Object.fromEntries(f[5].split('|').filter(s=>s.includes('=')).map(s=>s.split('='))),head:Number(f[6]),relation:f[7]};
  }));
}
export function semanticFeatures(graph,tokens=[]){
  const flags=graph.nodes.map(()=>0),order=graph.nodes.map(()=>null),notes=[];
  const byLemma=new Map();graph.nodes.forEach((n,id)=>{const key=n.concept.replace(/-\d\d$/,'').toLowerCase();const ids=byLemma.get(key)||[];ids.push(id);byLemma.set(key,ids);});
  const tokenLemmas=new Map();for(const t of tokens){const a=tokenLemmas.get(t.lemma)||[];a.push(t);tokenLemmas.set(t.lemma,a);}
  function align(t){const candidates=byLemma.get(t.lemma);if(candidates?.length===1&&tokenLemmas.get(t.lemma)?.length===1)return candidates[0];return null;}
  for(const t of tokens){
    const id=align(t);if(id===null)continue;
    order[id]=t.id;
    if(['VERB','AUX'].includes(t.pos)){
      if(t.features.Tense==='Past'&&t.features.VerbForm==='Fin')flags[id]|=FEATURES.PAST;
      if(t.features.VerbForm==='Ger'||t.features.VerbForm==='Part'&&t.features.Tense==='Pres')flags[id]|=FEATURES.ONGOING;
      for(const aux of tokens.filter(a=>a.head===t.id&&a.relation.startsWith('aux'))){
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
  if(tokens.some(t=>t.pos==='DET'&&align(tokens.find(n=>n.id===t.head)||{lemma:''})===null))notes.push('Some determiner attachments could not be aligned unambiguously to the meaning graph.');
  return {flags,order,notes};
}
