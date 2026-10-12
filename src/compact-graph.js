import {node,validate} from './codec.js';
import {CONCEPTS,RELATIONS} from './semantic-codebook.js';
const nat=value=>({op:'NAT',args:[],value:String(value)});
const symbol=value=>({op:'SYMBOL',args:[],value});
const sequence=(name,...values)=>node('CALL',symbol(name),...values);
const fail=message=>{throw Error(message);};
function list(n,name){if(n?.op!=='CALL'||n.args[0]?.op!=='SYMBOL'||n.args[0].value!==name)fail('Invalid compact meaning record.');return n.args.slice(1);}
function number(n,max){if(n?.op!=='NAT'||!/^\d+$/.test(n.value))fail('Invalid compact reference.');const v=Number(n.value);if(!Number.isSafeInteger(v)||v<0||v>=max)fail('Compact reference is out of range.');return v;}
const numeric=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
export function encodeCompactGraphs(parts){
  const strings=[],indices=new Map();
  function code(value,shared){const index=shared.indexOf(value);if(index>=0)return nat(index);if(!indices.has(value)){indices.set(value,strings.length);strings.push(value);}return nat(shared.length+indices.get(value));}
  for(const {graph:g} of parts){for(const n of g.nodes)code(n.concept,CONCEPTS);for(const e of g.edges)code(e.role,RELATIONS);}
  const valueCounts=new Map();for(const {graph:g} of parts)for(const e of g.edges)if(e.target.kind==='value')valueCounts.set(e.target.value,(valueCounts.get(e.target.value)||0)+1);
  const pooled=new Set();for(const [value,count] of valueCounts){
    const bytes=new TextEncoder().encode(value).length,direct=1+(bytes<32?1:2)+Math.ceil(bytes*8/6),index=indices.get(value)??strings.length,reference=1+2+1+(index<32?1:2),overhead=indices.has(value)?0:direct+(strings.length?0:6);
    if(count*direct>overhead+count*reference){if(!indices.has(value)){indices.set(value,strings.length);strings.push(value);}pooled.add(value);}
  }
  function destination(target){
    if(target.kind==='node')return nat(target.id);
    if(pooled.has(target.value))return node('PAIR',nat({string:0,number:1,symbol:2}[target.type]),nat(indices.get(target.value)));
    return {op:target.type==='string'?'TEXT':'SYMBOL',args:[],value:target.value};
  }
  const graphs=parts.map(({graph:g,features={flags:[]}})=>{
    if(!g?.nodes?.length)fail('A compact statement needs a graph.');
    const nodes=g.nodes.map((n,i)=>{const c=code(n.concept,CONCEPTS),flag=features.flags[i]||0;return flag?node('PAIR',c,nat(flag)):c;});
    const edges=g.edges.flatMap(e=>[nat(e.source),code(e.role,RELATIONS),destination(e.target)]);
    return node('PAIR',nat(g.root),node('PAIR',sequence('n',...nodes),sequence('e',...edges)));
  });
  const ast=sequence('g2',strings.length?sequence('s',...strings.map(symbol)):node('NIL'),...graphs);
  validate(ast);decodeCompactGraphs(ast);return ast;
}
export function decodeCompactGraphs(ast){
  if(ast?.op!=='CALL'||ast.args[0]?.op!=='SYMBOL'||ast.args[0].value!=='g2')return null;
  const args=ast.args.slice(1);if(args.length<2||args.length>513)fail('Invalid compact statement count.');
  const fields=args[0].op==='NIL'?[]:list(args[0],'s');if(fields.length>4096||fields.some(n=>n.op!=='SYMBOL'||!n.value))fail('Invalid compact concept dictionary.');
  const strings=fields.map(n=>n.value);
  const resolve=(field,shared)=>{const id=number(field,shared.length+strings.length);return {value:id<shared.length?shared[id]:strings[id-shared.length],definitionField:id<shared.length?null:fields[id-shared.length],code:id,shared:id<shared.length};};
  const documents=args.slice(1).map((record,statementIndex)=>{
    if(record.op!=='PAIR'||record.args[1]?.op!=='PAIR')fail('Invalid compact graph shape.');
    const nodeFields=list(record.args[1].args[0],'n');if(!nodeFields.length||nodeFields.length>512)fail('Invalid compact node count.');
    const nodes=nodeFields.map((f,id)=>{const field=f.op==='PAIR'?f.args[0]:f,flags=f.op==='PAIR'?number(f.args[1],1024):0,c=resolve(field,CONCEPTS);if(!c.value)fail('A compact concept cannot be empty.');return {id,concept:c.value,field,flags,flagField:f.op==='PAIR'?f.args[1]:null,...c};});
    const root=number(record.args[0],nodes.length),edgeFields=list(record.args[1].args[1],'e');if(edgeFields.length%3||edgeFields.length>6144)fail('Invalid compact edge count.');
    const edges=[];for(let i=0;i<edgeFields.length;i+=3){
      const source=number(edgeFields[i],nodes.length),r=resolve(edgeFields[i+1],RELATIONS),target=edgeFields[i+2];
      if(!r.value||/\s/.test(r.value))fail('Invalid compact relation label.');
      let destination,targetDefinitionField=null;if(target.op==='NAT')destination={kind:'node',id:number(target,nodes.length)};
      else if(target.op==='TEXT')destination={kind:'value',type:'string',value:target.value};
      else if(target.op==='SYMBOL')destination={kind:'value',type:numeric.test(target.value)?'number':'symbol',value:target.value};
      else if(target.op==='PAIR'){const tag=number(target.args[0],3),index=number(target.args[1],strings.length);destination={kind:'value',type:['string','number','symbol'][tag],value:strings[index]};targetDefinitionField=fields[index];if(tag===1&&!numeric.test(destination.value))fail('Invalid exact number reference.');}
      else fail('Invalid compact edge target.');
      edges.push({source,role:r.value,target:destination,fields:edgeFields.slice(i,i+3),targetDefinitionField,...r});
    }
    return {statementIndex,root,nodes,edges,atoms:[],record,source:null};
  });
  return {profile:'g2/1',language:null,source:null,strings,definitionFields:fields,documents};
}
export function compactPieceMap(document){
  const map=new Map();
  for(const g of document.documents){
    for(const n of g.nodes){const fields=[n.field,n.flagField,n.definitionField].filter(Boolean);for(const field of fields)map.set(field,{title:`Statement ${g.statementIndex+1} · n${n.id}: ${n.concept}`,fields,description:`Concept ${n.concept} uses ${n.shared?'shared semantic code '+n.code:'a counted local concept declaration'}. Its label ${n.shared?'is supplied by the published codebook and is not repeated in this image':'is encoded once as UTF-8 in this image'}.${n.flags?' Grammatical feature flags: '+n.flags+'.':''} Node identity is local to this statement.`});}
    for(const e of g.edges){const fields=[...e.fields,e.definitionField,e.targetDefinitionField].filter(Boolean),destination=e.target.kind==='node'?`n${e.target.id} (${g.nodes[e.target.id].concept})`:`${e.target.type} ${JSON.stringify(e.target.value)}`;for(const field of fields)map.set(field,{title:`${g.nodes[e.source].concept} → ${e.role} → ${destination}`,fields,description:`These three fields encode the source node, the ${e.shared?'shared':'locally declared'} relation ${e.role}, and its target. Only this relation and its references are transmitted; the source sentence is excluded.`});}
  }
  return map;
}
