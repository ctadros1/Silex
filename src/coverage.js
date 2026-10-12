// An omission guard, not a proof of translation equivalence. It only examines
// the encoded content and declarations actually referenced by that content.
const ignored=new Set('a an the i me myself you yourself he him himself she her herself it itself we us ourselves they them themselves my your his our their its am is are was were be been being do does did will would shall should could can may might must that this these those than of and or if then because as by not no every each all any some there to who which'.split(' '));
const irregular={walking:'walk',walked:'walk',running:'run',ran:'run',seeing:'see',sees:'see',saw:'see',seen:'see',children:'child',people:'person',men:'man',women:'woman',went:'go',gone:'go',gave:'give',given:'give',ate:'eat',eaten:'eat',bought:'buy',thought:'think',knew:'know',known:'know',built:'build',drank:'drink',drunk:'drink',sat:'sit',slept:'sleep',wrote:'write',written:'write',heard:'hear',told:'tell',sent:'send',left:'leave',found:'find',lost:'lose',taught:'teach',learnt:'learn',understood:'understand',cities:'city'};
const aliases={think:'believe',inhabit:'live',child:'child',person:'person',zero:'0',one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9',ten:'10',eleven:'11',twelve:'12',thirteen:'13',fourteen:'14',fifteen:'15',sixteen:'16',seventeen:'17',eighteen:'18',nineteen:'19',twenty:'20'};
export function stem(word){
  if(irregular[word])return irregular[word];
  if(word.endsWith('ies'))return word.slice(0,-3)+'y';
  if(word.endsWith('ing')){let base=word.slice(0,-3);if(base.at(-1)===base.at(-2))base=base.slice(0,-1);return base;}
  if(word.endsWith('ed'))return word.slice(0,-2);
  return word.length>3&&word.endsWith('s')?word.slice(0,-1):word;
}
export function auditCoverage(ast,lexicon,source){
  const heads=[],strings=[],used=new Set();
  const visit=n=>{heads.push(n.op.toLowerCase());if(n.op==='TEXT'&&n.value===source&&source.length>20)throw new Error('Quoting the complete source is not a semantic analysis.');if(n.op==='TEXT'||n.op==='NAT')strings.push(String(n.value).toLowerCase());if(n.op==='CALL'&&n.args[0]?.op==='SYMBOL')used.add(n.args[0].value);n.args.forEach(visit);};visit(ast);
  const vocabulary=new Set([...heads,...strings,...lexicon.filter(e=>used.has(e.id)).flatMap(e=>[e.id.slice(14),e.definition])].join(' ').toLowerCase().match(/[\p{L}\p{N}]+/gu)?.flatMap(w=>[w,stem(w)])||[]);
  const words=source.toLowerCase().replace(/[’‘]/g,"'").replace(/n't\b/g,' not').match(/[\p{L}\p{N}]+/gu)||[];
  const missing=[...new Set(words.filter(w=>!ignored.has(w)&&!['don','doesn','didn','isn','aren','wasn','weren','won','can','t','m','re','s','ll'].includes(w)).filter(w=>!vocabulary.has(w)&&!vocabulary.has(stem(w))&&!vocabulary.has(stem(w)+'e')&&!vocabulary.has(aliases[stem(w)])))];
  if(missing.length)throw new Error('The analysis omitted or did not ground these source words: '+missing.join(', ')+'. Represent them with used predicates and explicit sense definitions; do not hide them in unused declarations.');
  if(words.some(w=>['not','never','nobody'].includes(w))&&!heads.includes('not'))throw new Error('The analysis omitted explicit negation.');
  if(words.some(w=>['every','each','all'].includes(w))&&!heads.includes('all'))throw new Error('The analysis omitted universal quantification.');
  if(words.includes('will')&&!heads.includes('future'))throw new Error('The analysis omitted future tense.');
  if(words.some(w=>['may','might'].includes(w))&&!heads.includes('possible')&&!lexicon.some(e=>used.has(e.id)&&/may|might|possib/.test(e.id)))throw new Error('The analysis omitted possibility.');
  if(/^(do|does|did|is|are|was|were|can|will)\b/i.test(source.trim())&&/\?\s*$/.test(source)&&!heads.includes('ask'))throw new Error('The analysis omitted the question operator.');
  return {checkedWords:words.filter(w=>!ignored.has(w)).length};
}
