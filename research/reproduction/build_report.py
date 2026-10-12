from __future__ import annotations
import base64, html, importlib.util, json, math, re, textwrap, zlib
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, Preformatted, KeepTogether

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'outputs'
sp=importlib.util.spec_from_file_location('silex',OUT/'silex_codec.py')
s=importlib.util.module_from_spec(sp); sp.loader.exec_module(s)
rows=json.loads((OUT/'examples.json').read_text())
results=json.loads((OUT/'results.json').read_text())
md=(ROOT/'work'/'specification-template.md').read_text()
study=json.loads((OUT/'compression-study.json').read_text())
md=md.replace('@COMPRESSION_STUDY@',f"In an executed stress probe, an exact TEXT literal containing 1,000 repeated ASCII a characters required {study['direct_area_px2']:,} square pixels in the direct profile and {study['chosen_area_px2']:,} square pixels in the automatically selected compressed profile, at u = 2 pixels. The complete compressed PNG decoded back to all 1,000 exact characters. This {study['direct_area_px2']/study['chosen_area_px2']:.2f}-fold transport reduction exploits repetition in that particular literal; it is not a general semantic-density estimate.")

roles={
 'TRUE':'constant true proposition','FALSE':'constant false proposition',
 'NOT':'proposition -> proposition','AND':'proposition, proposition','OR':'proposition, proposition',
 'IF':'antecedent, consequent; material implication','ALL':'bound restriction, bound body',
 'SOME':'bound restriction, bound body','LAM':'one bound body','APP':'function, argument',
 'LET':'definition, body with bound definition','EQ':'two values of the same declared type',
 'AT':'context, proposition','SAY':'agent, proposition content or exact text',
 'KNOW':'agent, proposition; factive','BELIEVE':'agent, proposition',
 'CAUSE':'cause event, effect event','BEFORE':'earlier event, later event',
 'PAIR':'first value, second value','NIL':'empty sequence',
 'NAT':'unsigned integer payload','TEXT':'UTF-8 literal payload','REF':'binding-distance payload',
 'SYMBOL':'UTF-8 semantic-identifier payload','CALL':'argument count, function, counted arguments',
 'THE':'bound unique-entity restriction','QUOTE':'closed expression as exact syntax',
 'V0':'innermost bound value','V1':'next outer bound value','V2':'third bound value',
 'ME':'utterance speaker','YOU':'utterance addressee','NOW':'utterance context c0',
 'PAST':'proposition at some earlier time','FUTURE':'proposition at some later time',
 'POSSIBLE':'proposition in some accessible world','NECESSARY':'proposition in all accessible worlds',
 'WANT':'agent, desired proposition','OUGHT':'proposition in all normative ideal worlds',
 'ASK':'proposition or closed answer function',
 'CHILD':'entity is a child','BIRD':'entity is a bird','RED':'entity is red',
 'SEE':'viewer, viewed entity','GIVE':'giver, given entity, recipient',
 'LOVE':'lover, loved entity','PERSON':'entity is a person','BOOK':'entity is a book',
 'READ':'reader, read entity','BUILD':'builder, built entity','SCIENTIST':'entity is a scientist',
 'CITY':'entity is a city','LIVE':'resident, inhabited place','HELP':'helper, helped entity',
 'REMEMBER':'rememberer, remembered entity or content','DIE':'entity dies in the evaluation context',
 'MACHINE':'entity is a machine','SOLVE':'solver, solved problem','PROBLEM':'entity is a problem',
 'PROVE':'prover, proposition proved','FAIL':'entity/project fails in the evaluation context',
 'RUN':'entity runs in the evaluation context','WATER':'water substance/type value',
 'DRINK':'drinker, consumed substance/entity'}
registry='| ID | Head | Children | Meaning or ordered roles |\n|---|---|---|---|\n'
for i,n in enumerate(s.NAMES):
    a='variable' if s.ARITIES[i]<0 else str(s.ARITIES[i])
    registry+=f'| {i} | {n} | {a} | {roles[n]} |\n'
md=md.replace('@REGISTRY@',registry)

examples=''
for r in rows:
    examples+=f"### {r['id']}. {r['english']}\n\n"
    examples+=f"Mandarin gloss: {r['mandarin']}\n\n"
    examples+=f"```\n{r['notation']}\n```\n\n"
    examples+=f"{r['body_glyphs']} body glyphs; {r['body_bits']} body description bits; {r['packet_glyphs']} packet glyphs before rectangular padding.\n\n"
    examples+=r['note']+'\n\n'
