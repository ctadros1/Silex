import test from 'node:test';
import assert from 'node:assert/strict';
import {encode,decode,notation,parse} from '../src/codec.js';
import {parseAmrSerial,encodeMeaningDocument,decodeMeaningDocument,dictionaryGlyphSpan} from '../src/meaning-graph.js';
import {documentSegments} from '../src/document-segments.js';
import {createAssetLoader} from '../src/model-assets.js';
const bird='( see-01 :ARG0 ( i ) :ARG1 ( bird :ARG1-of ( red-02 ) ) )';
test('identical statements remain distinct, ordered graphs with independent local references',()=>{
  const source='I see the red bird. I see the red bird.',parts=[{source:source.slice(0,20),graph:parseAmrSerial(bird)},{source:source.slice(20),graph:parseAmrSerial(bird)}];
  const ast=encodeMeaningDocument(parts),result=decodeMeaningDocument(decode(encode(ast).words));
  assert.equal(result.documents.length,2);assert.equal(result.source,source);assert.equal(result.documents[0].nodes[0].concept,'see-01');assert.deepEqual(result.documents[0].edges.map(e=>e.target),result.documents[1].edges.map(e=>e.target));
});
test('graph concepts and roles are open strings, and reentrancy does not duplicate an actor',()=>{
  const g=parseAmrSerial('( refuse-01 :ARG0 ( person ) :ARG1 ( fly-01 :ARG0 person ) :novel-relation ( quux_1 :other ( quux_2 ) ) )');
  assert.equal(g.nodes.filter(n=>n.concept==='person').length,1);assert.equal(g.nodes.filter(n=>n.concept==='quux').length,2);
  const d=decodeMeaningDocument(encodeMeaningDocument([{source:'Quux refuses. 😀',graph:g}]));assert.equal(d.source,'Quux refuses. 😀');assert.equal(d.documents[0].edges.find(e=>e.role==='novel-relation').target.kind,'node');
});
test('quoted strings, exact large numbers and symbols have distinct target tags',()=>{
  const g=parseAmrSerial('( value :a 900719925474099312345 :b "900719925474099312345" :c - :d "João \\"雪\\"" )');
  const ast=encodeMeaningDocument([{source:'  João: “雪”.\r\n\t',graph:g}]);
  const d=decodeMeaningDocument(decode(encode(ast).words));assert.equal(d.source,'  João: “雪”.\r\n\t');
  const values=d.documents[0].edges.map(e=>e.target);assert.deepEqual(values.map(v=>v.type),['number','string','symbol','string']);assert.equal(values[0].value,'900719925474099312345');
});
test('the original non-English word witness is retained separately from the English graph',()=>{
  const ast=encodeMeaningDocument([{source:'I see the bird.',graph:parseAmrSerial(bird)}],'en',{language:'fr',text:'Je vois l’oiseau.\n'});
  const d=decodeMeaningDocument(parse(notation(ast)));assert.equal(d.language,'fr');assert.equal(d.source,'Je vois l’oiseau.\n');assert.equal(d.documents[0].source,'I see the bird.');
});
test('dictionary highlights include exactly the six-bit sites overlapping the UTF-8 dictionary item',()=>{
  const ast=encodeMeaningDocument([{source:'雪 "\\" café.',graph:parseAmrSerial('( snow :name "雪" )')}]);const encoded=encode(ast),d=decodeMeaningDocument(ast);
  for(let index=0;index<d.strings.length;index++){
    const span=dictionaryGlyphSpan(d,encoded.records,index);assert.ok(span&&span.start<span.end);
    const marker='"strings":[',prefix=d.metadataNode.value.slice(0,d.metadataNode.value.indexOf(marker)+marker.length);
    const before=prefix+d.strings.slice(0,index).map(JSON.stringify).join(',')+(index?',':'');
    const offset=new TextEncoder().encode(before).length,length=new TextEncoder().encode(JSON.stringify(d.strings[index])).length;
    const first=encoded.records.find(r=>r.node===d.metadataNode&&r.kind==='literal bytes').index;
    assert.equal(span.start,first+Math.floor(offset*8/6));assert.equal(span.end,first+Math.ceil((offset+length)*8/6));
  }
});
test('malformed references and relation counts fail explicitly; quoted text is never a fake graph',()=>{
  assert.throws(()=>parseAmrSerial('"I see the bird."'));assert.throws(()=>parseAmrSerial('( see-01 :ARG0 )'));
  const ast=encodeMeaningDocument([{source:'I see the bird.',graph:parseAmrSerial(bird)}]);ast.args[1].args[1].args[1].value='999';assert.throws(()=>decodeMeaningDocument(ast),/range/);
});
test('learned sentence offsets preserve code points, whitespace and repeated statements',()=>{
  const source='😀 Hi!\n\t😀 Hi!',conllu='1\t😀\t_\t_\t_\t_\t_\t_\t_\tTokenRange=0:1\n2\t!\t_\t_\t_\t_\t_\t_\t_\tTokenRange=4:5\n\n1\t😀\t_\t_\t_\t_\t_\t_\t_\tTokenRange=7:8\n2\t!\t_\t_\t_\t_\t_\t_\t_\tTokenRange=11:12';
  const parts=documentSegments(source,conllu);assert.equal(parts.length,2);assert.equal(parts.join(''),source);assert.equal(parts[0],'😀 Hi!\n\t');
});
test('model shards and assembled assets require the declared bytes and SHA-256',async()=>{
  const bytes=new TextEncoder().encode('abcdef'),hash=async b=>Buffer.from(await crypto.subtle.digest('SHA-256',b)).toString('hex');
  const chunks=await Promise.all([bytes.slice(0,3),bytes.slice(3)].map(async(b,i)=>({path:`${i}.bin`,bytes:b.length,sha256:await hash(b)})));
  const manifest={version:'unit-test',files:{model:{bytes:6,sha256:await hash(bytes),chunks}}};
  const load=createAssetLoader('https://example.invalid/',manifest,()=>{},async url=>new Response(bytes.slice(url.endsWith('0.bin')?0:3,url.endsWith('0.bin')?3:6)));
  assert.deepEqual(await load('model'),bytes);
  const broken=createAssetLoader('https://example.invalid/',manifest,()=>{},async()=>new Response('bad'));await assert.rejects(broken('model'),/integrity/);
});
test('cross-version caches are hash checked and unavailable storage does not block inference',async()=>{
  const previous=globalThis.caches,bytes=new TextEncoder().encode('weights'),sha256=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
  const manifest={version:'new',files:{model:{bytes:bytes.length,sha256}}};let downloads=0;
  const fetcher=async()=>{downloads++;return new Response(bytes);};
  try{
    globalThis.caches={open:async()=>null,match:async()=>new Response(bytes)};
    assert.deepEqual(await createAssetLoader('https://example.invalid/',manifest,()=>{},fetcher)('model'),bytes);assert.equal(downloads,0);
    globalThis.caches={open:async()=>null,match:async()=>new Response('corrupt')};
    assert.deepEqual(await createAssetLoader('https://example.invalid/',manifest,()=>{},fetcher)('model'),bytes);assert.equal(downloads,1);
    globalThis.caches={open:async()=>{throw Error('denied');},match:async()=>{throw Error('denied');}};
    assert.deepEqual(await createAssetLoader('https://example.invalid/',manifest,()=>{},fetcher)('model'),bytes);assert.equal(downloads,2);
  }finally{if(previous===undefined)delete globalThis.caches;else globalThis.caches=previous;}
});
