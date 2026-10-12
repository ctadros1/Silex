"""Independent profile-3 pixel decoder. Core profiles delegate to the unchanged
original reference codec. No browser DOM, source sentence or image metadata is used.
Run: python3 reference/silex_logic_codec.py message.png
"""
import json, sys
from pathlib import Path
import silex_codec as core

TYPES = ['entity','prop','nat','text','context','function','any']
def string(r):
    return core.read_bytes(r, r.uint()).decode('utf-8',errors='strict')
def decode(words):
    r = core.Reader(words)
    profile = r.word()
    if profile in (1,2): return core.notation(core.decode(core.unpacket(words)))
    if profile != 3 or r.word()!=1: raise ValueError('Unsupported vocabulary/profile')
    book = json.loads(Path(__file__).with_name('Logic-Vocabulary.json').read_text())
    entries = [(key,'x',types,None) for key,types,result,definition in book['operators']]
    for row in book['entries']:
        key,part,lemmas,definition,frames = row[:5]
        entries.append((key,part,None if part in ('v','p') else ['prop' if part=='r' else 'entity'],frames))
    local=[]
    for _ in range(r.uint()):
        key,part,definition=string(r),'nvarxp'[r.word()],string(r)
        if not key.startswith('local:') or any(e[0]==key for e in local): raise ValueError('Bad local declaration')
        types=None if part in ('v','p') else ['prop' if part=='r' else 'entity']
        if part=='x':
            result=TYPES[r.word()];types=[TYPES[r.word()] for _ in range(r.uint())]
        if part=='p':roles=r.word()
        local.append((key,part,types,None))
    size=r.uint();body=[r.word() for _ in range(size)];end=r.pos
    if ((r.word()<<6)|r.word())!=core.crc12(words[:end]):raise ValueError('Checksum mismatch')
    if any(words[r.pos:]):raise ValueError('Nonzero frame padding')
    entries+=local;reader=core.Reader(body)
    def expression(depth=0,scope=0):
        if depth>128:raise ValueError('Depth limit')
        op=core.NAMES[reader.word()];suffix='';arity=core.ARITIES[core.IDS[op]]
        if op=='SYMBOL':
            index=reader.uint()
            if index:
                key,part,types,frames=entries[index-1];op='@'+key
                if part=='p':
                    mask=reader.word();suffix='/'+str(mask);arity=bin(mask).count('1')
                elif part=='v':arity=reader.uint()
                else:arity=len(types)
            else:return '(SYMBOL '+json.dumps(string(reader),ensure_ascii=False)+')'
        elif op in ('NAT','REF'):
            value=reader.uint()
            if op=='REF':
                if value<3 or value>=scope:raise ValueError('Noncanonical/unbound variable')
                return '(REF '+str(value)+')'
            return str(value)
        elif op=='TEXT':return json.dumps(string(reader),ensure_ascii=False)
        elif op.startswith('V') and op[1:].isdigit():
            if int(op[1:])>=scope:raise ValueError('Unbound variable')
        elif op=='CALL':arity=reader.uint()+1
        args=[]
        for i in range(arity):
            nested=0 if op=='QUOTE' else scope+int(op in ('THE','SOME','ALL','LAM') or op=='LET' and i==1)
            args.append(expression(depth+1,nested))
        return '('+op+suffix+(' '+' '.join(args) if args else '')+')' if args or op.startswith('@') else op
    result=expression()
    if reader.pos!=len(body):raise ValueError('Trailing expression data')
    return result

def pixels(path):
    from PIL import Image
    im=Image.open(path).convert('L');box=im.point(lambda p:255 if p<128 else 0).getbbox()
    if not box:raise ValueError('Empty image')
    unit=box[0]
    if not unit or box[1]!=unit or im.width%unit or im.height%unit:raise ValueError('Invalid crop/scale')
    cells=[]
    for y in range(im.height//unit):
        row=[]
        for x in range(im.width//unit):
            values=[v<128 for v in im.crop((x*unit,y*unit,(x+1)*unit,(y+1)*unit)).getdata()]
            if min(values)!=max(values):raise ValueError('Blurred module')
            row.append(int(values[0]))
        cells.append(row)
    for rotation in range(4):
        try:
            H,W=len(cells),len(cells[0])
            if (W-4)%2 or (H-4)%3:raise ValueError('Dimensions')
            cols=(W-4)//2;rows=(H-4)//3;words=[]
            for i in range(cols*rows):
                x,y=2+2*(i%cols),2+3*(i//cols);value=0
                for j in range(6):value=(value<<1)|cells[y+j//2][x+j%2]
                words.append(value)
            if core.grid(words,cols)!=cells:raise ValueError('Border damage')
            return decode(words)
        except (ValueError,IndexError):cells=[list(row) for row in zip(*cells[::-1])]
    raise ValueError('Invalid Silex panel')

if __name__=='__main__':print(pixels(sys.argv[1]))
