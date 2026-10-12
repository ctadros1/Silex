import {node,literal,validate} from './codec.js';

// Silex's original CALL/PAIR/NAT/TEXT grammar carries this declared graph
// convention. Concepts and role names are open UTF-8 strings, not a vocabulary
// of supported English sentences. Sentence order and repeated statements remain
// distinct even when they share dictionary entries.
export const GRAPH_SCHEMA='silex-meaning-graph/1';
const nat=value=>({op:'NAT',args:[],value:String(value)});
const seq=(name,...values)=>node('CALL',{op:'SYMBOL',args:[],value:name},...values);
const fail=message=>{throw new Error(message);};

export function splitDocument(source,language='en'){
  if(typeof source!=='string'||!source.trim())return [];
  const parts=[];let leading='';
  for(const s of new Intl.Segmenter(language,{granularity:'sentence'}).segment(source)){
    if(s.segment.trim()){parts.push(leading+s.segment);leading='';}
    else if(parts.length)parts[parts.length-1]+=s.segment;else leading+=s.segment;
  }
  return parts;
}

function serialTokens(source){
  const tokens=[];let at=0;
  while(at<source.length){
    if(/\s/.test(source[at])){at++;continue;}
    if('()/'.includes(source[at])){tokens.push(source[at++]);continue;}
    if(source[at]==='"'){
      const start=at++;let closed=false;
      while(at<source.length){if(source[at]==='\\'){at+=2;continue;}if(source[at++]==='"'){closed=true;break;}}
      if(!closed)fail('The meaning parser returned an incomplete quoted value.');
      tokens.push(source.slice(start,at));continue;
    }
    const start=at;while(at<source.length&&!/\s|[()/]/.test(source[at]))at++;
    tokens.push(source.slice(start,at));
  }
  return tokens;
}

/** Read amrlib BART's variable-free AMR serialization. Reentrancies use the
 * model's concept UID convention; no English grammar or predicate arity is
 * inferred here. Minor missing closing parentheses are reported explicitly. */
export function parseAmrSerial(source){
  if(typeof source!=='string'||source.length>16000)fail('Invalid meaning graph response.');
  const tokens=serialTokens(source),nodes=[],edges=[],labels=new Map(),warnings=[];let at=0;
  function concept(label){
    if(!label||label.startsWith(':')||'()/'.includes(label))fail('A meaning node needs a concept.');
    if(!labels.has(label)){if(nodes.length>=512)fail('The meaning graph exceeds the browser node limit.');labels.set(label,nodes.length);nodes.push({concept:label.replace(/_\d+$/,'')});}
    return labels.get(label);
  }
  function term(depth=0){
    if(depth>100)fail('The meaning graph is too deeply nested.');
    const token=tokens[at++];if(token===undefined)fail('The meaning parser omitted a role value.');
    if(token==='('){
      const id=concept(tokens[at++]);
      while(at<tokens.length&&tokens[at]!==')'){
        const role=tokens[at++];if(!/^:[^\s()]+$/.test(role))fail('A meaning relation needs its role label.');
        const target=term(depth+1);edges.push({source:id,role:role.slice(1),target});
        if(edges.length>2048)fail('The meaning graph exceeds the browser edge limit.');
      }
      if(tokens[at]===')')at++;else warnings.push('The parser omitted a closing bracket; the compiler closed the completed node.');
      return {kind:'node',id};
    }
    if(token.startsWith('"')){let value;try{value=JSON.parse(token);}catch{fail('Invalid quoted meaning value.');}return {kind:'value',type:'string',value};}
    if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(token))return {kind:'value',type:'number',value:token};
    if(['-','+','interrogative','imperative','expressive'].includes(token))return {kind:'value',type:'symbol',value:token};
    return {kind:'node',id:concept(token)};
  }
  const root=term();if(root.kind!=='node'||at!==tokens.length)fail('The parser did not return one complete meaning graph.');
  return {root:root.id,nodes,edges,warnings:[...new Set(warnings)]};
}

function sourceAtoms(source,language){
  const atoms=[];let gap='';
  for(const s of new Intl.Segmenter(language,{granularity:'word'}).segment(source)){
    if(/^\s+$/.test(s.segment))gap+=s.segment;
    else{atoms.push({gap,form:s.segment});gap='';}
  }
  return {atoms,tail:gap};
}

