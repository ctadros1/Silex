import test from 'node:test';
import assert from 'node:assert/strict';
import {meaningTreeAnalysis} from '../src/english.js';
import {assertModelAnalysis} from '../src/language.js';
import {unpackMeaning} from '../src/lexicon.js';
import {auditCoverage} from '../src/coverage.js';
import {encode,decode,notation} from '../src/codec.js';
const relation=(name,roles,definition)=>({name,kind:'relation',roles,definition});
const constructions=[
  {source:'Please help every child.',tree:['please','you',['help','you',['every','child']]],definitions:[relation('please',['addressee','action'],'A polite request that the addressee bring about the action; it does not assert that the action occurs.')],root:'CALL'},
  {source:'The tree is taller than the house.',tree:['taller','the tree','the house'],definitions:[relation('taller',['first-entity','second-entity'],'The first entity has a greater vertical height than the second entity in the same contextual measurement frame.')],root:'CALL'},
  {source:'Why did the bird fly away?',tree:['ask',['why',['past',['some','$e',['and',['fly-event','$e','the bird'],['away','$e']],['true']]]]],definitions:[relation('why',['content'],'Request the explanatory reason why the content proposition holds.'),relation('fly-event',['event','actor'],'The event is a flight through the air by the actor.'),relation('away',['event'],'The event is directed farther from the contextually designated reference point.')],root:'ASK'},
  {source:'Until the child sleeps, I wait.',tree:['until',['sleep','the child'],['wait','I']],definitions:[relation('until',['ending-condition','continuing-action'],'The continuing wait action holds throughout the contextual interval ending when the ending condition sleeps becomes true.'),relation('sleep',['actor'],'The actor is in the physiological state of sleep.'),relation('wait',['actor'],'The actor remains available until a contextual event or time.')],root:'CALL'},
  {source:'I say "a red bird flies."',tree:['say','I',['text','a red bird flies.']],definitions:[],root:'SAY'},
  {source:'If I had wings, I would fly.',tree:['counterfactual',['have','I','wings'],['fly','I']],definitions:[{name:'wings',kind:'noun',roles:['entity'],definition:'A contextually designated pair of wings capable of supporting flight.'},relation('have',['actor','object'],'The actor possesses or has available the object.'),relation('fly',['actor'],'The actor moves through the air by flight.'),relation('counterfactual',['antecedent','consequent'],'If the antecedent had held, the consequent would hold in the contextually selected closest antecedent worlds; neither clause is asserted in the actual world.')],root:'CALL'}
];
for(const c of constructions)test(`open construction: ${c.source}`,()=>{
  const result=meaningTreeAnalysis(c.source,c.tree,c.definitions),m=unpackMeaning(result.ast);
  assert.equal(m.content.op,c.root);assertModelAnalysis(m.content,m.lexicon);auditCoverage(m.content,m.lexicon,c.source);
  assert.equal(notation(decode(encode(result.ast).words)),notation(result.ast));
});
test('quoted speech remains quotation while a request does not assert the requested action',()=>{
  const quote=unpackMeaning(meaningTreeAnalysis(constructions[4].source,constructions[4].tree,[]).ast).content;
  assert.equal(quote.args[1].op,'TEXT');assert.equal(quote.args[1].value,'a red bird flies.');
  const request=unpackMeaning(meaningTreeAnalysis(constructions[0].source,constructions[0].tree,constructions[0].definitions).ast).content;
  assert.equal(request.args[2].op,'ALL');assert.equal(request.args[2].args[1].op,'HELP');
});
test('a model cannot redefine SEE to accept a proposition in place of an entity',()=>{
  const override=relation('see',['viewer','content'],'The viewer perceives a proposition visually.');
  assert.throws(()=>meaningTreeAnalysis('I see you run.',['see','I',['run','you']],[override]),/entity/);
  const ast=meaningTreeAnalysis('I see you.',['see','I','you'],[override]).ast;
  assert.equal(notation(ast),'(SEE ME YOU)');
});
