import {node,encode,validate} from './codec.js';
import {p,v,bind,compilePlan,text} from './semantic-plan.js';
import {FRAMES,NOUNS} from './semantic-codebook.js';
import {compileNativeGraph,statementDocument} from './semantic-compiler.js';
import {lexicalEntry,senses,resolveLexical} from './logic-vocabulary.js';
import {validateSemantic} from './language.js';
const conjunction=terms=>terms.length?terms.reduce((a,b)=>p('AND',a,b)):p('TRUE');
const lex=(key,...args)=>({op:'LEX',key,args});
const constants={i:'ME',you:'YOU',water:'WATER'};
const pronouns={we:'WE',he:'HE',she:'SHE',it:'IT',they:'THEY',this:'THIS'};
const spatial={across:'ACROSS',through:'THROUGH',down:'DOWN',toward:'TOWARD',away:'AWAY',in:'IN',on:'ON',under:'UNDER',over:'OVER',beside:'BESIDE',to:'TO',from:'FROM',along:'ALONG','out-of':'OUT_OF',before:'BEFORE_TIME',after:'AFTER_TIME'};
export function unresolvedConcepts(parts){
 const missing=new Map();for(const {graph} of parts)for(const n of graph.nodes){const c=n.concept;if(constants[c]||pronouns[c]||NOUNS[c]||FRAMES[c]||['and','or','name','every','each','all','amr-unknown'].includes(c)||spatial[c]||lexicalEntry('pb:'+c)||lexicalEntry(c)||senses(c).length||['everyone','everybody','something','anything'].includes(c))continue;const prior=missing.get(c);missing.set(c,{lemma:c,part:/-\d\d$/.test(c)?'v':'n',roles:[...new Set([...(prior?.roles||[]),...graph.edges.flatMap(e=>e.source===graph.nodes.indexOf(n)&&/^ARG[0-5]$/.test(e.role)?[e.role]:e.target.kind==='node'&&e.target.id===graph.nodes.indexOf(n)&&/^ARG[0-5]-of$/.test(e.role)?[e.role.slice(0,4)]:[])])].sort()});}return [...missing.values()];
}
export function groundSourcePredicates(parts){
 for(const part of parts){const tokens=part.tokens||[],verbs=tokens.filter(t=>t.pos==='VERB'&&!['be','do','have'].includes(t.lemma)).map(t=>({...t,lemma:!senses(t.lemma).some(e=>e.part==='v')&&(t.lemma.endsWith('e')||/(.)\1$/.test(t.lemma))&&senses(t.lemma.slice(0,-1)).some(e=>e.part==='v')?t.lemma.slice(0,-1):t.lemma})),frames=part.graph.nodes.map((n,id)=>({n,id,stem:n.concept.replace(/-\d\d$/,'')})).filter(x=>/-\d\d$/.test(x.n.concept));
  const matched=t=>frames.some(x=>x.stem===t.lemma||senses(t.lemma).some(e=>e.lemmas?.includes(x.stem)));const source=verbs.filter(t=>!matched(t)&&!senses(t.lemma).some(e=>e.part==='v')),unmatched=frames.filter(x=>!verbs.some(t=>x.stem===t.lemma||senses(t.lemma).some(e=>e.lemmas?.includes(x.stem)))&&!part.features?.nominals?.[x.id]);
  if(source.length===1&&unmatched.length===1){const original=unmatched[0].n.concept;unmatched[0].n.concept=source[0].lemma+'-01';part.graph.warnings.push(`The unmatched predicate ${original} was grounded in the source verb ${source[0].lemma}; its interpreted roles were retained.`);}
 }return parts;
}
/** Meaning nodes are compile-time inputs only. Images contain scoped predicates,
 * lexical sense indexes and bound references; no graph records or node IDs. */