md=md.replace('@EXAMPLES@',examples)

t='| Sample / protocol | English area / Silex area | Mandarin area / Silex area |\n|---|---|---|\n'
for group,label in [('core','9 core examples'),('stress','4 stress examples'),('all','All 13 examples')]:
    for protocol,label2 in [('equal_em','equal em'),('feature','fine display')]:
        r=results['totals'][group]
        t+=f"| {label}, {label2} | {r[f'english_{protocol}_ratio']:.3f} | {r[f'mandarin_{protocol}_ratio']:.3f} |\n"
t+='\nFull-sample allocated areas:\n\n| Representation | Area in square pixels |\n|---|---|\n'
tt=results['totals']['all']
for label,f in [('English','english_px2'),('Mandarin','mandarin_px2'),('Silex, equal em','silex_equal_em_px2'),('Silex, fine display','silex_feature_px2')]:
    t+=f'| {label} | {tt[f]:,.2f} |\n'
t+='\nIndividual measurements:\n\n| Example | Body glyphs | English area | Mandarin area | Silex fine-display area |\n|---|---|---|---|---|\n'
for r in rows:
    t+=f"| {r['id']} | {r['body_glyphs']} | {r['english_px2']:,} | {r['mandarin_px2']:,} | {r['silex_feature_px2']:,} |\n"
totalmods=tt['silex_feature_px2']/4
t+=f"\nThe 13 independent frames carry {tt['body_bits']:,} body description bits in {totalmods:,.0f} total module sites, or {tt['body_bits']/totalmods:.3f} body bits per allocated module. Small-frame overhead leaves this far below the payload-only one-bit-per-module limit.\n"
md=md.replace('@RESULTS@',t)

t='| Source | Raw bytes | zlib bytes | Same-carrier area, square pixels |\n|---|---|---|---|\n'
for r in results['same_carrier_controls']:
    t+=f"| {r['language']} | {r['uncompressed_bytes']} | {r['zlib_bytes']} | {r['carrier_px2']:,} |\n"
cc=results['same_carrier_controls']
t+=f"\nThe carrier-area ratios become {cc[1]['carrier_px2']/cc[0]['carrier_px2']:.3f} for English and {cc[2]['carrier_px2']/cc[0]['carrier_px2']:.3f} for Mandarin. zlib version: {results['zlib_version']}. The Silex compressed stream is larger than its raw packed batch on this short sample, so compression is not automatically beneficial.\n"
md=md.replace('@CONTROLS@',t)

# A fixed standalone bootstrap avoids self-referential file-size accounting.
start=md.index('## 4. Foundational glyphs')
end=md.index('## 8. Worked translations')
grammar='# Silex v1: glyphs, grammar, semantics, and expressibility\n\n'+md[start:end]
(OUT/'Grammar-and-Semantics.md').write_text(grammar,encoding='utf-8')
objects=[(OUT/'silex_codec.py').read_bytes(),(OUT/'lexicon.json').read_bytes(),grammar.encode('utf-8')]
boot=b''.join(len(b).to_bytes(8,'big')+b for b in objects)
compressed=zlib.compress(boot,9)
matrix=s.grid(s.packet(s.byte_words(compressed)))
bootarea=len(matrix)*len(matrix[0])*4
fields={'codec_bytes':len(objects[0]),'registry_bytes':len(objects[1]),'grammar_semantics_bytes':len(objects[2]),
        'length_framed_total_bytes':len(boot),'zlib_bytes':len(compressed),
        'common_binary_carrier_area_px2_at_u2':bootarea}
engsaving=(tt['english_px2']-tt['silex_feature_px2'])/13
zhsaving=(tt['mandarin_px2']-tt['silex_feature_px2'])/13
fields['demonstration_break_even_messages_english']=math.ceil(bootarea/engsaving)
fields['demonstration_break_even_messages_mandarin']=math.ceil(bootarea/zhsaving)
(OUT/'bootstrap-cost.json').write_text(json.dumps(fields,indent=2))
t='| Bootstrap component | UTF-8 bytes |\n|---|---|\n'
for label,f in [('Reference codec','codec_bytes'),('64-head registry','registry_bytes'),('Glyph, grammar, semantics, expressibility text','grammar_semantics_bytes'),('Total with three 8-byte length fields','length_framed_total_bytes'),('zlib-compressed total','zlib_bytes')]:
    t+=f'| {label} | {fields[f]:,} |\n'
