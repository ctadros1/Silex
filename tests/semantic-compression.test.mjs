import test from 'node:test';
import assert from 'node:assert/strict';
import {encode,decode,notation,packet,grid,ungrid,parse,layout} from '../src/codec.js';
import {parseAmrSerial,encodeMeaningDocument} from '../src/meaning-graph.js';
import {compileNativeGraph,compileMeaning,documentStatements,semanticReading} from '../src/semantic-compiler.js';
import {encodeCompactGraphs,decodeCompactGraphs} from '../src/compact-graph.js';
import {CONCEPTS,RELATIONS} from '../src/semantic-codebook.js';
import {semanticFeatures,taggedSentences} from '../src/semantic-features.js';
import {interpretStatements} from '../src/document-interpreter.js';
import {readFile} from 'node:fs/promises';
const graph=s=>parseAmrSerial(s),part=(s,flags=[])=>({graph:graph(s),features:{flags,notes:[]},source:'not included in exports'});
const see='( see-01 :ARG0 ( i ) :ARG1 ( you ) )';
const bird='( see-01 :ARG0 ( i ) :ARG1 ( bird :ARG1-of ( red-02 ) ) )';
function body(ast){return encode(ast).words;}
test('the simplest sentence uses exactly the original three semantic glyphs',()=>{
  const a=compileMeaning([part(see)]);assert.equal(notation(a.ast),'(SEE ME YOU)');assert.equal(body(a.ast).length,3);assert.equal(a.nativeStatements,1);assert.equal(notation(decode(body(a.ast))),'(SEE ME YOU)');
  const frame=layout(packet(body(a.ast)).length);assert.equal(frame.width*frame.height,120);
});
test('large ordered documents remain bounded in depth and retain every occurrence',()=>{
  const p=part(bird,[0,0,2,0]),a=compileMeaning(Array.from({length:300},()=>p)),decoded=decode(body(a.ast));
  const statements=documentStatements(decoded);assert.equal(statements.length,300);assert.equal(notation(statements[0]),notation(statements[299]));assert.ok(body(a.ast).length<300*8);
});
test('identical statements reuse model work within a request without deleting occurrences',async()=>{
  let calls=0;const parts=await interpretStatements(['I see you. ','I see you.'],[[],[]],async()=>{calls++;return see;});
  assert.equal(calls,1);assert.equal(parts.length,2);assert.equal(documentStatements(compileMeaning(parts).ast).length,2);
  await interpretStatements(['I see you.'],[[]],async()=>{calls++;return see;});assert.equal(calls,2);
});
test('repeated long literal values are paid once and retain string/number distinctions',()=>{
  const digits='900719925474099312345',p=part(`( value :a ${digits} :b "${digits}" :c "${digits}" )`),ast=encodeCompactGraphs([p]),d=decodeCompactGraphs(decode(body(ast)));
  assert.deepEqual(d.documents[0].edges.map(e=>e.target.type),['number','string','string']);assert.ok(d.documents[0].edges.every(e=>e.targetDefinitionField));assert.equal(d.strings.filter(s=>s===digits).length,1);
});
test('the downloadable codebook exactly matches the shared decoder indexes',async()=>{
  const data=JSON.parse(await readFile(new URL('../reference/Semantic-Codebook.json',import.meta.url),'utf8'));assert.deepEqual(data.concepts,CONCEPTS);assert.deepEqual(data.roles,RELATIONS);
});
test('definiteness, negation, time and question scope use native operators',()=>{
  assert.equal(notation(compileMeaning([part(bird,[0,0,2,0])]).ast),'(SEE ME (THE (AND (BIRD V0) (RED V0))))');
  const a=compileMeaning([part('( see-01 :ARG0 ( you ) :ARG1 ( i ) :polarity - :mode interrogative )',[16,0,0])]);assert.equal(notation(a.ast),'(ASK (PAST (NOT (SEE YOU ME))))');
  assert.equal(notation(compileMeaning([part(see,[32,0,0])]).ast),'(FUTURE (SEE ME YOU))');
});
test('native quantifiers are compiled structurally, never as source bytes',()=>{
  const p=part('( see-01 :ARG0 ( child :mod ( every ) ) :ARG1 ( bird ) )',[0,3,0,1]);
  assert.equal(notation(compileMeaning([p]).ast),'(ALL (CHILD V0) (SOME (BIRD V0) (SEE V1 V0)))');
  p.features.order=[null,3,null,1];
  assert.equal(notation(compileMeaning([p]).ast),'(SOME (BIRD V0) (ALL (CHILD V0) (SEE V0 V1)))');
});
test('two repeated assertions share a closed definition and remain two ordered items',()=>{
  const p=part(bird,[0,0,2,0]),a=compileMeaning([p,p]);assert.equal(a.ast.op,'LET');assert.equal(body(a.ast).length,14);
  const decoded=decode(body(a.ast)),statements=documentStatements(decoded);assert.equal(statements.length,2);assert.equal(notation(statements[0]),notation(statements[1]));assert.equal(semanticReading(decoded).match(/Statement /g).length,2);
});
test('every modifier and grammatical feature survives native compilation or a graph escape',()=>{
  for(const p of [part('( see-01 :ARG0 ( i ) :ARG1 ( you ) :location ( city ) )'),part(see,[64,0,0]),part('( see-01 :ARG0 ( i ) :ARG1 ( bird :quant 3 ) )')]){
    assert.equal(compileNativeGraph(p.graph,p.features).native,false);const a=compileMeaning([p]);assert.equal(a.nativeStatements,0);const d=decodeCompactGraphs(decode(body(a.ast)));assert.deepEqual(d.documents[0].edges.map(e=>({source:e.source,role:e.role,target:e.target})),p.graph.edges);assert.deepEqual(d.documents[0].nodes.map(n=>n.flags),p.graph.nodes.map((_,i)=>p.features.flags[i]||0));
  }
});
test('open vocabulary declares concepts, not the input sentence or JSON',()=>{
  const p=part('( recalibrate-01 :ARG0 ( person :name ( name :op1 "João" ) ) :ARG1 ( interferometer :mod ( cryogenic ) ) )');p.source='João recalibrated the cryogenic interferometer.';
  const ast=compileMeaning([p]).ast,expression=notation(ast);assert.ok(!expression.includes(p.source));assert.ok(!expression.includes('schema'));assert.ok(!expression.includes('source'));assert.ok(expression.includes('recalibrate-01'));
  const old=encodeMeaningDocument([p]);assert.ok(body(ast).length<body(old).length);
});
test('compact typed values, local identities, cycles and Unicode round-trip independently',async()=>{
  const p=part('( value :a 900719925474099312345 :b "900719925474099312345" :c - :d "雪" :self value )');
  const ast=encodeCompactGraphs([p,p]),words=body(ast),frame=grid(packet(words));const decoded=decode((await ungrid(frame)).body),d=decodeCompactGraphs(decoded);
  assert.equal(d.documents.length,2);assert.deepEqual(d.documents[0].edges.map(e=>e.target),p.graph.edges.map(e=>e.target));assert.equal(d.documents[0].nodes.length,1);
});
test('codebook entries are distinct; unknown concepts cannot alias known codes',()=>{
  assert.equal(new Set(CONCEPTS).size,CONCEPTS.length);assert.equal(new Set(RELATIONS).size,RELATIONS.length);
  const ast=encodeCompactGraphs([part('( quux :ARG0 ( i ) )')]);const d=decodeCompactGraphs(ast);assert.equal(d.documents[0].nodes[0].concept,'quux');
  const bad=parse(notation(ast));bad.args[2].args[1].args[0].args[1].value='99999';assert.throws(()=>decodeCompactGraphs(bad),/range/);
});
test('learned det/aux and morphology annotations preserve definite, future and ongoing distinctions',()=>{
  const raw='1\tI\tI\tPRON\t_\t_\t3\tnsubj\t_\t_\n2\twill\twill\tAUX\t_\tVerbForm=Fin\t3\taux\t_\t_\n3\tsee\tsee\tVERB\t_\tVerbForm=Inf\t0\troot\t_\t_\n4\tthe\tthe\tDET\t_\t_\t6\tdet\t_\t_\n5\tred\tred\tADJ\t_\t_\t6\tamod\t_\t_\n6\tbird\tbird\tNOUN\t_\tNumber=Sing\t3\tobj\t_\t_';
  const f=semanticFeatures(graph(bird),taggedSentences(raw)[0]);assert.deepEqual(f.flags,[32,0,2,0]);assert.equal(notation(compileMeaning([{graph:graph(bird),features:f}]).ast),'(FUTURE (SEE ME (THE (AND (BIRD V0) (RED V0)))))');
});
test('conditional auxiliaries survive compact encoding without becoming past or future tense',()=>{
  const raw='1\tI\tI\tPRON\t_\t_\t3\tnsubj\t_\t_\n2\twould\twill\tAUX\t_\tTense=Past|VerbForm=Fin\t3\taux\t_\t_\n3\tsee\tsee\tVERB\t_\tVerbForm=Inf\t0\troot\t_\t_\n4\tyou\tyou\tPRON\t_\t_\t3\tobj\t_\t_';
  const g=graph(see),features=semanticFeatures(g,taggedSentences(raw)[0]);assert.deepEqual(features.flags,[512,0,0]);
  const result=compileMeaning([{graph:g,features}]);assert.equal(result.nativeStatements,0);
  assert.equal(decodeCompactGraphs(decode(body(result.ast))).documents[0].nodes[0].flags,512);
  assert.match(semanticReading(result.ast),/conditional modality/);
});
