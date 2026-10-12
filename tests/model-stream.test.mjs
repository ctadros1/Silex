import test from 'node:test';
import assert from 'node:assert/strict';
import {readModelStream} from '../src/model-stream.js';
test('model streaming assembles exact Unicode JSON and reports actual output activity',async()=>{
  const activity=[],parameters={temperature:0,response_format:{type:'json_object'}};
  async function* chunks(){for(const content of ['{"sense":','"café',' 🦜"}'])yield {choices:[{delta:{content}}]};yield {choices:[]};}
  const reply=await readModelStream(async request=>{assert.equal(request.stream,true);assert.equal(request.response_format.type,'json_object');return chunks();},parameters,()=>{},event=>activity.push(event));
  assert.deepEqual(JSON.parse(reply.choices[0].message.content),{sense:'café 🦜'});
  assert.equal(activity.length,3);assert.equal(activity.at(-1).characters,reply.choices[0].message.content.length);
});
test('stopping between output chunks closes the stream and prevents stale output',async()=>{
  let stopped=false,closed=false,reported=0;
  async function* chunks(){try{yield {choices:[{delta:{content:'first'}}]};stopped=true;yield {choices:[{delta:{content:'stale'}}]};}finally{closed=true;}}
  await assert.rejects(readModelStream(async()=>chunks(),{},()=>{if(stopped)throw Error('Translation stopped.');},()=>reported++),/stopped/);
  assert.equal(closed,true);assert.equal(reported,1);
});
test('an already cancelled translation never starts another model request',async()=>{
  let calls=0;await assert.rejects(readModelStream(async()=>{calls++;},{},()=>{throw Error('Translation stopped.');}),/stopped/);assert.equal(calls,0);
});
test('empty model output and model failures are errors rather than empty successes',async()=>{
  async function* empty(){yield {choices:[{delta:{}}]};}
  await assert.rejects(readModelStream(async()=>empty(),{},()=>{}),/no response/);
  await assert.rejects(readModelStream(async()=>{throw Error('GPU failure');},{},()=>{}),/GPU failure/);
});