t+=f"\nAt u = 2 pixels, sending the compressed bootstrap through a PREVIOUSLY KNOWN common binary carrier occupies {bootarea:,} square pixels. A reader must already know that carrier and the English used to explain Silex; teaching a decoder cannot presuppose itself. Relative to the fixed fine-display benchmark averages, this additional transfer cost would be offset after about {fields['demonstration_break_even_messages_english']} such English messages or {fields['demonstration_break_even_messages_mandarin']} such Mandarin messages. These counts use this deliberately chosen sample, ignore human learning time, and are not predictions for unseen language. At equal em, the full-sample Mandarin comparison has no favorable break-even because Silex messages themselves use more area.\n"
md=md.replace('@BOOTSTRAP@',t)
assert not re.search(r'@[A-Z]+@',md)
(OUT/'Silex-Specification.md').write_text(md,encoding='utf-8')

# A compact Markdown renderer for this controlled source; no network dependency.
def inline(x, pdf=False):
    x=html.escape(x)
    def link(m):
        label,url=m.group(1),html.unescape(m.group(2))
        if pdf:
            return f'<link href="{html.escape(url,quote=True)}" color="#215f71">{label}</link>'
        return f'<a href="{html.escape(url,quote=True)}">{label}</a>'
    x=re.sub(r'\[([^]]+)\]\(([^)]+)\)',link,x)
    x=re.sub(r'`([^`]+)`',lambda m:('<font name="Courier">'+m.group(1)+'</font>') if pdf else '<code>'+m.group(1)+'</code>',x)
    if pdf:
        x=re.sub(r'([\u3400-\u9fff\uff00-\uffff\u3000-\u303f]+)',r'<font name="Han">\1</font>',x)
    return x

def blocks(source):
    lines=source.splitlines(); out=[]; i=0
    while i<len(lines):
        ln=lines[i]
        if not ln.strip(): i+=1; continue
        if ln.startswith('```'):
            code=[]; i+=1
            while i<len(lines) and not lines[i].startswith('```'): code.append(lines[i]); i+=1
            i+=1; out.append(('code','\n'.join(code))); continue
        if ln.startswith('|'):
            tab=[]
            while i<len(lines) and lines[i].startswith('|'):
                if not re.fullmatch(r'[|\- :]+',lines[i]): tab.append([p.strip() for p in lines[i].strip('|').split('|')])
                i+=1
            out.append(('table',tab)); continue
        if ln.startswith('!['):
            m=re.fullmatch(r'!\[([^]]*)\]\(([^)]+)\)',ln); out.append(('image',m.groups())); i+=1; continue
        if ln.startswith('#'):
            m=re.match(r'(#+) (.*)',ln); out.append(('h'+str(len(m[1])),m[2])); i+=1; continue
        para=[ln]; i+=1
        while i<len(lines) and lines[i].strip() and not re.match(r'[#|!`]',lines[i]): para.append(lines[i]); i+=1
        out.append(('p',' '.join(para)))
    return out

bb=blocks(md)
article=[]
for kind,value in bb:
    if kind.startswith('h'):
        article.append(f'<{kind}>{inline(value)}</{kind}>')
    elif kind=='p': article.append('<p>'+inline(value)+'</p>')
    elif kind=='code': article.append('<pre><code>'+html.escape(value)+'</code></pre>')
    elif kind=='image':
        alt,fn=value
        data=base64.b64encode((OUT/fn).read_bytes()).decode()
        article.append(f'<figure><img src="data:image/png;base64,{data}" alt="{html.escape(alt)}"><figcaption>{html.escape(alt)}</figcaption></figure>')
    elif kind=='table':
        head='<tr>'+''.join('<th>'+inline(c)+'</th>' for c in value[0])+'</tr>'
        body=''.join('<tr>'+''.join('<td>'+inline(c)+'</td>' for c in row)+'</tr>' for row in value[1:])
        article.append('<div class="table-wrap"><table><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>')

