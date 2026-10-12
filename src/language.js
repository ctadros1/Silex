import {literal, notation, parse, roles} from './codec.js';
import {unpackMeaning,validateLexicon} from './lexicon.js';
import {englishAnalysis} from './english.js';
import {resolveLexical,lexicalTypes} from './logic-vocabulary.js';
export const LANGUAGES = [
  ['en','English'],['es','Español'],['fr','Français'],['de','Deutsch'],['it','Italiano'],['pt','Português'],
  ['zh','中文'],['ja','日本語'],['ko','한국어'],['ar','العربية'],['hi','हिन्दी'],['ru','Русский']
].map(([code,name])=>({code,name}));
const examples = [
  ['(SEE ME YOU)', {
    en:'I see you.',es:'Te veo.',fr:'Je te vois.',de:'Ich sehe dich.',it:'Ti vedo.',pt:'Eu vejo você.',zh:'我看见你。',ja:'私はあなたを見ます。',ko:'나는 당신을 봅니다.',ar:'أنا أراك.',hi:'मैं तुम्हें देखता हूँ।',ru:'Я вижу тебя.'
  }],
  ['(NOT (SEE ME YOU))',{
    en:'I do not see you.',es:'No te veo.',fr:'Je ne te vois pas.',de:'Ich sehe dich nicht.',it:'Non ti vedo.',pt:'Eu não vejo você.',zh:'我没有看见你。',ja:'私はあなたを見ません。',ko:'나는 당신을 보지 않습니다.',ar:'أنا لا أراك.',hi:'मैं तुम्हें नहीं देखता हूँ।',ru:'Я не вижу тебя.'
  }],
  ['(SEE ME (THE (AND (BIRD V0) (RED V0))))',{
    en:'I see the red bird.',es:'Veo el pájaro rojo.',fr:'Je vois l’oiseau rouge.',de:'Ich sehe den roten Vogel.',it:'Vedo l’uccello rosso.',pt:'Eu vejo o pássaro vermelho.',zh:'我看见那只红色的鸟。',ja:'私はその赤い鳥を見ます。',ko:'나는 그 빨간 새를 봅니다.',ar:'أرى الطائر الأحمر.',hi:'मैं उस लाल पक्षी को देखता हूँ।',ru:'Я вижу красную птицу.'
  }],
  ['(ALL (CHILD V0) (SOME (BIRD V0) (SEE V1 V0)))',{
    en:'Every child sees a bird.',es:'Cada niño ve un pájaro.',fr:'Chaque enfant voit un oiseau.',de:'Jedes Kind sieht einen Vogel.',it:'Ogni bambino vede un uccello.',pt:'Cada criança vê um pássaro.',zh:'每个孩子都看见一只鸟。',ja:'すべての子供が鳥を一羽見ます。',ko:'모든 아이는 새 한 마리를 봅니다.',ar:'كل طفل يرى طائراً.',hi:'हर बच्चा एक पक्षी को देखता है।',ru:'Каждый ребёнок видит птицу.'
  }],
  ['(SOME (BIRD V0) (ALL (CHILD V0) (SEE V0 V1)))',{
    en:'There is a bird that every child sees.',es:'Hay un pájaro que todos los niños ven.',fr:'Il existe un oiseau que chaque enfant voit.',de:'Es gibt einen Vogel, den jedes Kind sieht.',it:'C’è un uccello che ogni bambino vede.',pt:'Existe um pássaro que toda criança vê.',zh:'有一只鸟，每个孩子都看见它。',ja:'すべての子供が見る鳥が一羽います。',ko:'모든 아이가 보는 새 한 마리가 있습니다.',ar:'يوجد طائر يراه كل طفل.',hi:'एक ऐसा पक्षी है जिसे हर बच्चा देखता है।',ru:'Есть птица, которую видит каждый ребёнок.'
  }]
];
export const EXAMPLES=examples.map(([expression,text],i)=>({id:i,expression,ast:parse(expression),text}));
const normalize=s=>s.normalize('NFC').toLowerCase().replace(/[’‘]/g,"'").replace(/[.!?。！？،,;；\s]+/g,' ').trim();
export function knownReading(ast,language='en'){return EXAMPLES.find(e=>e.expression===notation(ast))?.text[language]||null;}
export function instantTranslate(text,language){
  const clean=normalize(text),matched=EXAMPLES.find(e=>normalize(e.text[language]||'')===clean);
  if(matched)return {ast:parse(matched.expression),method:'Local grammar',assumptions:scopeNotes(matched.ast)};
  if(language==='en') {try{const result=englishAnalysis(text);assertModelAnalysis(unpackMeaning(result.ast).content,unpackMeaning(result.ast).lexicon);return {...result,assumptions:[...scopeNotes(result.ast),...result.assumptions]};}catch{return null;}}
  return null;
}
function visit(n,fn){fn(n);n.args.forEach(a=>visit(a,fn));}
export function scopeNotes(n){
  const ops=new Set();visit(n,t=>ops.add(t.op));const out=[];
  if(ops.has('THE'))out.push('“The” selects exactly one matching entity in the shared context; zero or multiple matches cause a presupposition failure.');
  if(ops.has('ALL')&&ops.has('SOME'))out.push('Quantifier order matters. An existential inside “every” may pick a different entity for each participant.');
  if(ops.has('IF'))out.push('IF means material implication. Counterfactual or causal readings need a separately defined operator.');
  if(ops.has('PAST')||ops.has('FUTURE'))out.push('Tense means “at some earlier/later time”; aspect and precise dates are not inferred.');
  if(ops.has('KNOW'))out.push('KNOW is factive: its content is asserted true in the evaluation context.');
  if(ops.has('BELIEVE'))out.push('BELIEVE does not assert that the believed proposition is true.');
  return out;
}
export const DESCRIPTIONS={
  TRUE:'A proposition that is always true.',FALSE:'A proposition that is always false.',NOT:'Negates one proposition.',AND:'Both propositions hold.',OR:'At least one proposition holds.',IF:'Material implication: if the antecedent is true, the consequent is true.',ALL:'Introduces a variable, restricts it, then asserts the body for every match.',SOME:'Introduces a variable and requires at least one value satisfying restriction and body.',LAM:'Defines a function with one bound argument.',APP:'Applies a function to an argument.',LET:'Defines a reusable local value. The second child can refer to it.',EQ:'Equality of the two values.',AT:'Evaluates a proposition in an explicit context.',SAY:'Records an agent expressing a proposition or exact text.',KNOW:'Factive knowledge of a proposition.',BELIEVE:'An agent believes a proposition; its truth is not asserted.',CAUSE:'A declared causal relation between two events.',BEFORE:'The first event ends before the second starts.',PAIR:'An ordered pair of values.',NIL:'An empty sequence.',NAT:'An exact natural number followed by a variable-length integer.',TEXT:'Exact UTF-8 text with a byte count. The wording is preserved as a literal.',REF:'A reference to an outer binding at the encoded distance.',SYMBOL:'A semantic identifier that must have shared or paid grounding.',CALL:'Calls the function with an explicitly counted list of arguments.',THE:'The uniquely matching entity in the declared context.',QUOTE:'A closed Silex expression treated as exact syntax.',ME:'The utterance speaker.',YOU:'The utterance addressee.',NOW:'The utterance context.',PAST:'The proposition holds at some earlier time.',FUTURE:'The proposition holds at some later time.',POSSIBLE:'The proposition holds in some accessible world.',NECESSARY:'The proposition holds in every accessible world.',WANT:'An agent desires the proposition.',OUGHT:'The proposition holds in every designated ideal world.',ASK:'A question requesting a truth value or satisfying answer.',CHILD:'The entity is a child.',BIRD:'The entity is a bird.',RED:'The entity is red.',SEE:'Viewer first, viewed entity second.',GIVE:'Giver first, given entity second, recipient third.',LOVE:'Lover first, loved entity second.',PERSON:'The entity is a person.',BOOK:'The entity is a book.',READ:'Reader first, read entity second.',BUILD:'Builder first, built entity second.',SCIENTIST:'The entity is a scientist.',CITY:'The entity is a city.',LIVE:'Resident first, inhabited place second.',HELP:'Helper first, helped entity second.',REMEMBER:'Rememberer first, remembered value second.',DIE:'The entity dies in the evaluation context.',MACHINE:'The entity is a machine.',SOLVE:'Solver first, problem second.',PROBLEM:'The entity is a problem.',PROVE:'Prover first, proved proposition second.',FAIL:'The entity or project fails in the evaluation context.',RUN:'The entity runs in the evaluation context.',WATER:'The water substance/type value.',DRINK:'Drinker first, consumed value second.'
};
export function explainRecord(record){
  if(record.kind!=='head')return `${record.kind}: six-bit value ${record.value}. This is payload data belonging to ${record.op}; its numerical resemblance to a head does not change its role.`;
  if(/^V[012]$/.test(record.op)||record.op==='REF'){const i=record.op==='REF'?Number(record.node.value):Number(record.op[1]);return `Refers to ${record.environment[i]||'the corresponding bound value'}. Distance ${i} counts outward from the current scope.`;}
  return DESCRIPTIONS[record.op]||'A compositional Silex head.';
}
const predicates={CHILD:'a child',BIRD:'a bird',RED:'red',PERSON:'a person',BOOK:'a book',SCIENTIST:'a scientist',CITY:'a city',MACHINE:'a machine',PROBLEM:'a problem'};
const relations={SEE:'see',LOVE:'love',READ:'read',BUILD:'build',LIVE:'live in',HELP:'help',REMEMBER:'remember',SOLVE:'solve',PROVE:'prove',DRINK:'drink'};
function property(n){if(predicates[n.op]&&n.args[0]?.op==='V0')return predicates[n.op].replace(/^a /,'');if(n.op==='AND'){const a=property(n.args[0]),b=property(n.args[1]);if(a&&b)return n.args[1].op==='RED'?`${b} ${a}`:`${a} and ${b}`;}return null;}
export function literalEnglish(n,env=[],lexicon=new Map()) {
  const packaged=unpackMeaning(n);
  if(packaged.lexicon.length){const m=new Map(packaged.lexicon.map(e=>[e.id,e]));return `${literalEnglish(packaged.content,env,m)}. Definitions included in this image: ${packaged.lexicon.map(e=>`${e.id.split(':').at(-1)} = ${e.definition} (roles: ${e.roles.join(', ')||'none'})`).join('; ')}`;}
  const a=i=>literalEnglish(n.args[i],env,lexicon),op=n.op;
  if(op==='LEX'){
    const e=resolveLexical(n),label=e.key.split('.')[0].replaceAll('_',' '),args=n.args.map((_,i)=>a(i));
    const constants={WE:'we',HE:'he',SHE:'she',IT:'it',THEY:'they'};if(constants[e.key])return constants[e.key];
    const relations={ACROSS:'moves across',THROUGH:'moves through',DOWN:'moves along',TOWARD:'moves toward',IN:'is inside',ON:'is on',UNDER:'is under',OVER:'is over',BESIDE:'is beside',AT_PLACE:'is at',FROM:'originates from',TO:'has destination',WITH:'is with',USING:'uses',HAS:'possesses',NAMED:'has exact name',COUNT:'has member count'};
    if(relations[e.key])return `${args[0]} ${relations[e.key]} ${args[1]}`;
    if(['ONGOING','PERFECT','CONDITIONAL'].includes(e.key))return `${e.key==='ONGOING'?'In progress':e.key==='PERFECT'?'Previously completed with current relevance':'Hypothetically'}: [${args[0]}]`;
    if(e.key==='BECAUSE')return `[${args[0]}] because [${args[1]}]`;if(e.key==='EVENT')return `the event described by [${args[0]}]`;
    if(e.key==='AWAY')return `${args[0]} moves away`;if(e.key==='PLURAL')return `${args[0]} is a plural group`;
    if(e.part==='p')return `${e.key.startsWith('pb:')?e.key.slice(3):e.key.slice(6)}(${args.map((x,i)=>`ARG${n.slots[i]} (${e.roles[n.slots[i]]||'unspecified semantic role'}): ${x}`).join('; ')}) [sense: ${e.definition}]`;
    if(e.part==='n'||e.part==='a')return `${args[0]} has property ${label} (${e.definition})`;
    if(e.part==='r')return `With modifier ${label} (${e.definition}): [${args[0]}]`;
    return `${label}(${args.map((x,i)=>`${e.part==='v'?['subject','object/content','recipient/complement'][i]:lexicalTypes(e,args.length)[i]}: ${x}`).join('; ')}) [sense: ${e.definition}]`;
  }
  if(op==='ME')return 'I';if(op==='YOU')return 'you';if(op==='NOW')return 'the utterance context';
  if(/^V[012]$/.test(op))return env[Number(op[1])]||`unbound ${op}`;
  if(op==='REF')return env[Number(n.value)]||'unbound reference';
  if(op==='TEXT')return `exact text ${JSON.stringify(n.value)}`;if(op==='NAT')return String(n.value);
  if(op==='SYMBOL')return `declared identifier ${JSON.stringify(n.value)}`;
  if(op==='TRUE')return 'true';if(op==='FALSE')return 'false';if(op==='NIL')return 'empty sequence';if(op==='WATER')return 'water';
  if(op==='THE')return property(n.args[0])?`the unique ${property(n.args[0])}`:`the unique x${env.length+1} satisfying [${literalEnglish(n.args[0],[`x${env.length+1}`,...env],lexicon)}]`;
  if(op==='ALL'||op==='SOME'){const v=`x${env.length+1}`,e=[v,...env],r=literalEnglish(n.args[0],e,lexicon),b=literalEnglish(n.args[1],e,lexicon);return op==='ALL'?`For every ${v}, if [${r}], then [${b}]`:`There exists ${v} such that [${r}] and [${b}]`;}
  if(op==='CALL'&&n.args[0]?.op==='SYMBOL'&&lexicon.has(n.args[0].value)){const d=lexicon.get(n.args[0].value);return `${d.id.split(':').at(-1)}(${n.args.slice(1).map((v,i)=>`${d.roles[i]}: ${literalEnglish(v,env,lexicon)}`).join('; ')})`;}
  if(predicates[op])return `${a(0)} ${a(0)==='I'?'am':a(0)==='you'?'are':'is'} ${predicates[op]}`;
  if(relations[op]){let verb=relations[op];if(a(0)!=='I'&&a(0)!=='you')verb=op==='LIVE'?'lives in':verb+'s';return `${a(0)} ${verb} ${a(1)}`;}
  if(op==='NOT')return `It is not true that [${a(0)}]`;
  if(op==='AND'||op==='OR')return `[${a(0)}] ${op.toLowerCase()} [${a(1)}]`;
  if(op==='IF')return `If [${a(0)}], then [${a(1)}]`;
  if(op==='KNOW'||op==='BELIEVE'||op==='WANT'){const verb=op==='KNOW'?'know':op==='BELIEVE'?'believe':'want';return `${a(0)} ${verb}${a(0)==='I'||a(0)==='you'?'':'s'} that [${a(1)}]`;}
  if(op==='PAST'||op==='FUTURE')return `At some ${op==='PAST'?'earlier':'later'} time, [${a(0)}]`;
  if(op==='POSSIBLE'||op==='NECESSARY'||op==='OUGHT')return `In ${op==='POSSIBLE'?'some accessible':op==='NECESSARY'?'every accessible':'every designated ideal'} world, [${a(0)}]`;
  if(op==='SAY')return `${a(0)} ${a(0)==='I'||a(0)==='you'?'say':'says'} ${a(1)}`;
  if(op==='GIVE')return `${a(0)} gives ${a(1)} to ${a(2)}`;
  if(op==='ASK')return `Question: [${a(0)}]?`;
  if(op==='EQ')return `${a(0)} equals ${a(1)}`;
  if(op==='AT')return `In context ${a(0)}, [${a(1)}]`;
  if(op==='LAM')return `Function of x${env.length+1}: [${literalEnglish(n.args[0],[`x${env.length+1}`,...env],lexicon)}]`;
  if(op==='LET')return `Let d${env.length+1} mean [${a(0)}]; [${literalEnglish(n.args[1],[`d${env.length+1}`,...env],lexicon)}]`;
  if(op==='QUOTE')return `quoted Silex syntax ${notation(n.args[0])}`;
  return `${op.toLowerCase()}(${n.args.map((_,i)=>`${roles(op)[i]||`argument ${i+1}`}: ${a(i)}`).join('; ')})`;
}
/** Conservative proposition typing before accepting a model-generated analysis. */
export function validateSemantic(n,env=[],lexicalPredicates=false){
  const op=n.op,types=n.args.map((a,i)=>validateSemantic(a,op==='QUOTE'?[]:['ALL','SOME','THE'].includes(op)?['entity',...env]:op==='LAM'?['any',...env]:op==='LET'&&i===1?[validateSemantic(n.args[0],env,lexicalPredicates),...env]:env,lexicalPredicates));
  const expect=(i,t)=>{if(types[i]!==t&&types[i]!=='any')throw new Error(`${op} needs ${t} in argument ${i+1}.`);};
  if(op==='LEX'){const entry=resolveLexical(n);lexicalTypes(entry,n.args.length).forEach((t,i)=>{if(t!=='any')expect(i,t);});return entry.result;}
  if(['NOT','PAST','FUTURE','POSSIBLE','NECESSARY','OUGHT'].includes(op)){expect(0,'prop');return 'prop';}
  if(['AND','OR','IF','ALL','SOME'].includes(op)){expect(0,'prop');expect(1,'prop');return 'prop';}
  if(op==='THE'){expect(0,'prop');return 'entity';}
  if(['KNOW','BELIEVE','WANT'].includes(op)){expect(0,'entity');expect(1,'prop');return 'prop';}
  if(['CHILD','BIRD','RED','PERSON','BOOK','SCIENTIST','CITY','MACHINE','PROBLEM','RUN','DIE','FAIL'].includes(op)){expect(0,'entity');return 'prop';}
  if(['SEE','LOVE','READ','BUILD','LIVE','HELP','DRINK','GIVE'].includes(op)){types.forEach((_,i)=>expect(i,'entity'));return 'prop';}
  if(['CAUSE','BEFORE'].includes(op)){expect(0,'entity');expect(1,'entity');return 'prop';}
  if(op==='PROVE'){expect(0,'entity');expect(1,'prop');return 'prop';}
  if(['KNOW','BELIEVE','WANT','SAY','REMEMBER'].includes(op)){expect(0,'entity');return 'prop';}
  if(op==='AT'){expect(0,'context');expect(1,'prop');return 'prop';}
  if(op==='LAM')return 'function';if(op==='APP'){expect(0,'function');return 'any';}
  if(op==='LET')return types[1];if(op==='CALL')return lexicalPredicates?'prop':'any';
  if(/^V[012]$/.test(op))return env[Number(op[1])]||'any';if(op==='REF')return env[Number(n.value)]||'any';
  if(['ME','YOU','WATER'].includes(op))return 'entity';if(op==='NOW')return 'context';
  if(['NAT','TEXT','SYMBOL','QUOTE','PAIR','NIL'].includes(op))return ({NAT:'nat',TEXT:'text',SYMBOL:'any',QUOTE:'syntax',PAIR:'value',NIL:'value'})[op];
  if(op==='ASK')return 'question';return 'prop';
}
export function assertModelAnalysis(ast,lexicon=[]){
  validateLexicon(ast,lexicon);
  const type=validateSemantic(ast,[],true);if(!['prop','question','text'].includes(type))throw new Error('The model did not return a sentence or exact text.');
  return ast;
}
export function preserve(text){return {ast:literal(text),method:'Exact text',assumptions:['This frame contains the exact UTF-8 wording as TEXT. It does not claim a formal semantic analysis of that wording.']};}
