import {node,literal,IDS,ARITIES,validate} from './codec.js';
/** A documented v1 PAIR value carrying counted lexical declarations and content.
 * The core codec needs no new glyphs. The converter's declared model grounds
 * each identifier by its explicit role signature and supplied English sense.
 */
export function validateLexicon(content,entries=[]){
  if(!Array.isArray(entries)||entries.length>128)throw new Error('This lexical package exceeds the browser resource limit. Split it into more than one frame.');
  const map=new Map();
  for(const e of entries){
    if(!e||typeof e.id!=='string'||!/^urn:silex:lex:[a-z0-9-]{1,64}$/.test(e.id)||map.has(e.id))throw new Error('Invalid or duplicate lexical identifier.');
    if(!Array.isArray(e.roles)||e.roles.length>32||e.roles.some(r=>typeof r!=='string'||r.length<1||r.length>40))throw new Error('A lexical definition needs explicit argument roles within the browser resource limit.');
    if(typeof e.definition!=='string'||e.definition.length<3||e.definition.length>1000)throw new Error('A lexical definition needs an explicit English sense definition.');
    map.set(e.id,{id:e.id,roles:e.roles,definition:e.definition});
  }
  const used=new Set();
  function visit(n,parent=null,index=0){
    if(n.op==='SYMBOL'){const e=map.get(n.value);if(!e||parent?.op!=='CALL'||index!==0)throw new Error('Every new symbol must be the function of a CALL and have a definition in this image.');}
    if(n.op==='CALL'){const first=n.args[0];if(first?.op!=='SYMBOL')throw new Error('Model-created CALLs must use declared lexical identifiers.');const e=map.get(first.value);if(!e)throw new Error('A lexical CALL requires a definition in this image.');if(n.args.length-1!==e.roles.length)throw new Error('Lexical argument count does not match its declared role signature.');used.add(e.id);}
    n.args.forEach((a,i)=>visit(a,n,i));
  }visit(content);
  if(map.size!==used.size)throw new Error('Unused lexical definitions: '+[...map.keys()].filter(id=>!used.has(id)).join(', '));
  return [...map.values()];
}
export function packageMeaning(content,entries=[]){
  const lexicon=validateLexicon(content,entries);if(!lexicon.length)return content;
  return node('PAIR',literal(JSON.stringify({schema:'silex-lexicon/1',entries:lexicon})),content);
}
export function unpackMeaning(n){
  if(n.op==='PAIR'&&n.args[0]?.op==='TEXT'){
    let d;try{d=JSON.parse(n.args[0].value);}catch{return {content:n,lexicon:[]};}
    if(d?.schema==='silex-lexicon/1')return {content:n.args[1],lexicon:validateLexicon(n.args[1],d.entries)};
  }
  return {content:n,lexicon:[]};
}
/** A simple, schema-constrained model intermediate; never used as wire data. */
export function treeFromTokens(tokens,entries=[]){
  if(!Array.isArray(tokens)||tokens.length>1000||tokens.some(t=>typeof t!=='string'))throw new Error('The analysis must be a flat array of string tokens.');
  const declarations=new Map(entries.map(e=>[e.id,e]));let cursor=0;
  function read(depth=0){
    if(depth>128)throw new Error('Analysis depth limit exceeded.');
    const op=tokens[cursor++];if(!Object.prototype.hasOwnProperty.call(IDS,op))throw new Error('Unknown analysis head: '+String(op).slice(0,60));
    if(op==='TEXT')return literal(tokens[cursor++]);
    if(op==='NAT'||op==='REF')return {op,args:[],value:tokens[cursor++]};
    if(op==='SYMBOL')return {op,args:[],value:tokens[cursor++]};
    if(op==='CALL'){
      const id=tokens[cursor++],e=declarations.get(id);if(!e)throw new Error('CALL must be followed directly by a declared urn:silex:lex: identifier. Do not put SYMBOL between CALL and the identifier.');
      return node('CALL',{op:'SYMBOL',args:[],value:id},...e.roles.map(()=>read(depth+1)));
    }
    return node(op,...Array.from({length:ARITIES[IDS[op]]},()=>read(depth+1)));
  }
  const root=read();if(cursor!==tokens.length)throw new Error('Extra tokens after the complete expression.');return validate(root);
}
