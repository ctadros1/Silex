import {p,v,bind,text,call,compilePlan} from './semantic-plan.js';
import {packageMeaning} from './lexicon.js';

// An ordinary-word sense inventory, not the language's vocabulary. A missing
// sense goes to the local model, which can supply another paid declaration.
const baseNouns={
  child:['CHILD','children'],bird:['BIRD','birds'],person:['PERSON','people persons'],book:['BOOK','books'],scientist:['SCIENTIST','scientists'],city:['CITY','cities'],machine:['MACHINE','machines'],problem:['PROBLEM','problems'],
  street:['A public road in a town or city.','streets'],dog:['A domesticated canine animal.','dogs'],cat:['A domesticated feline animal.','cats'],mat:['A piece of material laid on a floor or other surface.','mats'],house:['A building used as a home.','houses'],home:['The place where an entity normally resides.','homes'],car:['A road vehicle with wheels for carrying people.','cars'],tree:['A perennial woody plant with a trunk.','trees'],friend:['A person with whom someone has a relationship of mutual affection.','friends'],student:['A person engaged in studying or attending an educational institution.','students'],teacher:['A person who teaches.','teachers'],woman:['An adult female human.','women'],man:['An adult male human.','men'],girl:['A female child or young person.','girls'],boy:['A male child or young person.','boys'],baby:['A very young child.','babies'],
  pizza:['A food consisting of a baked dough base with toppings.','pizzas'],coffee:['A beverage made by infusing roasted coffee beans.','coffees'],tea:['A beverage made by infusing tea leaves.','teas'],food:['Material consumed as nourishment.','foods'],apple:['The edible fruit of an apple tree.','apples'],ball:['A round object used in a game or activity.','balls'],letter:['A written message sent to a recipient.','letters'],message:['A communication sent to a recipient.','messages'],door:['A movable barrier at a building or room entrance.','doors'],window:['An opening in a wall or structure admitting light or air.','windows'],table:['A piece of furniture with a flat raised surface.','tables'],chair:['A seat normally intended for one person.','chairs'],room:['An enclosed part of a building.','rooms'],park:['An area of land maintained for public recreation.','parks'],school:['An institution or place for education.','schools'],river:['A natural stream of flowing water.','rivers'],road:['A prepared route for travel over land.','roads'],train:['A series of connected railway vehicles.','trains'],bus:['A large road vehicle carrying passengers.','buses'],computer:['An electronic device for programmable information processing.','computers'],phone:['A device for voice or data communication over distance.','phones'],language:['A system of signs and rules for communicating meaning.','languages'],sentence:['A grammatical utterance expressing a statement, question, or command.','sentences'],idea:['A thought or mental conception.','ideas'],picture:['A visual representation or image.','pictures'],image:['A visual representation or image.','images'],story:['An account of connected events.','stories'],song:['A composition intended to be sung.','songs'],music:['Organized sound used for expressive or aesthetic purposes.',''],weather:['The atmospheric conditions at a place and time.',''],sky:['The visible atmosphere and space above the ground.','skies'],sun:['The star around which Earth orbits.','suns'],moon:['A natural satellite of a planet.','moons'],money:['A medium of exchange or means of payment.',''],time:['A duration or position in temporal order.','times'],work:['An activity undertaken to accomplish something.','works'],job:['A paid position of employment.','jobs'],robot:['A programmable machine that acts in the physical world.','robots'],astronaut:['A person trained for travel or work in space.','astronauts'],planet:['A large astronomical body orbiting a star.','planets'],ocean:['A large connected body of salt water.','oceans'],mountain:['A large natural elevation of land.','mountains'],garden:['An area where plants are cultivated.','gardens'],store:['A place where goods are sold.','stores'],hospital:['An institution providing medical treatment.','hospitals'],doctor:['A person qualified to provide medical diagnosis or treatment.','doctors'],family:['A group connected by kinship or enduring familial bonds.','families'],game:['An activity with rules undertaken for play or competition.','games'],experiment:['A procedure used to test a hypothesis or discover a result.','experiments'],result:['An outcome of an action or process.','results'],project:['A planned undertaking with a particular objective.','projects']
};
const baseAdjectives={red:'RED',happy:'Experiencing pleasure or contentment.',sad:'Experiencing sorrow or unhappiness.',blue:'Having a blue color.',green:'Having a green color.',white:'Having a white color.',black:'Having a black color.',yellow:'Having a yellow color.',big:'Of a large size relative to the contextual comparison class.',small:'Of a small size relative to the contextual comparison class.',old:'Of an advanced age relative to the contextual comparison class.',young:'Of a low age relative to the contextual comparison class.',new:'Recently created or acquired relative to context.',good:'Meeting the positive evaluative standard supplied by context.',bad:'Failing the evaluative standard supplied by context.',beautiful:'Pleasing aesthetically in the contextual judgment.',wonderful:'Highly pleasing or admirable in the contextual judgment.',hungry:'Experiencing a need or desire for food.',tired:'Experiencing a need for rest.',ready:'Prepared for the action or purpose supplied by context.',open:'Having an unobstructed opening or access.',closed:'Having its opening or access obstructed.',hot:'Having a high temperature relative to context.',cold:'Having a low temperature relative to context.',warm:'Having a moderately high temperature relative to context.',wet:'Covered or saturated with liquid.',dry:'Free of moisture relative to context.',fast:'Moving or occurring at a high rate relative to context.',slow:'Moving or occurring at a low rate relative to context.',smart:'Showing cognitive ability relative to context.',kind:'Disposed to act with consideration for others.',safe:'Free from the relevant danger to an acceptable contextual degree.',dangerous:'Posing a relevant risk of harm.',true:'Corresponding to the relevant facts.',false:'Not corresponding to the relevant facts.',important:'Having significant consequence relative to context.',difficult:'Requiring substantial effort or skill relative to context.',easy:'Requiring little effort or skill relative to context.',empty:'Containing no members or relevant contents.',full:'Containing its contextually relevant capacity.'};
// stem: [head or specific sense, past forms, gerund, argument count]
const baseVerbs={
  see:['SEE','saw seen','seeing',2],love:['LOVE','loved','loving',2],read:['READ','','reading',2],build:['BUILD','built','building',2],help:['HELP','helped','helping',2],remember:['REMEMBER','remembered','remembering',2],solve:['SOLVE','solved','solving',2],prove:['PROVE','proved proven','proving',2],drink:['DRINK','drank drunk','drinking',2],inhabit:['LIVE','inhabited','inhabiting',2],run:['RUN','ran','running',1],die:['DIE','died','dying',1],fail:['FAIL','failed','failing',1],give:['GIVE','gave given','giving',3],
  walk:['Move on foot at a walking pace.','walked','walking',1],sit:['Be in or assume a seated position.','sat','sitting',1],stand:['Be in or assume an upright position on the feet or a support.','stood','standing',1],sleep:['Be in the physiological state of sleep.','slept','sleeping',1],smile:['Make a pleased or friendly facial expression.','smiled','smiling',1],laugh:['Express amusement through laughter.','laughed','laughing',1],arrive:['Reach a destination supplied by context.','arrived','arriving',1],leave:['Depart from the place or entity supplied as the source.','left','leaving',1],go:['Move to a destination supplied by context.','went gone','going',1],come:['Move toward the contextually designated place or person.','came','coming',1],rain:['Atmospheric water falls as rain at the contextual place.','rained','raining',1],
  sing:['Produce musical vocal sounds.','sang sung','singing',1],dance:['Move the body rhythmically in an expressive or musical activity.','danced','dancing',1],swim:['Move through water by bodily motions.','swam swum','swimming',1],work:['Perform an activity directed toward a task or purpose.','worked','working',1],wait:['Remain available or at a location until a contextual event or time.','waited','waiting',1],jump:['Propel the body off a support surface into the air.','jumped','jumping',1],travel:['Move between places over a distance.','traveled travelled','traveling',1],talk:['Communicate through spoken language.','talked','talking',1],cry:['Express distress or emotion by tears or vocal sounds.','cried','crying',1],
  like:['Feel a positive preference for the object.','liked','liking',2],have:['Possess or have available the object in the contextual ownership sense.','had','having',2],eat:['Consume the object as food.','ate eaten','eating',2],buy:['Acquire the object in exchange for payment.','bought','buying',2],sell:['Transfer the object in exchange for payment.','sold','selling',2],need:['Require the object for a contextual purpose or condition.','needed','needing',2],find:['Discover or locate the object.','found','finding',2],lose:['Cease to possess or know the location of the object.','lost','losing',2],write:['Produce the object as written text.','wrote written','writing',2],hear:['Perceive the object through hearing.','heard','hearing',2],watch:['Observe the object attentively.','watched','watching',2],visit:['Go to the object or person for a limited stay.','visited','visiting',2],call:['Contact or summon the object or person.','called','calling',2],meet:['Encounter or come together with the object or person.','met','meeting',2],play:['Engage with the object in play or perform the supplied composition.','played','playing',2],learn:['Acquire knowledge of or skill in the object.','learned learnt','learning',2],teach:['Impart knowledge of the object.','taught','teaching',2],understand:['Grasp the meaning or nature of the object.','understood','understanding',2],use:['Employ the object for a purpose.','used','using',2],open:['Cause the object to admit access or passage.','opened','opening',2],close:['Cause the opening or access of the object to be obstructed.','closed','closing',2],make:['Produce or bring the object into existence.','made','making',2],carry:['Support and transport the object.','carried','carrying',2],touch:['Be in physical contact with the object.','touched','touching',2],hold:['Keep the object supported or restrained.','held','holding',2],want:['Desire to have the object.','wanted','wanting',2],tell:['Communicate the supplied content to a recipient.','told','telling',3],send:['Cause the supplied object to be delivered to a recipient.','sent','sending',3]
};
const prepositions={
  down:['Along the supplied route toward its contextually designated direction; no vertical descent is implied.','path'],along:['Along the supplied route.','path'],up:['Along the supplied route toward its contextually designated upward or upstream direction.','path'],on:['Supported by or located on the supplied surface.','support'],in:['Located within the supplied place or container.','location'],at:['Located at the supplied contextual place.','location'],under:['Located below the supplied entity.','location'],over:['Located above the supplied entity.','location'],near:['Located close to the supplied entity relative to context.','location'],behind:['Located to the rear of the supplied entity in the contextual frame.','location'],beside:['Located next to the supplied entity.','location'],through:['Passing through the supplied place or route.','path'],to:['Directed toward the supplied destination.','destination'],from:['Originating at or moving away from the supplied source.','source'],with:['Accompanied by the supplied participant.','companion'],without:['Occurring without the supplied participant being present.','absent-participant'],for:['Directed to the benefit or purpose of the supplied entity.','beneficiary']
};
const baseNounForms=new Map(Object.entries(baseNouns).flatMap(([stem,[meaning,plural]])=>[stem,...plural.split(' ').filter(Boolean)].map(form=>[form,{stem,meaning,plural:form!==stem}])));
const baseVerbForms=new Map(Object.entries(baseVerbs).flatMap(([stem,data])=>[stem,stem.endsWith('y')?stem.slice(0,-1)+'ies':/(s|sh|ch|x|o)$/.test(stem)?stem+'es':stem+'s',...data[1].split(' ').filter(Boolean),data[2]].map(form=>[form,{stem,data,past:data[1].split(' ').includes(form),progressive:form===data[2]}])));
const adverbs={quickly:'The event proceeds at a high rate relative to context.',slowly:'The event proceeds at a low rate relative to context.',carefully:'The event is performed with attention to avoid errors or harm.',quietly:'The event produces little sound relative to context.',loudly:'The event produces a high level of sound relative to context.',happily:'The actor experiences pleasure or contentment while performing the event.'};
const times={yesterday:'The event occurs on the calendar day immediately preceding the utterance day.',today:'The event occurs on the utterance calendar day.',tomorrow:'The event occurs on the calendar day immediately following the utterance day.',now:'The event overlaps the utterance time.'};
const pronouns={i:'ME',me:'ME',myself:'ME',you:'YOU',yourself:'YOU'};
const contextualPronouns=new Set(['he','him','himself','she','her','herself','it','itself','they','them','themselves','we','us','ourselves']);
const agreementForms=new Set(['am','is','are','was','were','be']);
const numerals={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20};
function conjunction(parts){return parts.reduce((a,b)=>a?p('AND',a,b):b,null)||p('TRUE');}

