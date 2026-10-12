import {encode,parse,notation,packet,grid,svg,layout,pngBlob,decodeImage,roles} from './codec.js';
import {LANGUAGES,EXAMPLES,knownReading,literalEnglish,explainRecord,preserve,scopeNotes,validateSemantic} from './language.js';
import * as ai from './ai.js';
import * as meaning from './meaning.js';
import {decodeMeaningDocument,literalGraphReading,graphPieceMap,dictionaryGlyphSpan} from './meaning-graph.js';
import {unpackMeaning} from './lexicon.js';
import {decodeCompactGraphs,compactPieceMap} from './compact-graph.js';
import {semanticReading,semanticKnownReading,documentStatements} from './semantic-compiler.js';
const $=id=>document.getElementById(id);
const state={ast:null,cells:null,frame:null,encoded:null,selected:0,page:0,reverse:false,revision:0,busy:false,job:0,modelLoading:false,modelReady:false,lastText:null,sourceLanguage:'en',forwardLanguage:'en'};
let progressTimer,startedAt=0;
const escaped=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function message(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);if(state.busy)$('translation-stage').textContent=text;}
function modelActivity(){if(state.busy)$('translation-detail').textContent='The on-device model is responding.';}
function option(value,label){const o=document.createElement('option');o.value=value;o.textContent=label;return o;}
for(const l of LANGUAGES){$('source-language').append(option(l.code,l.name));$('target-language').append(option(l.code,l.name));}
$('source-language').append(option('silex','Silex image'),option('expression','Silex expression'));
$('target-language').prepend(option('silex','Silex'));
$('source-language').value='en';$('target-language').value='silex';
for(const e of EXAMPLES)$('examples').append(option(String(e.id),e.text.en));
function busy(v){
  state.busy=v;state.progressDetail=false;$('translate').disabled=v;$('translate').textContent=v?'Translating…':'Translate';$('stop').hidden=!v;$('stop').disabled=false;
  document.querySelector('.translator').setAttribute('aria-busy',String(v));$('translation-progress').hidden=!v;
  $('result-image').hidden=state.reverse||v;$('result-text').hidden=!state.reverse||v;
  for(const id of ['swap','source-language','target-language','examples','unload-model','load-model','exact-text'])$(id).disabled=v;
  clearInterval(progressTimer);
  if(v){startedAt=performance.now();state.cancelReason=null;$('translation-elapsed').textContent='0s elapsed';$('translation-detail').textContent='Working on this device.';progressTimer=setInterval(()=>{const seconds=Math.floor((performance.now()-startedAt)/1000);$('translation-elapsed').textContent=`${seconds}s elapsed`;if(seconds>=10&&!state.progressDetail)$('translation-detail').textContent='Still working on this device. You can stop the translation.';},500);}
  else if(state.cancelReason){message(state.cancelReason==='edit'?'Text changed. Press Translate when it is ready.':'Translation stopped.');state.cancelReason=null;}
}
function invalidate(){state.revision++;state.lastText=null;state.ast=null;state.cells=null;state.frame=null;state.encoded=null;state.graph=null;state.graphPieces=null;$('fallback').hidden=true;$('explanation').hidden=true;$('result-image').innerHTML='<p class="empty-message">Your Silex image will appear here.</p>';$('result-text').textContent='';$('result-caption').textContent='';$('download-png').disabled=true;$('copy-image').disabled=true;$('download-svg').disabled=true;$('copy-text').disabled=true;}
function syncMode(){
  state.reverse=$('source-language').value==='silex';const expression=$('source-language').value==='expression';
  $('sentence-input').hidden=state.reverse;$('image-input').hidden=!state.reverse;
  $('source-text').maxLength=expression?24000:1200;$('source-text').placeholder=expression?'(SEE ME YOU)':'Enter text…';
  $('source-text').setAttribute('aria-label',expression?'Silex expression to encode':'Text to translate');
  $('source-text').classList.toggle('expression-input',expression);
  $('examples').hidden=expression;$('input-hint').textContent=state.reverse?'Decoded on this device.':expression?'Enter valid Silex reference notation.':'Sentences stay on this device.';
  $('image-actions').hidden=state.reverse;$('text-actions').hidden=!state.reverse;$('result-image').hidden=state.reverse;$('result-text').hidden=!state.reverse;$('scale-control').hidden=state.reverse;
  if(state.reverse)$('target-language').value=$('target-language').value==='silex'?'en':$('target-language').value;else $('target-language').value='silex';
  count();
}
function count(){$('character-count').textContent=`${$('source-text').value.length.toLocaleString()} / ${$('source-text').maxLength.toLocaleString()}`;}
function updateExampleLabels(){const language=$('source-language').value;for(const e of EXAMPLES)$('examples').options[e.id+1].textContent=e.text[language]||e.text.en;}
function showAnalysis(ast,{method='Local decoding',assumptions=[],frame=null,source=null}={}){
  state.ast=ast;state.graph=decodeMeaningDocument(ast)||decodeCompactGraphs(ast);state.graphPieces=state.graph?(state.graph.profile==='g2/1'?compactPieceMap(state.graph):graphPieceMap(state.graph)):new Map();for(const item of documentStatements(ast)||[]){const g=decodeCompactGraphs(item);if(g)for(const [field,piece] of compactPieceMap(g))state.graphPieces.set(field,piece);}state.encoded=encode(ast);state.selected=0;state.page=0;
  if(frame){state.frame=frame;state.cells=frame.cells;}else{const words=packet(state.encoded.words),l=layout(words.length);state.cells=grid(words,l.cols);state.frame={profile:1,cols:l.cols,rows:l.rows,packetLength:words.length};}
  // Header length is counted from the self-delimiting body-word count.
  if(!frame){let i=1;const words=packet(state.encoded.words);while(words[i++]>=32){}state.frame.bodyStart=i;}
  $('explanation').hidden=false;$('fallback').hidden=true;
  $('literal-reading').textContent=state.graph?.source?literalGraphReading(state.graph):semanticReading(ast);$('source-reading').textContent=state.graph?.source?'Legacy image: stored source wording — '+state.graph.source:'';
  $('translation-method').textContent=`${method}${method==='On-device AI'?' · Review this interpretation.':''}${source?' · Source: '+source:''}`;
  $('expression').textContent=notation(ast);
  const container=$('assumptions');container.replaceChildren();if(assumptions.length){const list=document.createElement('ul');for(const text of [...new Set(assumptions)]){const li=document.createElement('li');li.textContent=text;list.append(li);}container.append(list);}
  $('frame-details').textContent=`${state.encoded.words.length} body glyphs (${state.encoded.words.length*6} syntax bits). ${state.cells[0].length} × ${state.cells.length} modules including border, margin, length, checksum, and padding. Profile ${state.frame.profile}. Normal images contain native meaning symbols or a compact semantic graph. Local concept declarations are counted; shared codes use the published codebook. Source words and formatting are excluded.`;
  $('compression-note').textContent=state.frame.profile===2?'This uploaded frame is compressed. Its words are recovered locally before interpretation. Individual heads share compressed bits, so the highlighted pieces appear in a reconstructed direct frame below; they cannot be assigned separate rectangles in the compressed original.':'The highlighted words occupy the exact displayed positions in the complete direct frame. The first words are framing information; the last words are checksum and zero padding.';
  renderGlyphs();renderTree();renderImages();const meaning=unpackMeaning(ast).content;selectPiece(state.encoded.records.find(r=>r.kind==='head'&&r.node===meaning)?.index||0);
  for(const id of ['download-png','copy-image','download-svg','copy-text'])$(id).disabled=false;
}
function renderImages(){
  if(!state.cells)return;let unit=Number($('image-scale').value);while(state.cells.length*state.cells[0].length*unit*unit>8000000&&unit>8){unit=unit===20?12:8;$('image-scale').value=String(unit);}
  if(!state.reverse)$('result-image').innerHTML=svg(state.cells,unit);
  else $('uploaded-image').innerHTML=svg(state.cells,8);
  $('result-caption').textContent=state.reverse?`Decoded Silex v1 · profile ${state.frame.profile}`:`${state.cells[0].length*unit} × ${state.cells.length*unit} px · ${state.encoded.words.length} body glyphs`;
}
function glyphSVG(value){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 3" shape-rendering="crispEdges" aria-hidden="true"><rect width="2" height="3" fill="white" stroke="#b9c1ce" stroke-width=".06"/>${Array.from({length:6},(_,i)=>`<rect x="${i%2}" y="${Math.floor(i/2)}" width="1" height="1" fill="${(value>>(5-i))&1?'black':'white'}" stroke="#b9c1ce" stroke-width=".025"/>`).join('')}</svg>`;}
function renderGlyphs(){
  const container=$('glyphs');container.replaceChildren();const records=state.encoded.records,start=state.page*24;
  records.slice(start,start+24).forEach(record=>{const b=document.createElement('button');b.className='glyph';b.setAttribute('aria-pressed',String(record.index===state.selected));b.title=`Glyph ${record.index+1}: ${record.kind==='head'?record.op:record.kind}`;b.setAttribute('aria-label',b.title);b.innerHTML=glyphSVG(record.value)+`<span class="glyph-label">${escaped(record.kind==='head'?record.op:record.kind==='byte count'?'length':record.kind==='literal bytes'?'bytes':record.kind)}</span><small>${record.index+1}</small>`;b.addEventListener('click',()=>selectPiece(record.index));container.append(b);});
  $('glyph-pagination').hidden=records.length<=24;$('glyph-range').textContent=`${start+1}–${Math.min(start+24,records.length)} of ${records.length}`;$('previous-glyphs').disabled=state.page===0;$('next-glyphs').disabled=start+24>=records.length;
}
function renderTree(){
  if(state.graph){
    const tree=$('semantic-tree');tree.replaceChildren();
    function row(field,label,level=0){const b=document.createElement('button');b.className='tree-row';b.style.paddingLeft=`${5+level*12}px`;b.textContent=label;const record=state.encoded.records.find(r=>r.kind==='head'&&r.node===field);b.addEventListener('click',()=>{if(record)selectPiece(record.index);});tree.append(b);}
    for(const g of state.graph.documents){
      row(g.record,`Statement ${g.statementIndex+1}`);
      for(const n of g.nodes)row(n.field,`n${n.id}: ${n.concept}`,1);
      for(const e of g.edges)row(e.fields[1],`n${e.source} → ${e.role} → ${e.target.kind==='node'?'n'+e.target.id:JSON.stringify(e.target.value)}`,1);
      if(!g.atoms.length)continue;const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Legacy stored source words';details.append(summary);tree.append(details);
      for(const a of g.atoms){const b=document.createElement('button');b.className='tree-row';b.textContent=a.form;const r=state.encoded.records.find(r=>r.kind==='head'&&r.node===a.fields[1]);b.addEventListener('click',()=>selectPiece(r.index));details.append(b);}
    }
    return;
  }
  const tree=$('semantic-tree');tree.replaceChildren();let count=0;const lexicon=new Map(unpackMeaning(state.ast).lexicon.map(e=>[e.id,e]));
  function walk(n,level=0,role='Meaning'){
    if(count++>180)return;const b=document.createElement('button');b.className='tree-row';b.style.paddingLeft=`${5+level*12}px`;
    const record=state.encoded.records.find(r=>r.kind==='head'&&r.node===n);b.innerHTML=`${escaped(role)}: <strong>${escaped(n.op)}</strong>${n.value!==undefined?' '+escaped(String(n.value).slice(0,50)):''}`;
    b.addEventListener('click',()=>{if(record)selectPiece(record.index);});tree.append(b);const signature=n.op==='CALL'?lexicon.get(n.args[0]?.value)?.roles:null;n.args.forEach((a,i)=>walk(a,level+1,signature?(i===0?'predicate':signature[i-1]):roles(n.op)[i]||`argument ${i+1}`));
  }walk(state.ast);
  if(count>180){const p=document.createElement('p');p.className='subtle';p.textContent='The full structure is preserved in the expression below.';tree.append(p);}
}
function selectPiece(index){
  const r=state.encoded.records.find(r=>r.index===index);if(!r)return;state.selected=index;const page=Math.floor(index/24);if(state.page!==page)state.page=page;renderGlyphs();
  let cells=state.cells,cols=state.frame.cols,start=state.frame.bodyStart;
  if(state.frame.profile===2){const p=packet(state.encoded.words);cells=grid(p);cols=layout(p.length).cols;let i=1;while(p[i++]>=32){}start=i;}
  const piece=state.graphPieces?.get(r.node),ranges=piece?piece.fields.map(f=>state.encoded.records.find(x=>x.kind==='head'&&x.node===f)).filter(Boolean):[r];const dictionary=piece?dictionaryGlyphSpan(state.graph,state.encoded.records,piece.dictionaryIndex):null;if(dictionary)ranges.push(dictionary);const positions=new Set();for(const range of ranges)for(let i=range.start;i<range.end;i++)positions.add(i);const highlights=[];for(const i of positions){const pos=start+i;highlights.push({x:2+2*(pos%cols),y:2+3*Math.floor(pos/cols)});}
  $('assembly-image').innerHTML=svg(cells,14,highlights);
  $('piece-label').textContent=piece?piece.title:`Glyph ${r.index+1}: ${r.kind==='head'?r.op:r.kind} · ${r.value.toString(2).padStart(6,'0')}`;
  const definition=r.node?.op==='CALL'?unpackMeaning(state.ast).lexicon.find(e=>e.id===r.node.args[0]?.value):null;
  $('piece-description').textContent=piece?piece.description:definition?`${definition.id.split(':').at(-1)} — ${definition.definition} Ordered roles: ${definition.roles.join(', ')}.`:explainRecord(r);$('piece-path').textContent=r.path+(r.kind==='head'&&r.end>r.start+1?` · spans body glyphs ${r.start+1}–${r.end}`:'');
}
async function translate(){
  if(state.busy)return;const source=$('source-language').value;
  if(source==='silex'){if(!state.ast){message('Choose a complete Silex image first.',true);return;}await reverseReading();return;}
  const text=$('source-text').value;if(!text.trim()){invalidate();message('Enter a sentence to translate.');return;}
  invalidate();const revision=state.revision,job=++state.job;busy(true);message('Interpreting the sentence locally…');
  try{
    let analysis;
    if(source==='expression'){const ast=parse(text);validateSemantic(ast);analysis={ast,method:'Silex expression',assumptions:scopeNotes(ast)};}
    else{
      let english=text;
      if(source!=='en'){
        if(!ai.isReady())throw new Error('Enable the optional language model below to translate from this language. English uses the smaller meaning model automatically.');
        message('Translating the source text into English on this device…');
        english=await ai.translateText(text,source,'en',modelActivity);
      }
      if(revision!==state.revision)return;
      analysis=await meaning.analyze(english,'en',report=>{if(job===state.job&&revision===state.revision){message(report.stage);$('translation-detail').textContent=report.detail;state.progressDetail=true;}});
      if(source!=='en')analysis.assumptions.unshift('The meaning parser analyzed this local English translation: '+english);
    }
    if(revision!==state.revision||job!==state.job)return;
    showAnalysis(analysis.ast,analysis);state.lastText=text;
    message(analysis.ast.op==='TEXT'?'Exact wording preserved. This is a text literal, not a formal semantic translation.':analysis.method==='On-device AI'?'Translated on your device. Review the literal reading before sharing.':'Translated locally. Select a glyph below to inspect it.');
  }catch(e){if(revision===state.revision&&job===state.job){message(e.message,true);if(source!=='expression'){$('fallback-message').textContent='Automatic interpretation failed. Exact wording can be preserved as a separate text literal.';$('fallback').hidden=false;}}}
  finally{if(job===state.job)busy(false);}
}
async function reverseReading(){
  if(!state.ast)return;const ast=state.ast,target=$('target-language').value,revision=state.revision,job=++state.job;busy(true);message('Reading the decoded expression…');$('result-text').textContent='';$('copy-text').disabled=true;
  try{
    const graph=decodeMeaningDocument(ast);let result=graph&&target===graph.language?graph.source:graph&&target===graph.interpretationLanguage?graph.documents.map(d=>d.source).join(''):semanticKnownReading(ast,target),generated=false;
    if(graph&&!result&&ai.isReady()){message('Translating the preserved source words locally…');result=await ai.translateText(graph.source,graph.language,target,modelActivity);generated=true;}
    if(!graph&&!result && ai.isReady()){message('Translating the decoded meaning on your device…');result=await ai.translateReading(ast,target,modelActivity);generated=true;}
    if(!graph&&!result && target==='en'&&ast.op!=='TEXT')result=semanticReading(ast);
    if(revision!==state.revision||job!==state.job)return;
    if(result){$('result-text').textContent=result;$('copy-text').disabled=false;message(generated?'Translated on your device. Review the English literal reading below.':graph&&target===graph.language?'Image decoded locally. Exact source words recovered; inspect the meaning graph below.':semanticKnownReading(ast,target)?'Meaning decoded and translated locally. Original wording is not stored.':'Image decoded locally. This is the structural English reading; enable AI for a natural sentence.');}
    else if(ast.op==='TEXT'){$('result-text').textContent=ast.value;$('copy-text').disabled=false;message('Exact wording recovered. Enable on-device AI to translate it into the selected language.');}
    else{$('result-text').textContent='Enable on-device AI to translate this meaning into '+(LANGUAGES.find(l=>l.code===target)?.name||target)+'.';message('The image is decoded. Its complete literal reading is shown below.');}
  }catch(e){if(job===state.job)message(e.message,true);}finally{if(job===state.job)busy(false);}
}
async function acceptImage(file){
  if(!file||state.busy)return;invalidate();const revision=state.revision;busy(true);message('Decoding image pixels on your device…');
  try{
    const frame=await decodeImage(file);if(revision!==state.revision)return;
    showAnalysis(frame.ast,{frame,method:'Local image decoding',assumptions:scopeNotes(frame.ast)});$('dropzone').hidden=true;$('upload-preview').hidden=false;$('upload-name').textContent=file.name||'Pasted image';
    busy(false);await reverseReading();
  }catch(e){if(revision===state.revision){message(e.message,true);$('dropzone').hidden=false;$('upload-preview').hidden=true;}}finally{busy(false);}
}
async function swap(){
  if(state.busy)return;
  if(state.reverse){const target=$('target-language').value,g=state.ast?decodeMeaningDocument(state.ast):null,text=g&&target===g.language?g.source:state.ast?semanticKnownReading(state.ast,target)||$('result-text').textContent:null;$('source-language').value=target;$('target-language').value='silex';syncMode();invalidate();updateExampleLabels();if(text)$('source-text').value=text;count();if(text)await translate();else message('Enter a sentence in the selected input language.');}
  else{const cells=state.cells;state.revision++;$('source-language').value='silex';$('target-language').value=state.forwardLanguage;syncMode();if(cells){const blob=await pngBlob(cells,Number($('image-scale').value));await acceptImage(new File([blob],'silex.png',{type:'image/png'}));}else{invalidate();message('Choose a Silex image to decode.');}}
}
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),15000);}
function localAction(fn){return async()=>{try{await fn();}catch(e){message(e.message,true);}};}
$('translate').addEventListener('click',translate);
$('stop').addEventListener('click',()=>{ai.cancelGeneration();meaning.cancel();state.cancelReason='stop';state.revision++;$('stop').disabled=true;message('Stopping translation…');});
$('swap').addEventListener('click',localAction(swap));
$('source-text').addEventListener('input',()=>{if(state.busy){ai.cancelGeneration();meaning.cancel();state.cancelReason='edit';}invalidate();count();message(state.busy?'Text changed. Stopping the previous translation…':'Press Translate when your sentence is ready.');});
$('source-text').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();translate();}});
$('source-language').addEventListener('change',()=>{
  const prev=state.sourceLanguage,source=$('source-language').value,previous=EXAMPLES.find(e=>e.text[prev]===$('source-text').value);
  state.sourceLanguage=source;state.job++;busy(false);ai.cancelGeneration();meaning.cancel();invalidate();syncMode();updateExampleLabels();
  if(LANGUAGES.some(l=>l.code===source))state.forwardLanguage=source;
  if(source==='expression')$('source-text').value='(SEE ME YOU)';else if(previous&&previous.text[source])$('source-text').value=previous.text[source];count();message(source==='silex'?'Choose a Silex image to decode.':'Press Translate to use the selected language.');
});
$('target-language').addEventListener('change',()=>{if($('target-language').value==='silex'){$('source-language').value=state.sourceLanguage==='silex'?'en':state.sourceLanguage;syncMode();invalidate();message('Enter a sentence to translate.');}else{if(!state.reverse){const target=$('target-language').value;$('source-language').value='silex';syncMode();$('target-language').value=target;if(state.cells){const cells=state.cells;pngBlob(cells,Number($('image-scale').value)).then(blob=>acceptImage(new File([blob],'silex.png',{type:'image/png'})));}else{invalidate();message('Choose a Silex image to decode.');}}else{state.revision++;reverseReading();}}});
$('examples').addEventListener('change',()=>{if($('examples').value==='')return;const e=EXAMPLES[Number($('examples').value)];$('source-text').value=e.text[$('source-language').value]||e.text.en;invalidate();count();translate();});
$('exact-text').addEventListener('click',()=>{if(!$('source-text').value)return;const analysis=preserve($('source-text').value);showAnalysis(analysis.ast,analysis);state.lastText=$('source-text').value;message('Every character is preserved as exact text. Check the TEXT explanation below.');});
$('image-scale').addEventListener('change',renderImages);
$('download-png').addEventListener('click',localAction(async()=>{if(state.cells){download(await pngBlob(state.cells,Number($('image-scale').value)),'silex.png');message('PNG download started.');}}));
$('download-svg').addEventListener('click',()=>{if(state.cells){download(new Blob([svg(state.cells,Number($('image-scale').value))],{type:'image/svg+xml'}),'silex.svg');message('SVG download started.');}});
$('copy-image').addEventListener('click',localAction(async()=>{if(!state.cells)return;if(!navigator.clipboard?.write||!globalThis.ClipboardItem)throw new Error('This browser cannot copy an image here. Use Download PNG instead.');const blob=pngBlob(state.cells,Number($('image-scale').value));await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);message('Image copied.');}));
$('copy-text').addEventListener('click',localAction(async()=>{await navigator.clipboard.writeText($('result-text').textContent);message('Translation copied.');}));
$('copy-expression').addEventListener('click',localAction(async()=>{await navigator.clipboard.writeText(notation(state.ast));message('Expression copied.');}));
$('previous-glyphs').addEventListener('click',()=>{state.page--;renderGlyphs();});$('next-glyphs').addEventListener('click',()=>{state.page++;renderGlyphs();});
$('choose-image').addEventListener('click',()=>$('image-file').click());$('replace-image').addEventListener('click',()=>$('image-file').click());
$('image-file').addEventListener('change',()=>{acceptImage($('image-file').files[0]);$('image-file').value='';});
$('paste-image').addEventListener('click',localAction(async()=>{if(!navigator.clipboard?.read)throw new Error('Use Choose image or drag a downloaded PNG into the panel.');const items=await navigator.clipboard.read();const item=items.find(i=>i.types.includes('image/png'));if(!item)throw new Error('The clipboard does not contain a PNG image.');const blob=await item.getType('image/png');await acceptImage(new File([blob],'pasted-silex.png',{type:'image/png'}));}));
const dz=$('dropzone');for(const type of ['dragover','dragleave','drop'])dz.addEventListener(type,e=>{e.preventDefault();dz.classList.toggle('dragover',type==='dragover');if(type==='drop')acceptImage(e.dataTransfer.files[0]);});
document.addEventListener('paste',e=>{if(!state.reverse||state.busy)return;const item=[...(e.clipboardData?.items||[])].find(i=>i.type.startsWith('image/'));if(item){e.preventDefault();acceptImage(item.getAsFile());}});
$('load-model').addEventListener('click',localAction(async()=>{
  if(state.modelLoading){await ai.unloadModel();return;}
  state.modelLoading=true;$('load-model').textContent='Cancel download';$('model-progress').hidden=false;$('model-status').textContent='Checking GPU and downloading model files…';
  try{await ai.loadModel(report=>{$('model-progress').value=report.progress;$('model-status').textContent=report.text;});state.modelReady=true;$('load-model').hidden=true;$('unload-model').hidden=false;$('model-status').textContent='On-device AI is ready. Review its literal readings before sharing.';message('On-device AI enabled. Press Translate to interpret your sentence.');}
  catch(e){$('model-status').textContent=e.message;message(e.message,true);}
  finally{state.modelLoading=false;$('model-progress').hidden=true;$('load-model').textContent='Download model (~2.4 GB)';}
}));
$('unload-model').addEventListener('click',localAction(async()=>{if(state.busy)throw new Error('Stop the current translation before turning off AI.');await ai.unloadModel();state.modelReady=false;$('load-model').hidden=false;$('unload-model').hidden=true;$('model-status').textContent='AI is off. Cached model files remain on this device.';message('On-device AI turned off.');}));
syncMode();updateExampleLabels();invalidate();message('Press Translate. The meaning model downloads on first use (about 270 MB), then runs locally.');
