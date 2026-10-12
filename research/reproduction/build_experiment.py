from __future__ import annotations
import csv, html, importlib.util, json, math, sys, zlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs'
spec=importlib.util.spec_from_file_location('silex',OUT/'silex_codec.py')
s=importlib.util.module_from_spec(spec); spec.loader.exec_module(s)
EN_FONT='/System/Library/Fonts/Supplemental/Arial.ttf'
ZH_FONT='/System/Library/Fonts/Supplemental/Arial Unicode.ttf'
enf=ImageFont.truetype(EN_FONT,32)
zhf=ImageFont.truetype(ZH_FONT,32)
f12=ImageFont.truetype(EN_FONT,16)
f16=ImageFont.truetype(EN_FONT,22)
f24=ImageFont.truetype(EN_FONT,34)
f36=ImageFont.truetype(EN_FONT,48)

examples=[
('01','I see you.','我看见你。','(SEE ME YOU)',
 'SEE is evaluated in the utterance context. No additional tense or evidential claim is supplied.','core'),
('02','I do not see you.','我没看见你。','(NOT (SEE ME YOU))',
 'Negation scopes over the whole seeing proposition. The Chinese gloss is intended with the same situational reading.','core'),
('03','I see the red bird.','我看见那只红鸟。','(SEE ME (THE (AND (BIRD V0) (RED V0))))',
 'THE selects the unique red bird in the explicitly shared contextual domain; failure of uniqueness is a presupposition failure.','core'),
('04','Every child sees a bird.','每个孩子都看见一只鸟。','(ALL (CHILD V0) (SOME (BIRD V0) (SEE V1 V0)))',
 'Chosen reading: for every child, there is a possibly different bird that child sees. Existence of children is not asserted.','core'),
('05','There is a bird that every child sees.','有一只鸟，每个孩子都看见它。','(SOME (BIRD V0) (ALL (CHILD V0) (SEE V0 V1)))',
 'One bird is outside the child quantifier. This differs from example 04 even when the glyph counts coincide.','core'),
('06','If every child reads a book, I will help you.','如果每个孩子都读一本书，我就会帮助你。','(IF (ALL (CHILD V0) (SOME (BOOK V0) (READ V1 V0))) (FUTURE (HELP ME YOU)))',
 'IF is material implication, with present-context reading in the antecedent and a future-context consequent. It is not a causal or counterfactual conditional.','core'),
('07','You believe that I know that every scientist lives in a city.','你相信我知道每位科学家都住在一座城市里。','(BELIEVE YOU (KNOW ME (ALL (SCIENTIST V0) (SOME (CITY V0) (LIVE V1 V0)))))',
 'The scientist and city quantifiers are inside both attitude operators, so their domains are evaluated there.','core'),
('08','Every scientist believes that every machine they build might solve every problem.','每位科学家都相信，自己造的每台机器也许能解决所有问题。','(ALL (SCIENTIST V0) (BELIEVE V0 (ALL (AND (MACHINE V0) (BUILD V1 V0)) (POSSIBLE (ALL (PROBLEM V0) (SOLVE V1 V0))))))',
 'Chosen scope: an actual scientist is fixed outside belief; inside belief, each machine has a possible world in which it solves all problems. This does not mean separately possible success for each problem.','core'),
('09','If every child believes that someone loves them, then I know that you will help every child who reads a book.','如果每个孩子都相信有人爱自己，那么我知道你将帮助每个读书的孩子。','(IF (ALL (CHILD V0) (BELIEVE V0 (SOME (PERSON V0) (LOVE V0 V1)))) (KNOW ME (FUTURE (ALL (AND (CHILD V0) (SOME (BOOK V0) (READ V1 V0))) (HELP YOU V0)))))',
 'Someone means a person. The relative-clause restriction and help proposition are inside FUTURE; the child domains can differ between the two branches.','core'),
('10',"You said: 'Hello, world!'.",'你说：“Hello, world!”','(PAST (SAY YOU "Hello, world!"))',
 'Exact quoted bytes are preserved in all three renderings. A translated quotation would carry different literal information. PAST explicitly locates the utterance earlier than the evaluation context. SAY reports content without asserting its truth.','stress'),
('11','Every axolotl sees you.','每只墨西哥钝口螈都看见你。','(ALL (CALL (SYMBOL "urn:silex:demo:axolotl") V0) (SEE V0 YOU))',
 'This pays for the full identifier instead of assigning a convenient new one-glyph word. Biological grounding of the identifier must already be shared or separately supplied; the table does not count a biological definition.','stress'),
('12','Let S mean a person who sees themself. Every S remembers themself.','设S表示能看见自己的人，每个S都记得自己。','(LET (LAM (AND (PERSON V0) (SEE V0 V0))) (ALL (APP V1 V0) (REMEMBER V0 V0)))',
 'A fresh property is defined compositionally in the message. The arbitrary label S is replaced by a local binder, which preserves the alpha-equivalent formal claim. No new dictionary entry is assumed.','stress'),
('13','There are at least two people.','至少有两个人。','(SOME (PERSON V0) (SOME (AND (PERSON V0) (NOT (EQ V0 V1))) TRUE))',
 'The existential witnesses must be distinct. This asserts at least two, without an upper bound.','stress')
]