export function englishAnalysis(source,additionalSenses=[],semanticTree=null,semanticDefinitions=[]){
  const verbs={...baseVerbs},adjectives={...baseAdjectives},nounForms=new Map(baseNounForms),verbForms=new Map(baseVerbForms);
  for(const sense of additionalSenses){
    if(!sense||!/^[-a-z]{1,40}$/.test(sense.stem)||!['noun','adjective','verb'].includes(sense.kind)||typeof sense.definition!=='string'||sense.definition.length<5||sense.definition.length>500||!Array.isArray(sense.forms)||sense.forms.some(x=>typeof x!=='string'||!/^[-a-z]{1,40}$/.test(x)))throw new Error('Invalid locally supplied word sense.');
    if(sense.kind==='noun')for(const form of [sense.stem,...sense.forms])nounForms.set(form,{stem:sense.stem,meaning:sense.definition,plural:form!==sense.stem});
    else if(sense.kind==='adjective')for(const form of [sense.stem,...sense.forms])adjectives[form]=sense.definition;
    else{
      if(![1,2,3].includes(sense.arity)||!Array.isArray(sense.past)||typeof sense.progressive!=='string')throw new Error('The new verb needs its argument count and inflections.');
      const data=[sense.definition,sense.past.join(' '),sense.progressive,sense.arity];verbs[sense.stem]=data;
      for(const form of [sense.stem,...sense.forms,...sense.past,sense.progressive].filter(Boolean))verbForms.set(form,{stem:sense.stem,data,past:sense.past.includes(form),progressive:form===sense.progressive});
    }
  }
  const entries=new Map(),assumptions=new Set(),internalSubjects=new Map();let serial=0;
  const fresh=()=>`$x${++serial}`;
  const declare=(slug,roles,definition)=>{
    const id='urn:silex:lex:'+slug;
    const previous=entries.get(id);if(previous&&(previous.definition!==definition||previous.roles.join()!==roles.join()))throw new Error('Conflicting lexical senses.');
    entries.set(id,{id,roles,definition});return (...args)=>call(id,...args);
  };
  const property=(word,arg)=>{
    const noun=nounForms.get(word),definition=noun?.meaning||adjectives[word],stem=noun?.stem||word;
    if(!definition)throw new Error('An unfamiliar lexical sense needs on-device interpretation.');
    return /^[A-Z]+$/.test(definition)?p(definition,arg):declare(stem,['entity'],definition)(arg);
  };
  function relative(prep,subject,object){
    const [definition,role]=prepositions[prep];
    if(prep==='down')assumptions.add('“Down the street” selects movement along the route in a contextual direction. It does not assert vertical descent.');
    return declare('relation-'+prep,['subject',role],definition)(subject,object);
  }
  function applyNP(term,body){
    if(term.mode==='NONE')return p('NOT',applyNP({...term,mode:'SOME'},body));
    if(term.distributive){const plain={...term,distributive:false};return applyNP(plain,group=>{const member=fresh();return bind('ALL',member,declare('member',['member','collection'],'The member is one of the distinct members of the collection.')(v(member),group),body(v(member)));});}
    if(term.mode==='constant')return body(term.value);
    const name=fresh();if(term.mode==='THE')return body(bind('THE',name,term.restriction(v(name))));
    return bind(term.mode,name,term.restriction(v(name)),body(v(name)));
  }
  function np(raw){
    const original=raw.trim(),s=original.toLowerCase();
    if(internalSubjects.has(original))return {mode:'constant',value:internalSubjects.get(original)};
    const relativeClause=original.match(/^(.+?) (?:who|that|which) (.+)$/i);
    if(relativeClause){
      const base=np(relativeClause[1]);if(!base.restriction)throw new Error('This named relative clause needs on-device interpretation.');
      return {...base,restriction:entity=>{
        const alias='@bound-'+fresh().slice(1);internalSubjects.set(alias,entity);
        const relative=relativeClause[2],first=relative.split(' ')[0].toLowerCase();
        const clause=verbForms.has(first)||agreementForms.has(first)||['will','can','may','might','must','should'].includes(first)?`${alias} ${relative}`:`${relative} ${alias}`;
        return p('AND',base.restriction(entity),sentence(clause));
      }};
    }
    if(pronouns[s])return {mode:'constant',value:p(pronouns[s])};
    if(s==='water')return {mode:'constant',value:p('WATER')};
    if(contextualPronouns.has(s)){
      assumptions.add(`“${s}” denotes the contextually selected referent; the sentence does not identify that referent further.`);
      const name=fresh(),tag=['him','himself'].includes(s)?'he':['her','herself'].includes(s)?'she':['them','themselves'].includes(s)?'they':['us','ourselves'].includes(s)?'we':s;
      return {mode:'constant',value:bind('THE',name,declare('pronoun-referent',['entity','pronoun'], 'The entity or group uniquely selected by the supplied pronoun in the utterance context.')(v(name),text(tag)))};
    }
    if(s==='someone'||s==='somebody')return np('a person');
    if(s==='everyone'||s==='everybody')return np('every person');
    if(s==='nobody'||s==='no one')return {...np('a person'),mode:'NONE'};
    // A proper name is exact text inside a relation, not a quotation of a sentence.
    if(/^[A-Z][\p{L}\p{M}'-]*(?: [A-Z][\p{L}\p{M}'-]*)*$/u.test(original)&&!nounForms.has(s)&&!adjectives[s]){
      const name=fresh();assumptions.add('A proper name selects the uniquely intended bearer in the utterance context.');
      return {mode:'constant',value:bind('THE',name,declare('named',['entity','name'],'The entity uniquely intended by the supplied proper name in the utterance context.')(v(name),text(original)))};
    }
    let words=original.split(/\s+/),mode=null,possessor=null,count=null;
    const det=words[0].toLowerCase();
    if(['the','a','an','some','any','every','each','all','no'].includes(det)){words.shift();if(det==='all'&&words[0]?.toLowerCase()==='the')words.shift();mode=det==='the'?'THE':['every','each','all'].includes(det)?'ALL':det==='no'?'NONE':'SOME';}
    else if(['my','your','his','her','our','their'].includes(det)){
      words.shift();possessor=np({my:'me',your:'you',his:'he',her:'she',our:'we',their:'they'}[det]);mode='THE';
    }
    const numeral=words[0]?.toLowerCase();if(Object.hasOwn(numerals,numeral)||/^[0-9]+$/.test(numeral||'')){count=Object.hasOwn(numerals,numeral)?String(numerals[numeral]):numeral;words.shift();mode||='SOME';}
    const prepIndex=words.findIndex(w=>Object.hasOwn(prepositions,w.toLowerCase())),headWords=(prepIndex<0?words:words.slice(0,prepIndex)).map(w=>w.toLowerCase()),noun=nounForms.get(headWords.at(-1));
    if(!noun||!headWords.slice(0,-1).every(w=>Object.hasOwn(adjectives,w)))throw new Error('This noun phrase needs on-device interpretation.');
    if(!mode){mode=noun.plural?'ALL':'THE';assumptions.add(noun.plural?'A bare plural selects a distributive universal reading; generic or habitual readings require a separate analysis.':'A bare substance or abstract noun selects the contextually relevant instance or kind.');}
    const modifiers=[];
    if(prepIndex>=0){const prep=words[prepIndex].toLowerCase(),object=np(words.slice(prepIndex+1).join(' '));modifiers.push(entity=>applyNP(object,obj=>relative(prep,entity,obj)));}
    if(possessor)modifiers.push(entity=>applyNP(possessor,owner=>declare('possess',['owner','possession'],'The owner has the supplied possession in the contextual ownership sense.')(owner,entity)));
    const restriction=entity=>conjunction([property(noun.stem,entity),...headWords.slice(0,-1).map(w=>property(w,entity)),...modifiers.map(f=>f(entity))]);
    if(count!==null||noun.plural&&mode==='THE'){
      assumptions.add('A numbered or definite plural denotes a collection and selects a distributive reading. Its members are distinct; a numbered collection has exactly that many members. Additional entities outside that collection are not excluded.');
      return {mode,distributive:true,restriction:group=>{
        const member=fresh(),cardinality=declare(count!==null?'cardinality':'plural-collection',['collection','number'],count!==null?'The collection has exactly the supplied natural number of distinct members.':'The collection has at least the supplied natural number of distinct members.');
        return p('AND',cardinality(group,{op:'NAT',args:[],value:count??'2'}),bind('ALL',member,declare('member',['member','collection'],'The member is one of the distinct members of the collection.')(v(member),group),restriction(v(member))));
      }};
    }
    return {mode,restriction};
  }
  // NONE is explicit negation of an existential, rather than universal negation.
  const baseApply=applyNP;
  function quantify(term,body){if(term.mode==='NONE')return p('NOT',baseApply({...term,mode:'SOME'},body));return baseApply(term,body);}
  function splitModifiers(raw){
    const words=raw.trim().split(/\s+/).filter(Boolean);let at=words.findIndex(w=>Object.hasOwn(prepositions,w.toLowerCase())||Object.hasOwn(adverbs,w.toLowerCase())||Object.hasOwn(times,w.toLowerCase()));
    if(at<0)return {object:raw.trim(),modifiers:[]};
    const object=words.slice(0,at).join(' '),modifiers=[];
    while(at<words.length){
      const key=words[at++].toLowerCase();
      if(adverbs[key]||times[key]){const definition=adverbs[key]||times[key];modifiers.push(event=>declare('event-'+key,['event'],definition)(event));continue;}
      if(!prepositions[key])throw new Error('Unparsed modifier.');
      let end=at;while(end<words.length&&!prepositions[words[end].toLowerCase()]&&!adverbs[words[end].toLowerCase()]&&!times[words[end].toLowerCase()])end++;
      if(end===at)throw new Error('A preposition needs its complement.');
      const objectNP=np(words.slice(at,end).join(' ')),modifier=subject=>quantify(objectNP,obj=>relative(key,subject,obj));
      modifier.target=['support','location'].includes(prepositions[key][1])?'actor':'event';modifiers.push(modifier);at=end;
    }
    return {object,modifiers};
  }
  function relation(verb,args){const definition=verbs[verb][0];return /^[A-Z]+$/.test(definition)?p(definition,...args):declare(verb,args.map((_,i)=>['actor','object','recipient'][i]),definition)(...args);}
  function event(verb,args,modifiers=[],progressive=false,body=()=>p('TRUE')){
    const name=fresh(),e=v(name),definition=verbs[verb][0],gloss=/^[A-Z]+$/.test(definition)?{SEE:'Visual perception of the object by the actor.',READ:'Reading the object by the actor.',RUN:'Movement by the actor at a running pace.',DRINK:'Consumption of the object as a drink by the actor.',GIVE:'Transfer of the object by the actor to the recipient.'}[definition]||`An occurrence of the ${verb} action involving the supplied participants.`:definition;
    const predicate=declare(verb+'-event'+(progressive?'-ongoing':''),['event',...args.map((_,i)=>['actor','object','recipient'][i])],`The event is ${progressive?'ongoing at the evaluation time and is ':''}an occurrence of this action: ${gloss}`);
    return bind('SOME',name,conjunction([predicate(e,...args),...modifiers.map(f=>f(f.target==='actor'?args[0]:e))]),body(e));
  }
  function sentence(raw,depth=0){
    if(depth>40)throw new Error('Use a shorter sentence for browser interpretation.');
    let s=raw.trim().replace(/[.!?]+$/,'').replace(/[’‘]/g,"'").replace(/\bI'm\b/gi,'I am').replace(/\b(you're|we're|they're)\b/gi,m=>m.slice(0,-3)+' are').replace(/\b(he's|she's|it's)\b/gi,m=>m.slice(0,-2)+' is').replace(/\b(isn't|aren't|wasn't|weren't|don't|doesn't|didn't|won't|can't)\b/gi,m=>({"isn't":'is not',"aren't":'are not',"wasn't":'was not',"weren't":'were not',"don't":'do not',"doesn't":'does not',"didn't":'did not',"won't":'will not',"can't":'can not'})[m.toLowerCase()]).replace(/\s+/g,' ');
    const lower=s.toLowerCase();
    const concession=s.match(/^(?:although|even though|though) (.+?), (.+)$/i)||s.match(/^(.+?) (?:although|even though|though) (.+)$/i);
    if(concession){const leading=/^(although|even though|though) /i.test(s),first=sentence(concession[1],depth+1),second=sentence(concession[2],depth+1);return declare('although',['conceded-fact','contrasting-fact'],'Both facts hold; the contrasting fact defeats a contextual expectation associated with the conceded fact.')(leading?first:second,leading?second:first);}
    const conditional=s.match(/^if (.+?),\s*(?:then )?(.+)$/i)||s.match(/^if (.+?) then (.+)$/i);
    if(conditional)return p('IF',sentence(conditional[1],depth+1),sentence(conditional[2],depth+1));
    const causal=s.match(/^(.+?) because (.+)$/i);
    if(causal)return declare('because',['consequence','reason'],'The reason proposition is asserted true and explains the asserted consequence proposition in the contextual explanatory sense.')(sentence(causal[1],depth+1),sentence(causal[2],depth+1));
    for(const conjunctionWord of [' and ',' or ']){
      const at=lower.indexOf(conjunctionWord);
      if(at>=0){try{return p(conjunctionWord.includes('and')?'AND':'OR',sentence(s.slice(0,at),depth+1),sentence(s.slice(at+conjunctionWord.length),depth+1));}catch{/* noun-phrase coordination is left to the model */}}
    }
    const attitude=s.match(/^(.+?) (know|knows|knew|believe|believes|believed|think|thinks|thought|want|wants|wanted|hope|hopes|hoped) (?:that )?(.+)$/i);
    if(attitude){
      try{const content=sentence(attitude[3],depth+1),word=attitude[2].toLowerCase();return quantify(np(attitude[1]),agent=>{let result=/^(know|knew)/.test(word)?p('KNOW',agent,content):/^(believe|think|thought)/.test(word)?p('BELIEVE',agent,content):/^want/.test(word)?p('WANT',agent,content):declare('hope',['agent','content'],'The agent desires the content proposition and regards its realization as possible.')(agent,content);if(['knew','believed','thought','wanted','hoped'].includes(word))result=p('PAST',result);return result;});}catch{/* want an object is an ordinary relation */}
    }
    const control=s.match(/^(.+?) (refuse|refuses|refused|try|tries|tried|promise|promises|promised|plan|plans|planned|want|wants|wanted|hope|hopes|hoped|begin|begins|began) to (.+)$/i);
    if(control){
      const verb=control[2].toLowerCase(),stem=verb.startsWith('refus')?'refuse':verb.startsWith('tri')||verb==='try'?'try':verb.startsWith('promis')?'promise':verb.startsWith('plan')?'plan':verb.startsWith('want')?'want':verb.startsWith('hope')?'hope':'begin';
      const meanings={refuse:'The agent declines to bring about the action proposition; the action is not asserted to occur.',try:'The agent makes an attempt to bring about the action proposition; success is not asserted.',promise:'The agent undertakes a commitment to bring about the action proposition; its occurrence is not asserted.',plan:'The agent forms an intention and plan to bring about the action proposition; its occurrence is not asserted.',hope:'The agent desires the action proposition and regards its realization as possible.',begin:'The agent starts bringing about the action proposition, without asserting its completion.'};
      return quantify(np(control[1]),agent=>{const alias='@bound-'+fresh().slice(1);internalSubjects.set(alias,agent);const action=sentence(`${alias} ${control[3]}`,depth+1);let result=stem==='want'?p('WANT',agent,action):declare(stem,['agent','action'],meanings[stem])(agent,action);if(['refused','tried','promised','planned','wanted','hoped','began'].includes(verb))result=p('PAST',result);return result;});
    }
    const question=s.match(/^(do|does|did|will|can) (.+?) ([a-z]+) (.+)$/i);
    if(question&&verbForms.has(question[3].toLowerCase()))return p('ASK',sentence(`${question[2]} ${question[1].toLowerCase()==='do'||question[1].toLowerCase()==='does'?'':question[1]} ${question[3]} ${question[4]}`,depth+1));
    const copulaQuestion=s.match(/^(is|are|am|was|were) (.+?) (happy|sad|hungry|tired|ready|red|blue|green|a .+|the .+)$/i);
    if(copulaQuestion)return p('ASK',sentence(`${copulaQuestion[2]} ${copulaQuestion[1]} ${copulaQuestion[3]}`,depth+1));
    const words=s.split(' '),verbAt=words.findIndex((w,i)=>{if(i<=0||!(agreementForms.has(w.toLowerCase())||['will','do','does','did','can','may','might','must','should'].includes(w.toLowerCase())||verbForms.has(w.toLowerCase())))return false;try{np(words.slice(0,i).join(' '));return true;}catch{return false;}});
    if(verbAt<1)throw new Error('The sentence structure needs on-device interpretation.');
    const subject=np(words.slice(0,verbAt).join(' '));let cursor=verbAt,tense=null,negative=false,progressive=false,ability=false,modality=null;
    let token=words[cursor++].toLowerCase();
    if(['will','do','does','did','can','may','might','must','should'].includes(token)){if(token==='will')tense='FUTURE';if(token==='did')tense='PAST';ability=token==='can';modality=['may','might'].includes(token)?'POSSIBLE':token==='must'?'NECESSARY':token==='should'?'OUGHT':null;if(words[cursor]?.toLowerCase()==='not'){negative=true;cursor++;}token=words[cursor++].toLowerCase();}
    if(agreementForms.has(token)){
      if(['was','were'].includes(token))tense='PAST';if(words[cursor]?.toLowerCase()==='not'){negative=true;cursor++;}
      const next=verbForms.get(words[cursor]?.toLowerCase());
      if(next?.progressive){progressive=true;token=words[cursor++].toLowerCase();}
      else if(next?.past&&next.data[3]===2){
        cursor++;const remainder=words.slice(cursor).join(' '),by=remainder.match(/^by (.+)$/i);
        if(remainder&&!by)throw new Error('A qualified passive needs full interpretation.');
        assumptions.add('The passive preserves its affected entity. An omitted actor is existentially quantified; its identity is not inferred.');
        return quantify(subject,object=>{let result=quantify(by?np(by[1]):{mode:'SOME',restriction:()=>p('TRUE')},actor=>relation(next.stem,[actor,object]));if(negative)result=p('NOT',result);if(tense)result=p(tense,result);return result;});
      }
      else{
        const complement=words.slice(cursor).join(' '),description=splitModifiers(complement);
        return quantify(subject,actor=>{
          let result;
          if(!description.object&&description.modifiers.length)result=conjunction(description.modifiers.map(f=>f(actor)));
          else if(adjectives[description.object.toLowerCase()])result=conjunction([property(description.object.toLowerCase(),actor),...description.modifiers.map(f=>f(actor))]);
          else if(/^(a|an) /i.test(complement)){const term=np(complement);result=term.restriction(actor);}
          else result=quantify(np(complement),object=>p('EQ',actor,object));
          if(negative)result=p('NOT',result);if(tense)result=p(tense,result);return result;
        });
      }
    }
    const verb=verbForms.get(token);if(!verb)throw new Error('This verb needs on-device interpretation.');if(verb.past&&!tense)tense='PAST';
    const tail=words.slice(cursor).join(' '),arity=verb.data[3];
    let perceived=null;
    if(['see','hear','watch'].includes(verb.stem)){
      const tailWords=tail.split(' '),participleAt=tailWords.findIndex((w,i)=>i>0&&verbForms.get(w.toLowerCase())?.progressive);
      if(participleAt>0)perceived={participant:np(tailWords.slice(0,participleAt).join(' ')),verb:verbForms.get(tailWords[participleAt].toLowerCase()),rest:tailWords.slice(participleAt+1).join(' ')};
    }
    const description=perceived?null:splitModifiers(tail);
    return quantify(subject,actor=>{
      let result;
      if(perceived){
        const observed=perceived,detail=splitModifiers(observed.rest);
        result=quantify(observed.participant,participant=>{
          const assemble=args=>event(observed.verb.stem,args,detail.modifiers,true,e=>conjunction([relation(verb.stem,[actor,participant]),relation(verb.stem,[actor,e])]));
          if(observed.verb.data[3]===1){if(detail.object)throw new Error('Unparsed perceived action complement.');return assemble([participant]);}
          if(observed.verb.data[3]===2&&detail.object)return quantify(np(detail.object),object=>assemble([participant,object]));
          throw new Error('The perceived event needs another argument.');
        });
      }else{
        const assemble=args=>progressive||description.modifiers.length?event(verb.stem,args,description.modifiers,progressive):relation(verb.stem,args);
        if(arity===1){if(description.object)throw new Error('Unparsed intransitive complement.');result=assemble([actor]);}
        else if(arity===2){if(!description.object)throw new Error(`The verb ${verb.stem} has no overt object in this clause. Supply an intransitive contextual sense with arity 1, rather than inventing an object.`);result=quantify(np(description.object),object=>assemble([actor,object]));}
        else{
          // Give/send a book to a person, or give/send you a book.
          const match=tail.match(/^(.+?) to (.+)$/i)||tail.match(/^(me|you|him|her|them|us) (.+)$/i);
          if(!match)throw new Error('A transfer needs its object and recipient.');
          const hasTo=/ to /i.test(tail),objectNP=np(match[hasTo?1:2]),recipientNP=np(match[hasTo?2:1]);
          result=quantify(objectNP,object=>quantify(recipientNP,recipient=>relation(verb.stem,[actor,object,recipient])));
        }
      }
      if(ability)result=declare('capable',['agent','action'],'The agent has the contextual ability to bring about the action proposition; the action is not asserted to occur.')(actor,result);
      if(negative)result=p('NOT',result);
      if(modality){result=p(modality,result);assumptions.add('The modal selects accessible worlds (or designated ideal worlds for “should”); permission and obligation depend on the chosen contextual world relation.');}
      if(tense)result=p(tense,result);return result;
    });
  }
  function treeMeaning(tree,depth=0){
    if(depth>100||!Array.isArray(tree)||typeof tree[0]!=='string')throw new Error('A meaning tree needs an operator and its argument list.');
    const op=tree[0].toLowerCase(),args=tree.slice(1);
    const special={and:'AND',or:'OR',not:'NOT',if:'IF',past:'PAST',future:'FUTURE',possible:'POSSIBLE',necessary:'NECESSARY',ought:'OUGHT',ask:'ASK'};
    if(special[op]){const count=['and','or','if'].includes(op)?2:1;if(args.length!==count)throw new Error(`${op} needs ${count} clause arguments.`);return p(special[op],...args.map(a=>treeMeaning(a,depth+1)));}
    if(['all','some','the','lambda'].includes(op)&&typeof args[0]==='string'&&args[0].startsWith('$')){
      const count=['all','some'].includes(op)?3:2;if(args.length!==count)throw new Error(`${op} has an incorrect binder argument count.`);
      return bind(op==='lambda'?'LAM':op.toUpperCase(),args[0],...args.slice(1).map(a=>treeMeaning(a,depth+1)));
    }
    if(op==='true'||op==='false'){if(args.length)throw new Error('Truth constants have no arguments.');return p(op.toUpperCase());}
    const core={see:'SEE',love:'LOVE',read:'READ',build:'BUILD',help:'HELP',remember:'REMEMBER',solve:'SOLVE',prove:'PROVE',drink:'DRINK',give:'GIVE',inhabit:'LIVE',live:'LIVE',child:'CHILD',bird:'BIRD',red:'RED',person:'PERSON',book:'BOOK',scientist:'SCIENTIST',city:'CITY',machine:'MACHINE',problem:'PROBLEM',run:'RUN',die:'DIE',fail:'FAIL',know:'KNOW',believe:'BELIEVE',want:'WANT',say:'SAY',equals:'EQ',before:'BEFORE',cause:'CAUSE'};
    const definition=semanticDefinitions.find(d=>d.name===op);
    const head=definition?null:core[op];
    if(!head&&!definition)throw new Error(`Supply a specific definition and roles for the predicate ${op}.`);
    const roles=definition?.roles||args.map((_,i)=>['know','believe','want','say','prove'].includes(op)&&i===1?'content':'entity');
    if(roles.length!==args.length)throw new Error(`The predicate ${op} has ${args.length} arguments but ${roles.length} declared roles.`);
    function argument(term,role,body){
      if(typeof term==='string'){
        if(/^\$[a-z][a-z0-9_]*$/i.test(term))return body(v(term));
        return quantify(np(term),body);
      }
      if(typeof term==='number'){if(!Number.isSafeInteger(term)||term<0)throw new Error('Use an exact nonnegative integer or an explicit numerical definition.');return body({op:'NAT',args:[],value:String(term)});}
      if(!Array.isArray(term))throw new Error('Invalid meaning-tree argument.');
      const tag=String(term[0]).toLowerCase();
      if(tag==='text'){if(term.length!==2||typeof term[1]!=='string')throw new Error('A text value needs exact wording.');return body(text(term[1]));}
      if(tag==='name'){if(term.length!==2||typeof term[1]!=='string')throw new Error('A name needs exact wording.');return quantify(np(term[1]),body);}
      if(['the','a','an','some','every','each','all','no'].includes(tag)&&term.length===2&&typeof term[1]==='string')return quantify(np(`${tag} ${term[1]}`),body);
      if(tag==='the'&&term[1]?.startsWith('$'))return body(treeMeaning(term,depth+1));
      if(!/content|proposition|clause|fact|action|reason|consequence|condition|result|premise|conclusion/i.test(role)&&head&&!['before','cause'].includes(op))throw new Error(`${op} needs an entity rather than a clause in role ${role}.`);
      return body(treeMeaning(term,depth+1));
    }
    function assemble(i,values){
      if(i===args.length)return head?p(head,...values):declare(op,roles,definition.definition)(...values);
      return argument(args[i],roles[i],value=>assemble(i+1,[...values,value]));
    }
    return assemble(0,[]);
  }
  const content=compilePlan(semanticTree?treeMeaning(semanticTree):sentence(source)),ast=packageMeaning(content,[...entries.values()].filter(e=>{
    const used=n=>n.op==='SYMBOL'&&n.value===e.id||n.args.some(used);return used(content);
  }));
  return {ast,method:'Local grammar',assumptions:[...assumptions]};
}
export function meaningTreeAnalysis(source,tree,definitions){
  if(!Array.isArray(definitions)||definitions.length>128)throw new Error('Invalid meaning-tree dictionary.');
  const names=new Set();
  for(const d of definitions){
    if(!d||!/^[-a-z0-9]{1,64}$/.test(d.name)||names.has(d.name)||!['noun','adjective','relation'].includes(d.kind)||!Array.isArray(d.roles)||d.roles.length>32||d.roles.some(r=>typeof r!=='string'||!r||r.length>40)||typeof d.definition!=='string'||d.definition.length<5||d.definition.length>1000)throw new Error('Each new predicate needs one valid name, kind, sense and ordered role list.');
    names.add(d.name);
  }
  definitions=definitions.map(d=>d.kind==='noun'||d.kind==='adjective'?{...d,roles:['entity']}:d);
  const senses=definitions.filter(d=>d.kind==='noun'||d.kind==='adjective').map(d=>({stem:d.name,kind:d.kind,definition:d.definition,forms:d.kind==='noun'?[d.name+'s',d.name.endsWith('y')?d.name.slice(0,-1)+'ies':d.name+'es']:[]}));
  return englishAnalysis(source,senses,tree,definitions);
}

// Vocabulary assistance is separate from grammar generation. Local models are
// substantially better at defining a word in context than emitting wire syntax.
const grammarWords=new Set("a an the i me myself you yourself he him himself she her herself it itself we us ourselves they them themselves my your his our their am is are was were be been being do does did will can may might must should not no every each all any some someone somebody everyone everybody nobody one there if then because and or that who which when where whether although while until know knows knew believe believes believed think thinks thought hope hopes hoped".split(' '));
export function unfamiliarWords(source){
  const words=source.toLowerCase().replace(/[’‘]/g,"'").replace(/n't\b/g,' not').match(/[a-z]+/g)||[];
  return [...new Set(words.filter(w=>!grammarWords.has(w)&&!baseNounForms.has(w)&&!baseVerbForms.has(w)&&!baseAdjectives[w]&&!prepositions[w]&&!adverbs[w]&&!times[w]&&!['water','s','t','m','re','don','doesn','didn','won'].includes(w)))];
}
