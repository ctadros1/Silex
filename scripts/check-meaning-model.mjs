import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pipeline,env} from '@huggingface/transformers';
import createTokenizer from '../.parser-cache/browser-model/document-tokenizer.mjs';
import {documentSegments} from '../src/document-segments.js';
import {parseAmrSerial,encodeMeaningDocument} from '../src/meaning-graph.js';
import {compileMeaning,documentStatements} from '../src/semantic-compiler.js';
import {decodeCompactGraphs} from '../src/compact-graph.js';
import {taggedSentences,semanticFeatures} from '../src/semantic-features.js';
import {encode,decode,notation,packet,layout} from '../src/codec.js';
import {categories} from '../tests/sentence-corpus.mjs';
const tokenizer=await createTokenizer();tokenizer.FS.writeFile('/english.udpipe',await readFile('.parser-cache/browser-model/english.udpipe'));assert.ok(tokenizer.initModel('/english.udpipe'));
env.allowRemoteModels=false;env.localModelPath=process.cwd()+'/.parser-cache/';env.useFSCache=false;
const model=await pipeline('text2text-generation','meaning-model',{dtype:'q8',device:'cpu'});
const special=[
'I see the red bird. I see the red bird.',
'I see the red bird flying away.',
'I see you walking down the street.',
'Dr. Smith arrived at 3.14 p.m. He left.',
'  I can’t see João.\n\nHe said “Hello!”\t',
'The mitochondrion synthesizes adenosine triphosphate.',
'Zorblax recalibrated the cryogenic interferometer.',
'I said, "Do not open the door." She did not open it.',
'If nobody arrives, cancel the meeting; otherwise, call me.',
'Although the engine was repaired, the pilot refused to fly.',
'Every engineer who owns a telescope believes that a distant planet may support life.',
'I gave three books to Maria yesterday, but she returned only two.',
'Which train reaches the station before noon?',
'The report that Alice said Bob had written was missing.',
'I see the red bird. You see a blue bird. I see the red bird.',
'I eat pizza. I eat pizza. I eat pizza.',
];
let external=[];try{const corpus=await readFile('.parser-cache/ewt-test.conllu','utf8');const all=[...corpus.matchAll(/^# text = (.+)$/gm)].map(m=>m[1]);external=all.filter((s,i)=>i%31===0&&s.length<=700).slice(0,80);}catch{}
const inputs=[...special,...Object.values(categories).flat(),...external],results=[],failures=[];let warnings=0,statementCount=0,nativeStatements=0,oldGlyphs=0,newGlyphs=0,oldArea=0,newArea=0;const started=performance.now();
for(const [index,source] of inputs.entries()){
  try{
    const conllu=tokenizer.segmentDocument(source),segments=documentSegments(source,conllu),tags=taggedSentences(conllu),parts=[];
    for(const [sentenceIndex,sentence] of segments.entries()){const r=await model(sentence.trim(),{max_new_tokens:1024,num_beams:1,do_sample:false});const graph=parseAmrSerial(r[0].generated_text.trim());warnings+=graph.warnings.length;parts.push({source:sentence,graph,features:semanticFeatures(graph,tags[sentenceIndex])});}
    const analysis=compileMeaning(parts),ast=analysis.ast,encoded=encode(ast),decoded=decode(encoded.words);assert.equal(notation(decoded),notation(ast));const statements=documentStatements(decoded)||[decoded];assert.equal(statements.length,segments.length);statementCount+=segments.length;nativeStatements+=analysis.nativeStatements;
    for(const [i,statement] of statements.entries()){const d=decodeCompactGraphs(statement);if(d){assert.deepEqual(d.documents[0].nodes.map(n=>n.concept),parts[i].graph.nodes.map(n=>n.concept));assert.deepEqual(d.documents[0].edges.map(e=>({source:e.source,role:e.role,target:e.target})),parts[i].graph.edges);assert.deepEqual(d.documents[0].nodes.map(n=>n.flags),parts[i].features.flags);}}
    const previous=encode(encodeMeaningDocument(parts));oldGlyphs+=previous.words.length;newGlyphs+=encoded.words.length;const oldFrame=layout(packet(previous.words).length),newFrame=layout(packet(encoded.words).length);oldArea+=oldFrame.width*oldFrame.height;newArea+=newFrame.width*newFrame.height;
    if(index===0){assert.equal(segments.length,2);assert.equal(statements.length,2);assert.equal(notation(statements[0]),notation(statements[1]));assert.equal(encoded.words.length,14);}
    if(index===1){const g=decodeCompactGraphs(statements[0]).documents[0],flight=g.nodes.find(n=>n.concept==='fly-01'),bird=g.nodes.find(n=>n.concept==='bird');assert.ok(g.edges.some(e=>e.source===flight.id&&e.role==='ARG0'&&e.target.id===bird.id));}
    if(index===2){const g=decodeCompactGraphs(statements[0]).documents[0],walk=g.nodes.find(n=>n.concept==='walk-01'),you=g.nodes.find(n=>n.concept==='you');assert.ok(g.edges.some(e=>e.source===walk.id&&e.role==='ARG0'&&e.target.id===you.id));}
    results.push({source,graphs:parts.map(p=>p.graph),glyphs:encoded.words.length,oldGlyphs:previous.words.length,nativeStatements:analysis.nativeStatements,oldFrameModules:oldFrame.width*oldFrame.height,frameModules:newFrame.width*newFrame.height});
  }catch(e){failures.push({source,error:e.message});}
  if((index+1)%25===0)console.log(`${index+1}/${inputs.length} inputs tested; ${failures.length} failures`);
}
const report={inputs:inputs.length,statements:statementCount,nativeStatements,oldGlyphs,newGlyphs,oldArea,newArea,areaReduction:1-newArea/oldArea,externalInputs:external.length,failures,warnings,seconds:(performance.now()-started)/1000,results};await writeFile('.parser-cache/meaning-model-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,results:undefined},null,2));if(failures.length)process.exitCode=1;