lab_data=[{k:r[k] for k in ('id','english','mandarin','notation','tokens','body_glyphs','body_bits','frame_modules','english_px2','mandarin_px2')} for r in rows]
lab_data_json=json.dumps(lab_data,ensure_ascii=False).replace('</','<\\/')
html_doc='''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Silex: a visual semantic language</title>
<style>
:root{color-scheme:light;--paper:#f7f4ee;--ink:#182a30;--muted:#54656a;--line:#c7cfcb;--accent:#215f71}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 system-ui,-apple-system,sans-serif}
main{max-width:1000px;padding:40px 28px 80px;margin:auto}a{color:var(--accent)}h1{font-size:clamp(44px,9vw,88px);line-height:1.1;letter-spacing:-.04em;margin:12px 0 6px}h2{font-size:27px;line-height:1.3;margin-top:44px}h3{font-size:19px;line-height:1.4;margin-top:30px}p{max-width:83ch}pre{font:13px/1.6 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;background:#ebe9e2;padding:18px}code{font-size:.9em}img{max-width:100%;height:auto}figure{margin:28px 0}figcaption{color:var(--muted);font-size:13px;margin-top:8px}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px;margin:22px 0}th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{font-weight:600}nav{display:flex;gap:20px;flex-wrap:wrap;margin:24px 0;font-size:14px}.lab{border-top:2px solid var(--ink);border-bottom:1px solid var(--line);padding:26px 0;margin:26px 0 44px}.controls{display:flex;gap:22px;flex-wrap:wrap;align-items:end}.controls label{display:grid;gap:6px;font-size:14px}.controls select{max-width:100%;width:min(470px,75vw)}select,button,input{font:inherit;color:inherit}select,button{padding:9px;background:white;border:1px solid var(--line)}input[type=range]{max-width:100%;width:220px}.pane>div{min-width:0}.pane{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:22px}.metrics{font-size:14px;color:var(--muted)}#native{width:max-content;max-width:100%;overflow-x:auto;background:white}#native svg{display:block}#reading{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.morph{display:grid;justify-items:center;gap:3px;width:58px;font-size:10px;color:var(--muted)}#notation{font-size:13px;overflow-wrap:anywhere}#sense{font-size:20px;line-height:1.5}#warning{font-size:13px;color:var(--muted)}.eyebrow{font-size:13px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted)}.bar-row{display:grid;grid-template-columns:85px 1fr 85px;gap:12px;align-items:center;font-size:13px;margin:9px 0}.bar{height:12px;background:var(--ink)}.bar.silex{background:var(--accent)}@media(max-width:650px){main{padding:24px 18px 50px}.pane{grid-template-columns:1fr}h2{font-size:23px}.controls{display:grid;gap:18px}.controls select{width:100%}.bar-row{grid-template-columns:72px 1fr 70px;gap:8px}}
@media print{.lab,nav{display:none}body{background:white}main{max-width:none;padding:0}h2,h3{break-after:avoid}figure,pre,tr{break-inside:avoid}a{color:inherit}}
</style></head><body><main><div class="eyebrow">Experimental language design / 11 October 2026</div>
<h1>SILEX</h1><p>A scoped meaning grammar written in six-site morphs. Complete digital decoding; experimental visual viability.</p>
<nav><a href="#explore">Explore the writing</a><a href="#spec">Read the specification</a></nav>
<section class="lab" id="explore" aria-label="Silex specimen explorer"><div class="controls">
<label for="sample">Selected meaning<select id="sample"></select></label>
<label for="unit">Module width: <span id="unit-value">2 px</span><input id="unit" type="range" min="2" max="12" step="1" value="2"></label>
</div><div class="pane"><div><div id="sense"></div><p id="mandarin"></p><div id="notation"></div><p class="metrics" id="payload"></p></div><div><div id="native"></div><p class="metrics" id="dimensions" aria-live="polite"></p><div id="areas"></div></div></div>
<p id="warning">The area changes with physical module size. Equal recognition error has not been measured. The separated glyphs below are an enlarged reading aid; header words and payload words use the same alphabet.</p><div id="reading" aria-label="Body glyph sequence"></div></section>
<article id="spec">'''+''.join(article[1:])+'''</article></main>
<script>
const examples='''+lab_data_json+''';
const names='''+json.dumps(s.NAMES)+''';
const arities='''+json.dumps(s.ARITIES)+''';
const select=document.getElementById('sample');
examples.forEach((r,i)=>{let op=document.createElement('option');op.value=i;op.textContent=r.id+' · '+r.english;select.appendChild(op)});
function uint(n){let a=[];while(n>=32){a.push((n&31)|32);n=Math.floor(n/32)}return a.concat(n)}
function crc12(words){let crc=4095;for(let w of words){for(let i=5;i>=0;i--){let f=((crc>>11)&1)^((w>>i)&1);crc=(crc<<1)&4095;if(f)crc^=2063}}return crc}
function packet(b){let h=[1,...uint(b.length),...b],c=crc12(h);return [...h,c>>6,c&63]}
function annotate(words){let at=0,tags=[];function U(tag){let n=0,shift=0;while(true){let v=words[at];tags[at++]=tag;n+=(v&31)*2**shift;if(v<32)return n;shift+=5}}function E(){let value=words[at],op=names[value];tags[at++]=op;if(op==='NAT'||op==='REF'){U(op==='NAT'?'integer':'distance');return}if(op==='TEXT'||op==='SYMBOL'){let n=U('byte count');for(let j=0;j<Math.ceil(n*8/6);j++)tags[at++]='bytes';return}let k=arities[value];if(op==='CALL')k=U('argument count')+1;for(let j=0;j<k;j++)E()}E();if(at!==words.length)throw Error('Annotation parse mismatch');return tags}
function grid(words,W,H){let c=(W-4)/2;let a=Array.from({length:H},()=>Array(W).fill(0));for(let y=1;y<H-1;y++)a[y][1]=1;for(let x=1;x<W-1;x++)a[H-2][x]=1;for(let x=2;x<W-2;x++)a[1][x]=((x-2)%2===0)?1:0;for(let y=2;y<H-2;y++)a[y][W-2]=((y-2)%2===0)?1:0;words.forEach((w,i)=>{let x=2+2*(i%c),y=2+3*Math.floor(i/c);for(let j=0;j<6;j++)a[y+Math.floor(j/2)][x+j%2]=(w>>(5-j))&1});return a}
function draw(a,u,label){let H=a.length,W=a[0].length,d='';a.forEach((row,y)=>row.forEach((v,x)=>{if(v)d+=`M${x} ${y}h1v1h-1z `}));return `<svg xmlns="http://www.w3.org/2000/svg" width="${W*u}" height="${H*u}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" role="img" aria-label="${label}"><rect width="${W}" height="${H}" fill="white"/><path d="${d}" fill="black"/></svg>`}
function update(){const r=examples[+select.value],u=+document.getElementById('unit').value,[W,H]=r.frame_modules;document.getElementById('unit-value').textContent=u+' px';document.getElementById('sense').textContent=r.english;document.getElementById('mandarin').textContent=r.mandarin;document.getElementById('notation').textContent=r.notation;document.getElementById('payload').textContent=r.body_glyphs+' body glyphs · '+r.body_bits+' serialized body bits';document.getElementById('native').innerHTML=draw(grid(packet(r.tokens),W,H),u,'Complete Silex utterance');let a=W*H*u*u;document.getElementById('dimensions').textContent=`${W*u} × ${H*u} px = ${a.toLocaleString()} px², with the complete frame`;const vals=[['English',r.english_px2],['Mandarin',r.mandarin_px2],['Silex',a]];let max=Math.max(...vals.map(v=>v[1]));document.getElementById('areas').replaceChildren();vals.forEach(([n,v])=>{let row=document.createElement('div');row.className='bar-row';let label=document.createElement('span');label.textContent=n;let bar=document.createElement('div');bar.className='bar'+(n==='Silex'?' silex':'');bar.style.width=(100*v/max)+'%';let value=document.createElement('span');value.textContent=v.toLocaleString();row.append(label,bar,value);document.getElementById('areas').append(row)});let read=document.getElementById('reading');read.replaceChildren();const tags=annotate(r.tokens);r.tokens.forEach((w,i)=>{let el=document.createElement('div');el.className='morph';el.title='Word '+(i+1)+': '+w+'. Payload words use values, not head names.';let g=Array.from({length:3},()=>Array(2).fill(0));for(let j=0;j<6;j++)g[Math.floor(j/2)][j%2]=(w>>(5-j))&1;el.innerHTML=draw(g,8,'Six-bit word '+w);let text=document.createElement('span');text.textContent=w+' · '+tags[i];el.append(text);read.append(el)})}
select.addEventListener('change',update);document.getElementById('unit').addEventListener('input',update);update();
</script></body></html>'''
(OUT/'Silex-Laboratory.html').write_text(html_doc,encoding='utf-8')