export function compileScopedGraph(graph,features={flags:[],notes:[]},definitions=[]){
 const consumed=new Set(),visited=new Set(),active=new Set(),out=id=>graph.edges.filter(e=>e.source===id),flags=id=>features.flags?.[id]||0;
 const local=new Map(definitions.map(e=>[e.key.replace(/^local:/,''),e]));
 function predicate(concept,args,slots=[],preferred='n'){
  const pb=lexicalEntry('pb:'+concept);if(pb)return {op:'LEX',key:pb.key,slots,args};
  if(pronouns[concept]&&args.length===1)return p('EQ',args[0],lex(pronouns[concept]));const direct=lexicalEntry(concept);if(direct)return lex(direct.key,...args);if(['everyone','everybody'].includes(concept))return p('PERSON',...args);if(['something','anything','amr-unknown'].includes(concept))return p('TRUE');const native=NOUNS[concept];if(native&&native!=='WATER')return p(native,...args);
  const adverb=senses(concept).find(e=>e.part==='r');if(adverb&&args.length===1&&args[0].op==='LEX'&&args[0].key==='EVENT')return lex(adverb.key,args[0].args[0]);
  const entry=senses(concept).find(e=>e.part===preferred)||senses(concept).find(e=>e.part==='a')||senses(concept).find(e=>e.part==='n')||senses(concept)[0];
  if(entry)return lex(entry.key,...args);
  const descriptor=local.get(concept);if(descriptor)return {op:'LEX',key:descriptor.key,lexical:descriptor,args,...(descriptor.part==='p'?{slots}: {})};
  throw Error(`The concept ${concept} needs a grounded lexical definition.`);
 }
 function value(target,env,k){
  if(target.kind==='node')return entity(target.id,env,k);
  const n=target.type==='number'&&/^(0|[1-9]\d*)$/.test(String(target.value))?{op:'NAT',value:String(target.value),args:[]}:text(String(target.value));return k(n,env);
 }
 function property(id,subject,env,slot=null){
  visited.add(id);const concept=graph.nodes[id].concept;
  if(features.nominals?.[id]&&!out(id).length)return predicate(features.nominals[id],[subject]);
  if(/-\d\d$/.test(concept))return proposition(id,env,{subject,slot});
  const terms=[predicate(concept,[subject],[],'a')];
  for(const e of out(id)){if(consumed.has(e))continue;consumed.add(e);if(/^ARG[0-5]-of$/.test(e.role)&&e.target.kind==='node'){terms.push(property(e.target.id,subject,env,Number(e.role[3])));continue;}if(e.role==='mod'&&e.target.kind==='node'){terms.push(property(e.target.id,subject,env));continue;}if(e.role==='polarity'&&e.target.value==='-'){terms[0]=p('NOT',terms[0]);continue;}terms.push(value(e.target,env,t=>lex('R_'+e.role,subject,t)));}
  return conjunction(terms);
 }
 function restriction(id,name,env){
  const c=graph.nodes[id].concept,subject=v(name),terms=[];visited.add(id);
  if(pronouns[c])terms.push(p('EQ',subject,lex(pronouns[c])));else if(constants[c])terms.push(p('EQ',subject,p(constants[c])));else terms.push(predicate(c,[subject]));
  for(const e of out(id)){
   if(consumed.has(e))continue;consumed.add(e);const target=e.target.kind==='node'?graph.nodes[e.target.id].concept:null;
   if(e.role==='name'&&target==='name'){
    visited.add(e.target.id);const ops=out(e.target.id).filter(x=>/^op\d+$/.test(x.role)).sort((a,b)=>Number(a.role.slice(2))-Number(b.role.slice(2)));for(const op of ops)consumed.add(op);terms.push(lex('NAMED',subject,text(ops.map(x=>x.target.value).join(' '))));
   }else if(e.role==='mod'&&['every','each','all'].includes(target)){visited.add(e.target.id);}
   else if(e.role==='mod'||/^ARG\d-of$/.test(e.role)){
    if(target==='amr-unknown'){visited.add(e.target.id);continue;}if(e.target.kind==='node'&&active.has(e.target.id))continue;
    if(e.target.kind==='node')terms.push(property(e.target.id,subject,env,/^ARG\d-of$/.test(e.role)?Number(e.role[3]):null));else terms.push(lex('R_mod',subject,text(String(e.target.value))));
   }else if(e.role==='quant'&&e.target.kind==='value'&&/^(0|[1-9]\d*)$/.test(String(e.target.value)))terms.push(lex('COUNT',subject,{op:'NAT',value:String(e.target.value),args:[]}));
   else if(e.role==='polarity'&&e.target.value==='-')terms[0]=p('NOT',terms[0]);
   else terms.push(value(e.target,env,t=>lex('R_'+e.role,subject,t)));
  }
  const f=flags(id);if(f&256)terms.push(lex('PLURAL',subject));if((f&7)===4)terms.push(lex('NEAR',subject));if((f&7)===5)terms.push(lex('FAR',subject));return conjunction(terms);
 }
 function entity(id,env,k){
  visited.add(id);if(env.has(id))return k(env.get(id),env);
  const c=graph.nodes[id].concept;
  if(/-\d\d$/.test(c))return k(lex('EVENT',proposition(id,env)),env);
  if(constants[c]&&!out(id).length)return k(p(constants[c]),env);
  if(pronouns[c]&&!out(id).length)return k(lex(pronouns[c]),env);
  const relationAnchor=spatial[c]&&out(id).find(e=>/^op\d+$/.test(e.role));if(relationAnchor){consumed.add(relationAnchor);const name='region'+id;return value(relationAnchor.target,env,(anchor,next)=>{const terms=[lex(spatial[c],v(name),anchor)];for(const extra of out(id))if(extra!==relationAnchor){consumed.add(extra);terms.push(value(extra.target,next,t=>lex('R_'+extra.role,v(name),t)));}return k(lex('REGION',bind('LAM',name,conjunction(terms))),next);});}
  if(['and','or'].includes(c)){
   const es=out(id).filter(e=>/^op\d+$/.test(e.role)).sort((a,b)=>Number(a.role.slice(2))-Number(b.role.slice(2)));if(es.length<2)throw Error('Incomplete entity coordination.');es.forEach(e=>consumed.add(e));
   function group(i,values,scope){return i===es.length?k(values.reduce((a,b)=>lex('GROUP',a,b)),scope):value(es[i].target,scope,(t,next)=>group(i+1,[...values,t],next));}return group(0,[],env);
  }
  const name='n'+id,next=new Map(env);next.set(id,v(name));const r=restriction(id,name,next),q=flags(id)&7,universal=['everyone','everybody'].includes(c)||q===3||out(id).some(e=>e.role==='mod'&&e.target.kind==='node'&&['every','each','all'].includes(graph.nodes[e.target.id].concept));
  if(q===2||q===4||q===5||out(id).some(e=>e.role==='name'))return bind('LET',name,bind('THE',name,r),k(v(name),next));
  const result=bind(universal?'ALL':'SOME',name,r,k(v(name),next));return q===6?p('NOT',result):result;
 }
 function temporal(n,id){const f=flags(id);if(f&64)n=lex('ONGOING',n);if(f&128)n=lex('PERFECT',n);if(f&512)n=lex('CONDITIONAL',n);if(f&16)n=p('PAST',n);if(f&32)n=p('FUTURE',n);return n;}
 function proposition(id,env=new Map(),injected=null){
  if(active.has(id))throw Error('This cyclic event reference needs an explicit interpretation.');active.add(id);visited.add(id);
  const c=graph.nodes[id].concept,es=out(id);let result;
  if(['and','or'].includes(c)){
   const ops=es.filter(e=>/^op\d+$/.test(e.role)).sort((a,b)=>Number(a.role.slice(2))-Number(b.role.slice(2)));ops.forEach(e=>consumed.add(e));const roots=new Set(ops.map(e=>e.target.id)),counts=new Map();for(const edge of graph.edges)if(roots.has(edge.source)&&/^ARG[0-5]$/.test(edge.role)&&edge.target.kind==='node'){const id=edge.target.id;if(!/-\d\d$/.test(graph.nodes[id].concept)&&!constants[graph.nodes[id].concept]&&!pronouns[graph.nodes[id].concept])counts.set(id,(counts.get(id)||0)+1);}const shared=[...counts].filter(([,count])=>count>1).map(([id])=>id).sort((a,b)=>(features.order?.[a]??a)-(features.order?.[b]??b));
   function coordinate(i,scope){return i<shared.length?entity(shared[i],scope,(_,next)=>coordinate(i+1,next)):ops.map(e=>proposition(e.target.id,scope)).reduce((a,b)=>p(c==='and'?'AND':'OR',a,b));}result=coordinate(0,env);
  }else if(!/-\d\d$/.test(c)&&!injected){const domain=es.find(e=>e.role==='domain');if(domain){consumed.add(domain);result=value(domain.target,env,x=>property(id,x,env));}else if(!es.length&&senses(c).some(e=>e.part==='r'))result=lex(senses(c).find(e=>e.part==='r').key,lex('SALIENT'));else result=entity(id,env,x=>p('TRUE'));}
  else{
   const pb=lexicalEntry('pb:'+c),argumentsList=es.filter(e=>/^ARG[0-5]$/.test(e.role));argumentsList.forEach(e=>consumed.add(e));
   if(injected){const slot=injected.slot??(FRAMES[c]?.length===2?Number(FRAMES[c][1].slice(3)):Object.keys(pb?.roles||{}).map(Number).sort((a,b)=>a-b)[0]??1);if(!argumentsList.some(e=>e.role==='ARG'+slot))argumentsList.push({role:'ARG'+slot,target:{kind:'plan',plan:injected.subject}});}
   argumentsList.sort((a,b)=>Number(a.role.slice(3))-Number(b.role.slice(3)));const positions=argumentsList.map(e=>Number(e.role.slice(3)));
   const pathModifiers=[];for(const [index,e] of argumentsList.entries()){if(e.target.kind!=='node'||!/path|route/i.test(pb?.roles?.[positions[index]]||''))continue;for(const direction of out(e.target.id)){const concept=direction.target.kind==='node'?graph.nodes[direction.target.id].concept:null;if(direction.role==='direction'&&spatial[concept]&&!out(direction.target.id).length){consumed.add(direction);visited.add(direction.target.id);pathModifiers.push({index,head:spatial[concept]});}}}
   function compose(i,args,scope){
    if(i<argumentsList.length){const e=argumentsList[i];if(e.target.kind==='plan')return compose(i+1,[...args,e.target.plan],scope);const clause=['KNOW','BELIEVE','WANT','SAY','PROVE'].includes(FRAMES[c]?.[0])&&e.role==='ARG1'||['POSSIBLE','NECESSARY'].includes(FRAMES[c]?.[0]);if(clause&&e.target.kind==='node')return compose(i+1,[...args,proposition(e.target.id,scope)],scope);return value(e.target,scope,(t,next)=>compose(i+1,[...args,t],next));}
    if(!args.length&&injected)args=[injected.subject];
    const native=FRAMES[c],expected=native?.slice(1);let base=native&&expected.length===positions.length&&expected.every((role,i)=>role==='ARG'+positions[i])?p(native[0],...args):predicate(c,args,positions);
    scope=new Map(scope);scope.set(id,lex('EVENT',base));
    const actorIndex=argumentsList.findIndex(a=>a.role==='ARG0');const mover=actorIndex>=0?args[actorIndex]:args[0];const conditions=[];const mods=pathModifiers.map(m=>lex(m.head,mover,args[m.index]));
    for(const e of es){if(consumed.has(e))continue;consumed.add(e);const target=e.target.kind==='node'?graph.nodes[e.target.id].concept:null;
     if(e.target.kind==='node'&&senses(target).some(s=>s.part==='r')&&!out(e.target.id).length&&['time','manner','degree','mod'].includes(e.role)){visited.add(e.target.id);base=lex(senses(target).find(s=>s.part==='r').key,base);continue;}
     if(/^ARG[0-5]-of$/.test(e.role)&&e.target.kind==='node'){base=conjunction([base,property(e.target.id,lex('EVENT',base),scope,Number(e.role[3]))]);continue;}
     if(e.role==='polarity'&&target==='amr-unknown'){visited.add(e.target.id);continue;}if(e.role==='polarity'&&e.target.value==='-'){base=p('NOT',base);continue;}
     if(e.role==='mode'&&e.target.value==='interrogative'){continue;}
     if(['condition','cause','concession','time'].includes(e.role)&&e.target.kind==='node'&&/-\d\d$/.test(target)){const other=proposition(e.target.id,scope);conditions.push({role:e.role,other});continue;}
     const actor=argumentsList.findIndex(a=>a.role==='ARG0');const moving=actor>=0?args[actor]:args[0];
     if(['path','direction'].includes(e.role)&&spatial[target]&&e.target.kind==='node'){
      visited.add(e.target.id);const children=out(e.target.id);if(target==='away'&&!children.length){mods.push(lex('AWAY',moving));continue;}
      const dest=children.find(x=>/^op\d+$/.test(x.role));if(dest){consumed.add(dest);mods.push(value(dest.target,scope,t=>target==='away'?conjunction([lex('AWAY',moving),lex('FROM',moving,t)]):lex(spatial[target],moving,t)));for(const extra of children)if(extra!==dest)throw Error('A spatial construction has an additional modifier requiring review.');continue;}
     }
     mods.push(value(e.target,scope,t=>lex('R_'+e.role,lex('EVENT',base),t)));
    }
    let result=temporal(conjunction([base,...mods]),id);for(const {role,other} of conditions)result=role==='condition'?p('IF',other,result):lex({cause:'BECAUSE',concession:'DESPITE',time:'WHEN'}[role],result,other);return result;
   }
   result=compose(0,[],env);
  }
  for(const e of es){if(consumed.has(e))continue;consumed.add(e);const target=e.target.kind==='node'?graph.nodes[e.target.id].concept:null;if(e.role==='polarity'&&e.target.value==='-')result=p('NOT',result);else if(e.target.kind==='node'&&senses(target).some(s=>s.part==='r')&&!out(e.target.id).length){visited.add(e.target.id);result=lex(senses(target).find(s=>s.part==='r').key,result);}else result=conjunction([result,value(e.target,env,t=>lex('R_'+e.role,lex('EVENT',result),t))]);}
  if(!/-\d\d$/.test(c))result=temporal(result,id);
  if(es.some(e=>e.role==='mode'&&e.target.value==='interrogative'))result=p('ASK',result);active.delete(id);return result;
 }
 let plan,environment=new Map();const unknown=graph.nodes.map((n,id)=>({n,id})).filter(({n})=>n.concept==='amr-unknown');const polar=unknown.filter(({id})=>graph.edges.some(e=>e.role==='polarity'&&e.target.kind==='node'&&e.target.id===id));const questions=unknown.filter(x=>!polar.includes(x));if(questions.length>1)throw Error('Multiple simultaneous question variables need explicit scope.');if(questions.length){const id=questions[0].id,parent=graph.edges.find(e=>e.role==='mod'&&e.target.kind==='node'&&e.target.id===id),referent=parent?.source??id;environment.set(referent,v('answer'));if(parent){consumed.add(parent);visited.add(id);}plan=proposition(graph.root,environment);if(referent!==id)plan=conjunction([restriction(referent,'answer',environment),plan]);plan=p('ASK',bind('LAM','answer',plan));}else{plan=proposition(graph.root,environment);if(polar.length)plan=p('ASK',plan);}
 const ast=compilePlan(plan);validateSemantic(ast);validate(ast);encode(ast);
 if(consumed.size!==graph.edges.length||visited.size!==graph.nodes.length)throw Error('The scoped compiler did not retain every interpreted concept and relation.');
 return {ast,consumed:consumed.size,concepts:visited.size};
}
export function compileScopedMeaning(parts,definitions=[]){
 const compiled=parts.map(part=>{const native=['and','or'].includes(part.graph.nodes[part.graph.root].concept)?{ast:null}:compileNativeGraph(part.graph,part.features);return native.ast?{...native,concepts:part.graph.nodes.length,consumed:part.graph.edges.length}:compileScopedGraph(part.graph,part.features,definitions);});
 return {ast:statementDocument(compiled.map(p=>p.ast)),method:'Scoped Silex semantics',nativeStatements:compiled.filter(p=>p.native).length,statements:parts.length,assumptions:[...new Set(parts.flatMap(p=>[...(p.graph.warnings||[]),...(p.features?.notes||[])])),'The learned parser chooses an interpretation. Review sense definitions, scope and the literal reading. Source wording and graph records are not included.'],coverage:compiled.map(p=>({concepts:p.concepts,relations:p.consumed}))};
}