export function encodeMeaningDocument(parts,language='en',original=null){
  if(!Array.isArray(parts)||!parts.length||parts.length>512)fail('A meaning document needs 1–512 statements.');
  const strings=[''],indices=new Map([['',0]]);
  function intern(s){if(typeof s!=='string')fail('A graph dictionary entry must be text.');if(!indices.has(s)){indices.set(s,strings.length);strings.push(s);}return indices.get(s);}
  const statements=parts.map(part=>{
    const g=part.graph;if(!g?.nodes?.length)fail('A statement needs its meaning graph.');
    const concepts=g.nodes.map(n=>nat(intern(n.concept)));
    const edgeValues=g.edges.flatMap(e=>[nat(e.source),nat(intern(e.role)),nat(e.target.kind==='node'?4*e.target.id:4*intern(e.target.value)+({string:1,number:2,symbol:3}[e.target.type]||1))]);
    const words=sourceAtoms(part.source,language);
    const annotations=[nat(intern(words.tail)),...words.atoms.flatMap(a=>[nat(intern(a.gap)),nat(intern(a.form))])];
    return seq('g',nat(g.root),seq('n',...concepts),seq('e',...edgeValues),seq('a',...annotations));
  });
  let originalAtoms;
  if(original){const words=sourceAtoms(original.text,original.language);originalAtoms={language:original.language,atoms:words.atoms.map(a=>[intern(a.gap),intern(a.form)]),tail:intern(words.tail)};}
  const ast=node('PAIR',literal(JSON.stringify({schema:GRAPH_SCHEMA,language,strings,...(originalAtoms?{original:originalAtoms}:{})})),seq('d',...statements));
  validate(ast);decodeMeaningDocument(ast);return ast;
}

function sequence(n,name){if(n?.op!=='CALL'||n.args[0]?.op!=='SYMBOL'||n.args[0].value!==name)fail('Invalid Silex meaning-graph record.');return n.args.slice(1);}
function integer(n,max){if(n?.op!=='NAT'||!/^\d+$/.test(String(n.value)))fail('A graph reference must be a natural number.');const value=Number(n.value);if(!Number.isSafeInteger(value)||value<0||value>=max)fail('A graph reference is out of range.');return value;}
export function decodeMeaningDocument(ast){
  if(ast?.op!=='PAIR'||ast.args[0]?.op!=='TEXT')return null;
  let metadata;try{metadata=JSON.parse(ast.args[0].value);}catch{return null;}
  if(metadata?.schema!==GRAPH_SCHEMA)return null;
  if(typeof metadata.language!=='string'||!/^[a-z]{2,3}(?:-[a-zA-Z0-9]+)*$/.test(metadata.language)||!Array.isArray(metadata.strings)||!metadata.strings.length||metadata.strings.length>4096||metadata.strings.some(s=>typeof s!=='string')||metadata.strings[0]!=='')fail('Invalid meaning-graph dictionary.');
  const pool=metadata.strings,statements=sequence(ast.args[1],'d');if(!statements.length||statements.length>512)fail('Invalid statement count.');
  const documents=statements.map((record,statementIndex)=>{
    const fields=sequence(record,'g');if(fields.length!==4)fail('A statement needs root, concepts, relations, and source atoms.');
    const nodeFields=sequence(fields[1],'n');if(!nodeFields.length||nodeFields.length>512)fail('Invalid meaning node count.');
    const nodes=nodeFields.map((field,id)=>({id,concept:pool[integer(field,pool.length)],field}));
    if(nodes.some(n=>!n.concept))fail('A meaning concept cannot be empty.');
    const root=integer(fields[0],nodes.length),edgeFields=sequence(fields[2],'e');
    if(edgeFields.length%3||edgeFields.length>6144)fail('Invalid meaning relation count.');
    const edges=[];
    for(let i=0;i<edgeFields.length;i+=3){
      const source=integer(edgeFields[i],nodes.length),role=pool[integer(edgeFields[i+1],pool.length)],target=integer(edgeFields[i+2],4*Math.max(nodes.length,pool.length));
      if(!role||/\s/.test(role))fail('Invalid meaning relation label.');
      const tag=target%4,index=Math.floor(target/4);if(index>=(tag?pool.length:nodes.length))fail('Invalid meaning relation target.');
      const destination=tag?{kind:'value',type:['node','string','number','symbol'][tag],value:pool[index]}:{kind:'node',id:index};
      if(tag===2&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(destination.value))fail('Invalid exact numerical meaning value.');
      edges.push({source,role,target:destination,fields:edgeFields.slice(i,i+3)});
    }
    const sourceFields=sequence(fields[3],'a');if(!sourceFields.length||sourceFields.length%2!==1||sourceFields.length>4097)fail('Invalid source-atom record.');
    const tail=pool[integer(sourceFields[0],pool.length)],atoms=[];if(tail.trim())fail('A source tail must be whitespace.');
    for(let i=1;i<sourceFields.length;i+=2){const gap=pool[integer(sourceFields[i],pool.length)],form=pool[integer(sourceFields[i+1],pool.length)];if(gap.trim()||!form||/^\s+$/.test(form))fail('Invalid source atom or separator.');atoms.push({gap,form,fields:sourceFields.slice(i,i+2)});}
    if(!atoms.length)fail('A statement must retain its source atoms.');
    return {statementIndex,root,nodes,edges,atoms,tail,record,source:atoms.map(a=>a.gap+a.form).join('')+tail};
  });
  let source=documents.map(d=>d.source).join(''),language=metadata.language;
  if(metadata.original){const o=metadata.original;
    if(!/^[a-z]{2,3}(?:-[a-zA-Z0-9]+)*$/.test(o.language)||!Array.isArray(o.atoms)||!o.atoms.length||o.atoms.length>4096)fail('Invalid original source witness.');
    const get=i=>{if(!Number.isSafeInteger(i)||i<0||i>=pool.length)fail('Invalid source dictionary reference.');return pool[i];};
    source=o.atoms.map(pair=>{if(!Array.isArray(pair)||pair.length!==2)fail('Invalid original source atom.');const gap=get(pair[0]),form=get(pair[1]);if(gap.trim()||!form||/^\s+$/.test(form))fail('Invalid original source atom.');return gap+form;}).join('');
    const tail=get(o.tail);if(tail.trim())fail('Invalid source tail.');source+=tail;language=o.language;
  }
  return {language,interpretationLanguage:metadata.language,metadata,strings:pool,metadataNode:ast.args[0],documents,source};
}

