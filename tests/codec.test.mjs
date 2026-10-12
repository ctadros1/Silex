import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import {parse,notation,encode,decode,packet,grid,ungrid,uint,Reader,literal,node,crc12,byteWords,packWords,unpacket,NAMES,IDS} from '../src/codec.js';
import {EXAMPLES,LANGUAGES,instantTranslate,knownReading,literalEnglish,validateSemantic} from '../src/language.js';
import {packageMeaning,unpackMeaning,treeFromTokens} from '../src/lexicon.js';
const fixtures=JSON.parse(readFileSync(new URL('./fixtures.json',import.meta.url)));
test('all thirteen original Python specimens have identical words, packets, geometry, and decoding',async()=>{
  for(const f of fixtures){const n=parse(f.notation),words=encode(n).words;assert.deepEqual(words,f.words);assert.deepEqual(packet(words),f.packet);assert.deepEqual(grid(packet(words)),f.cells);assert.equal(notation(decode(words)),notation(n));assert.equal(notation((await ungrid(f.cells)).ast),notation(n));}
});
test('all 64 foundational glyph patterns remain distinct',()=>{
  const values=new Set();for(let i=0;i<64;i++){const g=grid([i],1),bits=g.slice(2,5).flatMap(row=>row.slice(2,4)).join('');assert.equal(parseInt(bits,2),i);values.add(bits);}assert.equal(values.size,64);
});
test('integers remain exact beyond JavaScript safe-integer range',()=>{
  for(const n of [0n,31n,32n,37n,2n**64n,2n**256n-1n]){const r=new Reader(uint(n));assert.equal(r.uint(),n);const ast=parse(n.toString());assert.equal(notation(decode(encode(ast).words)),n.toString());}
  assert.throws(()=>new Reader([32,0]).uint(),/Noncanonical/);
});
test('UTF-8 literals preserve exact Unicode and reject invalid payloads',()=>{
  for(const text of ['', '你好', 'مرحبا', '🤝', 'é', 'e\u0301', '<script>alert(1)</script>', 'Quote " and newline\n'])assert.equal(decode(encode(literal(text)).words).value,text);
  assert.throws(()=>encode(literal('\ud800')),/Unicode/);
  assert.throws(()=>decode([IDS.TEXT,1,...byteWords(Uint8Array.from([255]))]),/literal/);
});
test('binding, arity, quotation closure and semantic type errors are rejected',()=>{
  for(const expression of ['V0','(SEE ME)','(ALL (CHILD V0) (SEE V2 ME))','(ALL (CHILD V0) (QUOTE V0))','(REF 0)','(TEXT 7)','(SYMBOL "")'])assert.throws(()=>parse(expression));
  assert.throws(()=>validateSemantic(parse('(NOT ME)')),/prop/);
  assert.equal(notation(parse('(LET (LAM (SEE V0 V0)) (ALL (PERSON V0) (APP V1 V0)))')),'(LET (LAM (SEE V0 V0)) (ALL (PERSON V0) (APP V1 V0)))');
});
test('60 multilingual constructions round-trip with the same formal meaning',()=>{
  for(const example of EXAMPLES)for(const language of LANGUAGES){const a=instantTranslate(example.text[language.code],language.code);assert.ok(a);assert.equal(notation(a.ast),example.expression);assert.equal(knownReading(a.ast,language.code),example.text[language.code]);}
});
test('English grammar composes quantified participants and preserves negation and tense',()=>{
  const cases={
    'You help me.':'(HELP YOU ME)',
    'I will help every child.':'(FUTURE (ALL (CHILD V0) (HELP ME V0)))',
    'Every scientist reads a book.':'(ALL (SCIENTIST V0) (SOME (BOOK V0) (READ V1 V0)))',
    'I do not see a bird.':'(NOT (SOME (BIRD V0) (SEE ME V0)))',
    'I saw the red bird.':'(PAST (SEE ME (THE (AND (BIRD V0) (RED V0)))))',
    'You believe every child sees a bird.':'(BELIEVE YOU (ALL (CHILD V0) (SOME (BIRD V0) (SEE V1 V0))))',
    'If I see you, then you help me.':'(IF (SEE ME YOU) (HELP YOU ME))'
  };
  for(const [text,expected] of Object.entries(cases))assert.equal(notation(instantTranslate(text,'en').ast),expected,text);
  assert.ok(instantTranslate('The weather on Mars is wonderful.','en'));
});
test('quantifier scope is distinguishable in an independent finite model',()=>{
  const children=['c1','c2'],birds=['b1','b2'],domain=[...children,...birds];
  function evaluate(n,g=[]){if(/^V/.test(n.op))return g[Number(n.op[1])];if(n.op==='CHILD')return children.includes(evaluate(n.args[0],g));if(n.op==='BIRD')return birds.includes(evaluate(n.args[0],g));if(n.op==='SEE')return [['c1','b1'],['c2','b2']].some(([a,b])=>a===evaluate(n.args[0],g)&&b===evaluate(n.args[1],g));if(n.op==='ALL')return domain.every(x=>!evaluate(n.args[0],[x,...g])||evaluate(n.args[1],[x,...g]));if(n.op==='SOME')return domain.some(x=>evaluate(n.args[0],[x,...g])&&evaluate(n.args[1],[x,...g]));throw new Error('Unexpected head.');}
  assert.equal(evaluate(EXAMPLES[3].ast),true);assert.equal(evaluate(EXAMPLES[4].ast),false);
  assert.notEqual(literalEnglish(EXAMPLES[3].ast),literalEnglish(EXAMPLES[4].ast));
});
test('all single-bit packet corruptions in original specimens are detected',async()=>{
  for(const f of fixtures)for(let i=0;i<f.packet.length;i++)for(let bit=0;bit<6;bit++){const p=[...f.packet];p[i]^=1<<bit;await assert.rejects(unpacket(p));}
});
test('Python-compatible compressed packets decode and reject malformed streams',async()=>{
  const body=encode(literal('a'.repeat(1000))).words,raw=packWords(body),b=new Uint8Array(deflateSync(raw,{level:9}));
  const make=bytes=>{const h=[2,...uint(bytes.length),...uint(body.length),...byteWords(bytes)],c=crc12(h);return [...h,c>>6,c&63];};
  assert.equal((await unpacket(make(b))).ast.value,'a'.repeat(1000));
  await assert.rejects(unpacket(make(b.slice(0,-1))));
  await assert.rejects(unpacket(make(Uint8Array.from([...b,0,0,0]))));
});
test('1000 deterministic random well-scoped syntax trees round-trip',()=>{
  let seed=91467;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
  function make(depth=0,bindings=0){if(depth>4||rand(4)===0)return bindings&&rand(2)?node(`V${rand(Math.min(3,bindings))}`):rand(2)?node('ME'):literal(['hello','你好','🤝',''][rand(4)]);if(rand(4)===0)return node('SOME',node('PERSON',node('V0')),make(depth+1,bindings+1));return node(['SEE','PAIR','AND','LOVE'][rand(4)],make(depth+1,bindings),make(depth+1,bindings));}
  for(let i=0;i<1000;i++){const n=make();assert.equal(notation(decode(encode(n).words)),notation(n));}
});
test('new concepts carry paid definitions and signatures inside the same decodable frame',async()=>{
  const content=parse('(CALL (SYMBOL "urn:silex:lex:happy") ME)'),lexicon=[{id:'urn:silex:lex:happy',roles:['entity'],definition:'Experiencing pleasure or contentment.'}];
  const ast=packageMeaning(content,lexicon),words=encode(ast).words;
  assert.ok(words.length>encode(content).words.length);
  const decoded=(await ungrid(grid(packet(words)))).ast;
  assert.deepEqual(unpackMeaning(decoded),{content,lexicon});
  assert.match(literalEnglish(decoded),/Experiencing pleasure/);
  assert.throws(()=>packageMeaning(content,[]),/definition/);
  assert.throws(()=>packageMeaning(content,[{...lexicon[0],roles:[]}]),/count/);
  assert.equal(notation(treeFromTokens(['CALL','urn:silex:lex:happy','ME'],lexicon)),notation(content));
  assert.equal(notation(treeFromTokens(['ALL','CHILD','V0','SOME','BIRD','V0','SEE','V1','V0'],[])),EXAMPLES[3].expression);
  assert.throws(()=>treeFromTokens(['CALL','SYMBOL','urn:silex:lex:happy','ME'],lexicon));
});
