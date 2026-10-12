import {node, literal, validate, IDS, ARITIES} from './codec.js';

// The translation intermediate has named binders. Only this compiler computes
// de Bruijn distances; a language model never has to count nested scopes.
export const p = (op, ...args) => ({op,args});
export const v = name => ({op:'variable',args:[],name});
export const bind = (op,name,...args) => ({op,args,bind:name});
export const text = value => ({op:'TEXT',args:[],value});
export const call = (id,...args) => p('CALL',{op:'SYMBOL',args:[],value:id},...args);
export function compilePlan(plan,environment=[],depth=0){
  if(depth>128)throw new Error('Translation plan exceeds the browser nesting limit.');
  if(plan.op==='variable'){
    const index=environment.indexOf(plan.name);
    if(index<0)throw new Error(`Unbound named variable ${plan.name}.`);
    return index<3?node(`V${index}`):{op:'REF',args:[],value:String(index)};
  }
  const args=plan.args.map((a,i)=>compilePlan(a,plan.op==='QUOTE'?[]:plan.bind&&(['ALL','SOME','THE','LAM'].includes(plan.op)||(plan.op==='LET'&&i===1))?[plan.bind,...environment]:environment,depth+1));
  const result=plan.op==='LEX'?{op:'LEX',key:plan.key,args,...(plan.slots?{slots:plan.slots}:{}),...(plan.lexical?{lexical:plan.lexical}:{})}:plan.op==='TEXT'?literal(plan.value):['SYMBOL','NAT','REF'].includes(plan.op)?{op:plan.op,args:[],value:plan.value}:node(plan.op,...args);
  return depth===0?validate(result):result;
}
/** Model intermediate: ALL $x CHILD $x ...; names have no wire cost. */
export function treeFromNamedTokens(tokens,entries=[]){
  if(!Array.isArray(tokens)||tokens.length>6000||tokens.some(t=>typeof t!=='string'))throw new Error('The analysis needs an array of string tokens.');
  const map=new Map(entries.map(e=>[e.id,e]));let cursor=0;
  function read(depth=0){
    if(depth>128)throw new Error('Translation plan nesting limit exceeded.');
    const op=tokens[cursor++];
    if(/^\$[a-z][a-z0-9_]*$/i.test(op||''))return v(op);
    if(!Object.hasOwn(IDS,op))throw new Error(`Unknown translation head ${String(op).slice(0,60)}.`);
    if(['TEXT','SYMBOL','NAT','REF'].includes(op))return {op,args:[],value:tokens[cursor++]};
    if(op==='CALL'){
      const id=tokens[cursor++],entry=map.get(id);
      if(!entry)throw new Error(`Missing definition for ${id}.`);
      return call(id,...entry.roles.map(()=>read(depth+1)));
    }
    const name=['ALL','SOME','THE','LAM','LET'].includes(op)?tokens[cursor++]:null;
    if(name&&!/^\$[a-z][a-z0-9_]*$/i.test(name))throw new Error(`${op} requires a named binder such as $x.`);
    return {op,args:Array.from({length:ARITIES[IDS[op]]},()=>read(depth+1)),...(name?{bind:name}:{})};
  }
  const plan=read();if(cursor!==tokens.length)throw new Error('Extra tokens after the complete translation plan.');
  return compilePlan(plan);
}