export function literalGraphReading(document){
  return document.documents.map((g,i)=>{
    const visited=new Set();
    function describe(id,depth=0){
      const n=g.nodes[id],name=`n${id}=${n.concept}`;if(visited.has(id)||depth>24)return `↩ n${id}`;visited.add(id);
      const edges=g.edges.filter(e=>e.source===id);return name+(edges.length?' ['+edges.map(e=>`${e.role}: ${e.target.kind==='node'?describe(e.target.id,depth+1):e.target.type==='string'?JSON.stringify(e.target.value):e.target.value}`).join('; ')+']':'');
    }
    return `Statement ${i+1}: ${describe(g.root)}`;
  }).join('\n');
}

/** Map rendered graph pieces back to actual AST fields. A shared dictionary
 * entry can be highlighted alongside the numerical reference that uses it. */
export function graphPieceMap(document){
  const map=new Map();
  for(const g of document.documents){
    for(const n of g.nodes)map.set(n.field,{title:`Statement ${g.statementIndex+1} · n${n.id}: ${n.concept}`,short:n.concept,dictionaryIndex:Number(n.field.value),fields:[n.field],description:`Meaning node n${n.id} has concept ${n.concept}. This field points to its UTF-8 dictionary entry. Node references are local to this statement.`});
    for(const e of g.edges){const destination=e.target.kind==='node'?`n${e.target.id} (${g.nodes[e.target.id].concept})`:`${e.target.type} ${JSON.stringify(e.target.value)}`,description=`In statement ${g.statementIndex+1}, n${e.source} (${g.nodes[e.source].concept}) has role ${e.role} directed to ${destination}. The three numeric fields encode source, role, and target. The target's lowest two bits identify node (00), quoted text (01), exact number (10), or symbolic value (11); the remaining bits give its index.`;for(const f of e.fields)map.set(f,{title:`${g.nodes[e.source].concept} → ${e.role} → ${destination}`,short:e.role,dictionaryIndex:Number(e.fields[1].value),fields:e.fields,description});}
    for(const a of g.atoms)for(const f of a.fields)map.set(f,{title:`Source atom: ${a.form}`,short:a.form,dictionaryIndex:Number(a.fields[1].value),fields:a.fields,description:`The source atom ${JSON.stringify(a.form)} and its preceding whitespace are retained separately from the model's interpretation. This is one word or punctuation piece, not a quotation substituted for the entire meaning graph.`});
  }
  return map;
}

export function dictionaryGlyphSpan(document,records,index){
  const metadata=document.metadataNode,value=metadata.value;
  if(value!==JSON.stringify(document.metadata))return null;
  const prefix=value.slice(0,value.indexOf('"strings":[')+11);let position=prefix.length;
  for(let i=0;i<index;i++)position+=JSON.stringify(document.strings[i]).length+1;
  const item=JSON.stringify(document.strings[index]),first=records.find(r=>r.node===metadata&&r.kind==='literal bytes');if(!first)return null;
  const offset=new TextEncoder().encode(value.slice(0,position)).length,bytes=new TextEncoder().encode(item).length;
  return {start:first.index+Math.floor(offset*8/6),end:first.index+Math.ceil((offset+bytes)*8/6)};
}