def split_text(text,font,limit,chinese=False):
    units=list(text) if chinese else text.split(' ')
    sep='' if chinese else ' '
    lines=[]; current=''
    for token in units:
        trial=current+sep+token if current else token
        if current and font.getlength(trial)>limit:
            lines.append(current); current=token
        else: current=trial
    if current: lines.append(current)
    return lines

def text_box(text,font,chinese=False):
    # Fixed 32 px em, 40 px line advance, 4 px quiet margin on every side.
    # Exhaustive integer wrap-width sweep; no English hyphenation.
    choices=[]
    for width in range(32,513):
        lines=split_text(text,font,width,chinese)
        w=math.ceil(max(font.getlength(x) for x in lines))+8
        h=40*len(lines)+8
        choices.append((w*h,abs(math.log(w/h)),w,h,lines))
    _,_,w,h,lines=min(choices)
    im=Image.new('RGB',(w,h),'white'); d=ImageDraw.Draw(im)
    for i,line in enumerate(lines): d.text((4,4+i*40),line,font=font,fill='black')
    return im,lines

def glyph_bitmap(value,unit=8):
    im=Image.new('RGB',(2*unit,3*unit),'white'); d=ImageDraw.Draw(im)
    for bit in range(6):
        if (value>>(5-bit))&1:
            x=(bit%2)*unit; y=(bit//2)*unit
            d.rectangle((x,y,x+unit-1,y+unit-1),fill='black')
    return im

rows=[]
for eid,en,zh,ref,note,group in examples:
    ast=s.parse(ref); body=s.encode(ast); pkt=s.packet(body); matrix=s.grid(pkt)
    native=OUT/f'silex-{eid}.png'; s.png(matrix,native,2)
    assert s.notation(s.decode_png(native))==s.notation(ast)
    (OUT/f'silex-{eid}.svg').write_text(s.svg(matrix,8,en),encoding='utf-8')
    eim,elines=text_box(en,enf); zim,zlines=text_box(zh,zhf,True)
    eim.save(ROOT/'work'/f'en-{eid}.png'); zim.save(ROOT/'work'/f'zh-{eid}.png')
    W,H=len(matrix[0]),len(matrix)
    # Equal-em control: glyph height 3u = 32 px. Fractional vector area is valid.
    equal_em=W*H*(32/3)**2
    row={'id':eid,'group':group,'english':en,'mandarin':zh,'notation':s.notation(ast),
         'note':note,'ast':ast,'tokens':body,'body_glyphs':len(body),'body_bits':6*len(body),
         'packet_glyphs':len(pkt),'frame_modules':[W,H],
         'frame_padding_glyphs':((W-4)//2)*((H-4)//3)-len(pkt),
         'silex_feature_px2':W*H*4,'silex_equal_em_px2':equal_em,
         'english_px2':eim.width*eim.height,'mandarin_px2':zim.width*zim.height,
         'english_lines':elines,'mandarin_lines':zlines,
         'english_feature_ratio':eim.width*eim.height/(W*H*4),
         'mandarin_feature_ratio':zim.width*zim.height/(W*H*4),
         'english_equal_em_ratio':eim.width*eim.height/equal_em,
         'mandarin_equal_em_ratio':zim.width*zim.height/equal_em}
    rows.append(row)

(OUT/'examples.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'lexicon.json').write_text(json.dumps(s.REGISTRY,indent=2),encoding='utf-8')
fields=['id','group','body_glyphs','body_bits','packet_glyphs','frame_padding_glyphs',
        'silex_feature_px2','silex_equal_em_px2','english_px2','mandarin_px2',
        'english_feature_ratio','mandarin_feature_ratio','english_equal_em_ratio','mandarin_equal_em_ratio']
with (OUT/'benchmark.csv').open('w',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore'); writer.writeheader(); writer.writerows(rows)

# All three sources through the same binary visual carrier. Text remains UTF-8;
# Silex's AST remains six-bit tokens. This is a control, not semantic entropy.
raws={
 'Silex':b'',
 'English':'\n'.join(row['english'] for row in rows).encode('utf-8'),
 'Mandarin':'\n'.join(row['mandarin'] for row in rows).encode('utf-8')}
batch_words=s.uint(len(rows))
for row in rows:
    batch_words+=s.uint(len(row['tokens']))+row['tokens']
packed_bits=''.join(f'{v:06b}' for v in batch_words)
packed_bits+='0'*(-len(packed_bits)%8)
raws['Silex']=bytes(int(packed_bits[i:i+8],2) for i in range(0,len(packed_bits),8))
controls=[]
for lang,data in raws.items():
    compressed=zlib.compress(data,9)
    words=s.byte_words(compressed); mg=s.grid(s.packet(words))
    controls.append({'language':lang,'uncompressed_bytes':len(data),'zlib_bytes':len(compressed),
                     'carrier_px2':len(mg)*len(mg[0])*4})

totals={}
for group in ('core','stress','all'):
    rr=[r for r in rows if group=='all' or r['group']==group]
    sums={f:sum(r[f] for r in rr) for f in ['silex_feature_px2','silex_equal_em_px2','english_px2','mandarin_px2','body_bits','body_glyphs']}
    sums['messages']=len(rr)
    for protocol in ('feature','equal_em'):
        for language in ('english','mandarin'):
            sums[f'{language}_{protocol}_ratio']=sums[f'{language}_px2']/sums[f'silex_{protocol}_px2']
    totals[group]=sums
results={'protocol':{'english_font':EN_FONT,'mandarin_font':ZH_FONT,'natural_em_px':32,
                     'natural_line_advance_px':40,'natural_quiet_px_per_side':4,
                     'natural_wrap_widths_px':[32,512],'silex_feature_module_px':2,
                     'silex_equal_em_module_px':32/3,
                     'warning':'Nominal feature/display comparison, not a measured equality of human or OCR error rates. Chinese translations are authored glosses, not independently validated.'},
         'totals':totals,'same_carrier_controls':controls,'zlib_version':zlib.ZLIB_VERSION}
(OUT/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')

# Glyph atlas.
atlas=Image.new('RGB',(1280,1090),'#f7f4ee'); d=ImageDraw.Draw(atlas)
d.text((36,24),'SILEX  /  THE 64 MORPHS',font=f36,fill='#182a30')
d.text((38,86),'Six binary sites. Weight order: 32, 16 / 8, 4 / 2, 1.  Black = 1.',font=f16,fill='#34454a')
for i,name in enumerate(s.NAMES):
    x=36+(i%8)*154; y=146+(i//8)*112
    atlas.paste(glyph_bitmap(i,12),(x,y))
    d.text((x+34,y),f'{i:02d}',font=f12,fill='#68757a')
    d.text((x,y+46),name,font=f12,fill='#182a30')
    ar=s.ARITIES[i]
    d.text((x,y+68),('variable' if ar<0 else f'{ar} argument'+('s' if ar!=1 else '')),font=f12,fill='#68757a')
atlas.save(OUT/'glyph-atlas.png')

# Four increasingly complex written specimens, enlarged without interpolation.
pick=[rows[i] for i in (0,2,3,8)]
canvas=Image.new('RGB',(1280,1500),'#f7f4ee'); d=ImageDraw.Draw(canvas)
d.text((40,24),'SILEX  /  WRITTEN SPECIMENS',font=f36,fill='#182a30')
d.text((42,90),'Every black-and-white panel below is a complete, decodable utterance.',font=f16,fill='#34454a')
for j,row in enumerate(pick):
    y=156+j*318
    d.line((40,y-12,1240,y-12),fill='#c7ccca',width=1)
    d.text((42,y),f"{row['id']}   {row['body_glyphs']} body glyphs / {row['body_bits']} body bits",font=f16,fill='#536468')
    # English wraps at 780 px, with illustration on right.
    el=split_text(row['english'],f24,780)
    for k,line in enumerate(el): d.text((42,y+40+44*k),line,font=f24,fill='#182a30')
    nn=Image.open(OUT/f"silex-{row['id']}.png").convert('RGB')
    nn=nn.resize((nn.width*6,nn.height*6),Image.Resampling.NEAREST)
    canvas.paste(nn,(1236-nn.width,y+44))
    nl=split_text(row['notation'],f12,800)
    yy=y+48+44*len(el)+14
    for k,line in enumerate(nl): d.text((42,yy+25*k),line,font=f12,fill='#536468')
canvas.save(OUT/'written-specimens.png')

# Nominal feature/display comparison of one example at the measured sizes.
row=rows[8]
com=Image.new('RGB',(1100,820),'#f7f4ee'); d=ImageDraw.Draw(com)
d.text((40,26),'ONE CLAIM  /  THREE ALLOCATED AREAS',font=f36,fill='#182a30')
d.text((42,92),'Natural text: 32 px em. Silex: 2 px modules. Native panels are shown at 1:1.',font=f16,fill='#34454a')
for i,(name,p,area) in enumerate([
    ('English',ROOT/'work'/'en-09.png',row['english_px2']),
    ('Mandarin',ROOT/'work'/'zh-09.png',row['mandarin_px2']),
    ('Silex',OUT/'silex-09.png',row['silex_feature_px2'])]):
    x=40; y=162+i*166
    d.text((x,y),name,font=f24,fill='#182a30')
    d.text((x,y+47),f'{area:,} px²',font=f16,fill='#536468')
    im=Image.open(p).convert('RGB')
    com.paste(im,(250,y))
d.text((42,704),'The small Silex panel has not been validated for unaided human reading.',font=f16,fill='#34454a')
d.text((42,744),'Equal-em and shared-compressor controls are reported separately.',font=f16,fill='#34454a')
com.save(OUT/'comparison-native.png')

print(json.dumps({'totals':totals,'controls':controls,'rows':[{k:r[k] for k in ('id','body_glyphs','silex_feature_px2','english_px2','mandarin_px2')} for r in rows]},indent=2))
