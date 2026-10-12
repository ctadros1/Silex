import {node,encode,notation,validate} from './codec.js';
import {p,v,bind,compilePlan} from './semantic-plan.js';
import {FRAMES,NOUNS} from './semantic-codebook.js';
import {encodeCompactGraphs,decodeCompactGraphs} from './compact-graph.js';
import {literalGraphReading} from './meaning-graph.js';
import {literalEnglish,knownReading,validateSemantic} from './language.js';
const stop=reason=>{throw Error(reason);};
const combine=(op,terms)=>terms.reduce((a,b)=>p(op,a,b));

// Compile semantic constructions, not English sentences. Native output is
// accepted only if every graph node/edge and supported feature was consumed.
export function compileNativeGraph(graph,features={flags:[],notes:[]}){
  const consumed=new Set(),visited=new Set(),active=new Set();
  const outgoing=id=>graph.edges.filter(e=>e.source===id);
  const flags=id=>features.flags[id]||0;
  function edge(id,role){const matches=outgoing(id).filter(e=>e.role===role);if(matches.length!==1)stop('A native role needs exactly one target.');consumed.add(matches[0]);return matches[0].target;}
  function targetNode(t){if(t.kind!=='node')stop('A native participant must be a node.');return t.id;}
  function properties(id,name){
    const head=NOUNS[graph.nodes[id].concept];if(!head||head==='WATER')stop('This concept has no native property head.');
    visited.add(id);const terms=[p(head,v(name))];let quant=flags(id)&7;
    for(const e of outgoing(id)){
      const target=e.target.kind==='node'?graph.nodes[e.target.id].concept:null;
      if(['ARG1-of','mod'].includes(e.role)&&['red','red-02'].includes(target)&&!outgoing(e.target.id).length&&!flags(e.target.id)){
        consumed.add(e);visited.add(e.target.id);terms.push(p('RED',v(name)));
      }else if(e.role==='mod'&&['every','each','all'].includes(target)&&!outgoing(e.target.id).length){
        if(quant&&quant!==3)stop('Conflicting quantifier annotations.');quant=3;consumed.add(e);visited.add(e.target.id);
      }else stop('An entity modifier needs the compact graph extension.');
    }
    if((flags(id)&~7)&&!(quant===3&&(flags(id)&~7)===256))stop('A non-native noun feature must be retained.');
    if(quant>3)stop('This determiner needs the compact graph extension.');
    return {restriction:combine('AND',terms),quant};
  }
  function entity(id,environment,continuation){
    if(environment.has(id)){visited.add(id);return continuation(v(environment.get(id)),environment);}
    const concept=graph.nodes[id].concept;
    if(['i','you','water'].includes(concept)){
      if(outgoing(id).length||flags(id))stop('A modified native constant needs an extension.');visited.add(id);return continuation(p({i:'ME',you:'YOU',water:'WATER'}[concept]),environment);
    }
    const name=`n${id}`,property=properties(id,name);
    if(property.quant===2)return continuation(bind('THE',name,property.restriction),environment);
    const next=new Map(environment);next.set(id,name);
    return bind(property.quant===3?'ALL':'SOME',name,property.restriction,continuation(v(name),next));
  }
  function proposition(id,environment=new Map()){
    if(active.has(id))stop('A cyclic semantic graph needs explicit node references.');active.add(id);visited.add(id);
    const concept=graph.nodes[id].concept,definition=FRAMES[concept];let result;
    if(['and','or'].includes(concept)){
      const es=outgoing(id).filter(e=>/^op[1-9]\d*$/.test(e.role)).sort((a,b)=>Number(a.role.slice(2))-Number(b.role.slice(2)));
      if(es.length<2)stop('A connective needs multiple clauses.');for(const e of es)consumed.add(e);
      result=combine(concept==='and'?'AND':'OR',es.map(e=>proposition(targetNode(e.target),environment)));
    }else{
      if(!definition)stop('This semantic frame needs the compact graph extension.');
      const [head,...roles]=definition;
      const destinations=roles.map(role=>targetNode(edge(id,role))),clause=index=>(['KNOW','BELIEVE','WANT','SAY'].includes(head)&&index===1)||['POSSIBLE','NECESSARY'].includes(head);
      const entityIndices=roles.map((_,i)=>i).filter(i=>!clause(i)).sort((a,b)=>(features.order?.[destinations[a]]??Infinity)-(features.order?.[destinations[b]]??Infinity));
      function argumentsAt(index,args,env){
        if(index===entityIndices.length){const complete=destinations.map((destination,i)=>clause(i)?proposition(destination,env):args[i]);return p(head,...complete);}
        const position=entityIndices[index];
        return entity(destinations[position],env,(value,next)=>argumentsAt(index+1,{...args,[position]:value},next));
      }
      result=argumentsAt(0,{},environment);
    }
    let negative=false,question=false;
    for(const e of outgoing(id))if(!consumed.has(e)){
      if(e.role==='polarity'&&e.target.kind==='value'&&e.target.value==='-'){consumed.add(e);negative=true;}
      else if(e.role==='mode'&&e.target.kind==='value'&&e.target.value==='interrogative'){consumed.add(e);question=true;}
      else stop('A proposition modifier must not be omitted.');
    }
    const feature=flags(id);if(feature&~48)stop('This verbal feature needs the compact graph extension.');
    if(negative)result=p('NOT',result);
    if(feature&16)result=p('PAST',result);if(feature&32)result=p('FUTURE',result);
    if(question)result=p('ASK',result);
    active.delete(id);return result;
  }
  try{
    if(features.notes?.length)stop('Unaligned grammatical annotations need review.');
    const result=compilePlan(proposition(graph.root));validateSemantic(result);
    if(consumed.size!==graph.edges.length||visited.size!==graph.nodes.length)stop('Native compilation must retain the complete graph.');
    return {ast:result,native:true};
  }catch(e){return {ast:null,native:false,reason:e.message};}
}

