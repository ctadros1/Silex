import test from 'node:test';
import assert from 'node:assert/strict';
import {instantTranslate,assertModelAnalysis} from '../src/language.js';
import {unpackMeaning,packageMeaning} from '../src/lexicon.js';
import {auditCoverage} from '../src/coverage.js';
import {treeFromNamedTokens} from '../src/semantic-plan.js';
import {encode,decode,notation,node} from '../src/codec.js';
import {englishAnalysis,meaningTreeAnalysis} from '../src/english.js';

export const everyday=[
  'I see you walking down the street.','I hear you singing.','I watch a child running through the park.',
  'Every child sees a person walking down a street.','I am happy.','She is not hungry.',
  'The cat sits on the mat.','I have a dog.','I like pizza.','Alice gave me a book.',
  'I sent a message to Bob.','The dog is sleeping.','My dog runs quickly.',
  'The weather on Mars is wonderful.','I am in the park.','A red bird is on the table.',
  'We are reading a book.','He bought a car yesterday.','You will help every child.',
  'No child sees a bird.','Every scientist reads a book.','I do not see a bird.',
  'I saw the red bird.','You believe every child sees a bird.','If I see you, then you help me.',
  'I can read a book.','Did you see a bird?','Are you happy?','The robot builds a machine.',
  'I love music.','I drink coffee.','I am tired because I work.',
  'The teacher knows every student reads a book.','I see a big blue bird.','I need my phone.'
];
test('35 everyday sentences retain grounded content and round-trip as semantic expressions',()=>{
  for(const sentence of everyday){
    const result=instantTranslate(sentence,'en');assert.ok(result,sentence);
    const {content,lexicon}=unpackMeaning(result.ast);assert.notEqual(content.op,'TEXT',sentence);
    assertModelAnalysis(content,lexicon);auditCoverage(content,lexicon,sentence);
    assert.equal(notation(decode(encode(result.ast).words)),notation(result.ast),sentence);
  }
});
test('perception preserves the walker, observer, ongoing event and route in independent countermodels',()=>{
  const ast=unpackMeaning(instantTranslate(everyday[0],'en').ast).content;
  const domain=['speaker','addressee','walking-event','street'];
  function truth({walker='addressee',observer='speaker',path='street',seesEvent=true,ongoing=true}={}){
    const relations={
      'urn:silex:lex:walk-event-ongoing':[[...(ongoing?['walking-event',walker]:[])]],
      'urn:silex:lex:street':[['street']],
      'urn:silex:lex:relation-down':[['walking-event',path]],
      SEE:[[observer,'addressee'],...(seesEvent?[[observer,'walking-event']]:[])]
    };
    function evalNode(n,env=[]){
      const ev=x=>evalNode(x,env);
      if(n.op==='ME')return 'speaker';if(n.op==='YOU')return 'addressee';if(n.op==='TRUE')return true;
      if(/^V[012]$/.test(n.op))return env[Number(n.op[1])];
      if(n.op==='THE'){const matches=domain.filter(x=>evalNode(n.args[0],[x,...env]));return matches.length===1?matches[0]:undefined;}
      if(n.op==='SOME')return domain.some(x=>evalNode(n.args[0],[x,...env])&&evalNode(n.args[1],[x,...env]));
      if(n.op==='AND')return ev(n.args[0])&&ev(n.args[1]);
      const id=n.op==='CALL'?n.args[0].value:n.op,args=(n.op==='CALL'?n.args.slice(1):n.args).map(ev);
      return (relations[id]||[]).some(row=>row.length===args.length&&row.every((x,i)=>x===args[i]));
    }
    return evalNode(ast);
  }
  assert.equal(truth(),true);
  for(const changed of [{walker:'speaker'},{observer:'addressee'},{path:'addressee'},{seesEvent:false},{ongoing:false}])assert.equal(truth(changed),false,JSON.stringify(changed));
});
test('unused definitions cannot disguise a dropped walking event or path',()=>{
  const complete=unpackMeaning(instantTranslate(everyday[0],'en').ast);
  assert.throws(()=>auditCoverage(node('SEE',node('ME'),node('YOU')),complete.lexicon,everyday[0]),/walking.*down.*street/);
  const n=treeFromNamedTokens(['SOME','$event','CALL','urn:silex:lex:walk-event-ongoing','$event','YOU','SEE','ME','$event'],complete.lexicon);
  assert.throws(()=>auditCoverage(n,complete.lexicon,everyday[0]),/down.*street/);
  assert.throws(()=>auditCoverage(node('SEE',node('ME'),node('YOU')),[],'I do not see you.'),/negation/);
});
test('named scopes compile without model arithmetic, including distances beyond V2',()=>{
  const n=treeFromNamedTokens(['ALL','$a','PERSON','$a','ALL','$b','PERSON','$b','ALL','$c','PERSON','$c','ALL','$d','PERSON','$d','SEE','$a','$d']);
  assert.match(notation(n),/SEE \(REF 3\) V0/);
  assert.throws(()=>treeFromNamedTokens(['SEE','$unknown','ME']),/Unbound/);
});
test('open vocabulary is independent of the small built-in head inventory',()=>{
  const definitions=Array.from({length:20},(_,i)=>({id:'urn:silex:lex:independent-sense-'+i,roles:['entity'],definition:'The entity has independently stipulated property number '+i+'.'}));
  const predicates=definitions.map(d=>node('CALL',{op:'SYMBOL',args:[],value:d.id},node('ME'))),content=predicates.reduce((a,b)=>node('AND',a,b));
  const ast=packageMeaning(content,definitions);assert.equal(unpackMeaning(decode(encode(ast).words)).lexicon.length,20);
});
test('contextual vocabulary extends the grammar and composes relative clauses with belief and modality',()=>{
  const senses=[
    {stem:'engineer',kind:'noun',definition:'A person who designs or maintains technical systems.',forms:['engineers']},
    {stem:'telescope',kind:'noun',definition:'An optical instrument for observing distant objects.',forms:['telescopes']},
    {stem:'own',kind:'verb',definition:'Have legal or contextual possession of the object.',arity:2,forms:['owns'],past:['owned'],progressive:'owning'},
    {stem:'support',kind:'verb',definition:'Provide the conditions necessary for the object to persist.',arity:2,forms:['supports'],past:['supported'],progressive:'supporting'},
    {stem:'distant',kind:'adjective',definition:'Far from the contextually designated reference location.',forms:[]},
    {stem:'life',kind:'noun',definition:'Living organisms or the condition of being alive.',forms:[]}
  ];
  const sentence='Every engineer who owns a telescope believes that a distant planet may support life.';
  const analysis=englishAnalysis(sentence,senses),{content,lexicon}=unpackMeaning(analysis.ast);
  assertModelAnalysis(content,lexicon);auditCoverage(content,lexicon,sentence);
  assert.equal(content.op,'ALL');assert.equal(content.args[0].op,'AND');
  assert.equal(content.args[1].op,'BELIEVE');assert.equal(content.args[1].args[0].op,'V0');
  assert.equal(content.args[1].args[1].op,'SOME');assert.equal(content.args[1].args[1].args[1].op,'POSSIBLE');
  assert.equal(lexicon.filter(e=>e.id.endsWith(':own')).length,1);
  // Extensions do not mutate another translation's inventory.
  assert.equal(instantTranslate('An engineer owns a telescope.','en'),null);
});
test('cardinality and modal negation are encoded rather than inferred from a discarded word',()=>{
  for(const source of ['I have two dogs.','The birds are red.','I should not drink coffee.','You may not see me.']){
    const analysis=instantTranslate(source,'en');assert.ok(analysis,source);const m=unpackMeaning(analysis.ast);auditCoverage(m.content,m.lexicon,source);
  }
  assert.match(notation(unpackMeaning(instantTranslate('I have two dogs.','en').ast).content),/cardinality.*V0 2/);
  assert.match(notation(unpackMeaning(instantTranslate('I should not drink coffee.','en').ast).content),/^\(OUGHT \(NOT /);
  assert.equal(notation(instantTranslate('You may not see me.','en').ast),'(POSSIBLE (NOT (SEE YOU ME)))');
});
test('meaning trees compile open predicates and proposition roles without model-created glyphs',()=>{
  const definitions=[
    {name:'pilot',kind:'noun',roles:['entity'],definition:'A person who operates an aircraft.'},
    {name:'fly',kind:'relation',roles:['actor'],definition:'The actor travels through the air in an aircraft.'},
    {name:'refuse',kind:'relation',roles:['agent','content'],definition:'The agent declines to bring about the content; its occurrence is not asserted.'}
  ];
  const a=meaningTreeAnalysis('The pilot refused to fly.',['past',['refuse','the pilot',['fly','the pilot']]],definitions),m=unpackMeaning(a.ast);
  assertModelAnalysis(m.content,m.lexicon);auditCoverage(m.content,m.lexicon,'The pilot refused to fly.');
  assert.equal(m.content.op,'PAST');assert.equal(m.content.args[0].op,'CALL');assert.equal(m.content.args[0].args[2].op,'CALL');
  assert.equal(notation(meaningTreeAnalysis('Every child sees a bird.',['see',['every','child'],['a','bird']],[]).ast),'(ALL (CHILD V0) (SOME (BIRD V0) (SEE V1 V0)))');
  assert.throws(()=>meaningTreeAnalysis('I see you.',['see','I',['see','I','you']],[]),/entity/);
});
test('passive, concession and control clauses preserve unnamed actors and unasserted actions',()=>{
  const senses=[
    {stem:'engine',kind:'noun',definition:'A machine that converts energy into mechanical motion.',forms:['engines']},
    {stem:'pilot',kind:'noun',definition:'A person who operates an aircraft.',forms:['pilots']},
    {stem:'repair',kind:'verb',definition:'The actor restores the object to good working condition.',arity:2,forms:['repairs'],past:['repaired'],progressive:'repairing'},
    {stem:'fly',kind:'verb',definition:'The actor travels through the air in an aircraft.',arity:1,forms:['flies'],past:['flew','flown'],progressive:'flying'}
  ];
  const source='Although the engine was repaired, the pilot refused to fly.',a=englishAnalysis(source,senses),m=unpackMeaning(a.ast);
  assertModelAnalysis(m.content,m.lexicon);auditCoverage(m.content,m.lexicon,source);
  assert.equal(m.content.op,'CALL');assert.equal(m.content.args[0].value,'urn:silex:lex:although');
  assert.equal(m.content.args[1].op,'PAST');assert.equal(m.content.args[1].args[0].op,'SOME');
  const negative=unpackMeaning(englishAnalysis('The engine was not repaired.',senses).ast).content;
  assert.equal(negative.op,'PAST');assert.equal(negative.args[0].op,'NOT');assert.equal(negative.args[0].args[0].op,'SOME');
});