# Print report: portrait pages with readable live text and embedded exact specimens.
pdfmetrics.registerFont(TTFont('Arial','/System/Library/Fonts/Supplemental/Arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialBold','/System/Library/Fonts/Supplemental/Arial Bold.ttf'))
pdfmetrics.registerFont(TTFont('Han','/System/Library/Fonts/Supplemental/Arial Unicode.ttf'))
pdfmetrics.registerFontFamily('Arial',normal='Arial',bold='ArialBold',italic='Arial',boldItalic='ArialBold')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyS',fontName='Arial',fontSize=9.5,leading=13.7,textColor=colors.HexColor('#182a30'),spaceAfter=8))
styles.add(ParagraphStyle(name='H1S',fontName='ArialBold',fontSize=33,leading=38,spaceAfter=10))
styles.add(ParagraphStyle(name='H2S',fontName='ArialBold',fontSize=17,leading=21,spaceBefore=17,spaceAfter=9,keepWithNext=True))
styles.add(ParagraphStyle(name='H3S',fontName='ArialBold',fontSize=12,leading=16,spaceBefore=12,spaceAfter=7,keepWithNext=True))
styles.add(ParagraphStyle(name='SmallS',fontName='Arial',fontSize=8,leading=10.5,textColor=colors.HexColor('#54656a'),spaceAfter=8))
styles.add(ParagraphStyle(name='TableS',fontName='Arial',fontSize=8,leading=11))
styles.add(ParagraphStyle(name='CodeS',fontName='Courier',fontSize=7.6,leading=10.5,leftIndent=8,spaceAfter=10))
story=[]
WIDTH=524
for kind,value in bb:
    if kind.startswith('h'):
        p=Paragraph(inline(value,True),styles[{'h1':'H1S','h2':'H2S','h3':'H3S'}[kind]]); p.keepWithNext=(value!='Head registry'); story.append(p)
    elif kind=='p': story.append(Paragraph(inline(value,True),styles['BodyS']))
    elif kind=='code':
        chunks=[]
        for line in value.splitlines():
            chunks+=textwrap.wrap(line,width=94,replace_whitespace=False,drop_whitespace=False,subsequent_indent='  ') or ['']
        story.append(Preformatted('\n'.join(chunks),styles['CodeS']))
    elif kind=='image':
        alt,fn=value; reader=ImageReader(str(OUT/fn)); w,h=reader.getSize(); scale=min(WIDTH/w,410/h)
        story.append(Image(str(OUT/fn),width=w*scale,height=h*scale))
        story.append(Paragraph(inline(alt,True),styles['SmallS']))
    elif kind=='table':
        count=len(value[0])
        if count==4 and value[0][0]=='ID': widths=[30,72,44,378]
        elif count==2: widths=[358,166]
        elif count==3: widths=[260,132,132]
        elif count==4: widths=[160,98,98,168]
        else: widths=[WIDTH/count]*count
        data=[[Paragraph(inline(c,True),styles['TableS']) for c in row] for row in value]
        tab=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
        tab.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e7e9e3')),
                                ('LINEBELOW',(0,0),(-1,-1),.3,colors.HexColor('#c7cfcb')),
                                ('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),6),
                                ('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),6),
                                ('BOTTOMPADDING',(0,0),(-1,-1),6)]))
        story += [tab,Spacer(1,10)]

def footer(can,doc):
    can.saveState();can.setStrokeColor(colors.HexColor('#c7cfcb'));can.setLineWidth(.4);can.line(44,38,568,38)
    can.setFont('Arial',8);can.setFillColor(colors.HexColor('#54656a'));can.drawString(44,25,'SILEX v1  |  Experimental visual semantic language')
    can.drawRightString(568,25,str(doc.page));can.restoreState()

doc=SimpleDocTemplate(str(OUT/'Silex-Research-Report.pdf'),pagesize=(612,792),
                      rightMargin=44,leftMargin=44,topMargin=44,bottomMargin=52,
                      title='Silex: A Visual Semantic Language, Version 1',author='Codex')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(json.dumps({'bootstrap':fields,'report_pdf_bytes':(OUT/'Silex-Research-Report.pdf').stat().st_size,
                 'html_bytes':(OUT/'Silex-Laboratory.html').stat().st_size,
                 'spec_words':len(md.split())},indent=2))