// Ordered utterance lists preserve repeated statements. LET substitutes a
// shared closed expression, rather than retransmitting it or deleting it.
export function statementDocument(statements){
  if(statements.length===1)return statements[0];
  function ordered(items){
    if(items.length>32){const middle=Math.ceil(items.length/2);return node('PAIR',ordered(items.slice(0,middle)),ordered(items.slice(middle)));}
    let result=node('NIL');for(let i=items.length-1;i>=0;i--)result=node('PAIR',items[i],result);return result;
  }
  let result=ordered(statements);
  const counts=new Map();for(const ast of statements){const key=notation(ast),entry=counts.get(key)||{ast,count:0};entry.count++;counts.set(key,entry);}
  const candidate=[...counts.values()].filter(e=>e.count>1).sort((a,b)=>(b.count-1)*encode(b.ast).words.length-(a.count-1)*encode(a.ast).words.length)[0];
  if(candidate){const key=notation(candidate.ast),body=ordered(statements.map(s=>notation(s)===key?node('V0'):s));const reused=node('LET',candidate.ast,body);if(encode(reused).words.length<encode(result).words.length)result=reused;}
  return validate(result);
}
export function documentStatements(ast){
  function read(n,environment=[],depth=0){
    if(depth>128)return null;
    if(n?.op==='LET')return read(n.args[1],[n.args[0],...environment],depth+1);
    if(n?.op==='NIL')return [];
    if(n?.op!=='PAIR')return null;
    const tail=read(n.args[1],environment,depth+1);if(!tail)return null;
    const nested=read(n.args[0],environment,depth+1);if(nested)return [...nested,...tail];
    let item=n.args[0];if(/^V[012]$/.test(item.op))item=environment[Number(item.op[1])];else if(item.op==='REF')item=environment[Number(item.value)];
    return item?[item,...tail]:null;
  }
  const statements=read(ast);return statements?.length&&statements.length<=512?statements:null;
}
export function compileMeaning(parts){
  const compiled=parts.map(part=>{const native=compileNativeGraph(part.graph,part.features);return {...native,ast:native.ast||encodeCompactGraphs([part])};});
  const ast=statementDocument(compiled.map(p=>p.ast));
  return {ast,method:compiled.every(p=>p.native)?'Native Silex semantics':'Silex semantics with compact concept declarations',nativeStatements:compiled.filter(p=>p.native).length,statements:compiled.length,
    assumptions:[...parts.flatMap(p=>[...(p.graph.warnings||[]),...(p.features?.notes||[])]),'Normal images contain meaning, not source words or formatting. Review the chosen interpretation.']};
}
export function semanticReading(ast){
  const statements=documentStatements(ast);if(statements)return statements.map((s,i)=>`Statement ${i+1}: ${semanticReading(s)}`).join('\n');
  const graph=decodeCompactGraphs(ast);return graph?literalGraphReading(graph,n=>n.concept+(n.flags?` {${featureReading(n.flags)}}`:'')):literalEnglish(ast);
}
export function featureReading(flags){return [({1:'indefinite',2:'definite',3:'universal',4:'near demonstrative',5:'far demonstrative',6:'negative determiner'})[flags&7],flags&16?'past tense':null,flags&32?'future tense':null,flags&64?'ongoing aspect':null,flags&128?'perfect aspect':null,flags&256?'plural':null,flags&512?'conditional modality':null].filter(Boolean).join(', ');}
export function semanticKnownReading(ast,language='en'){
  const statements=documentStatements(ast);if(statements){const readings=statements.map(s=>semanticKnownReading(s,language));return readings.every(Boolean)?readings.join(' '):null;}
  return decodeCompactGraphs(ast)?null:knownReading(ast,language);
}
