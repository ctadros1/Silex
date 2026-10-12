"""Silex v1: reference codec for a compositional visual language.

Core encoding/decoding uses only Python's standard library. PNG operations
require Pillow. See Silex-Specification.md for meaning, framing and limitations.
"""
from __future__ import annotations
import argparse
import json
import math
import re
import zlib
from pathlib import Path

NAMES = '''TRUE FALSE NOT AND OR IF ALL SOME LAM APP LET EQ AT SAY KNOW BELIEVE
CAUSE BEFORE PAIR NIL NAT TEXT REF SYMBOL CALL THE QUOTE V0 V1 V2 ME YOU
NOW PAST FUTURE POSSIBLE NECESSARY WANT OUGHT ASK CHILD BIRD RED SEE GIVE
LOVE PERSON BOOK READ BUILD SCIENTIST CITY LIVE HELP REMEMBER DIE MACHINE
SOLVE PROBLEM PROVE FAIL RUN WATER DRINK'''.split()
ARITIES = [0,0,1,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,2,0,
           0,0,0,0,-1,1,1,0,0,0,0,0,0,1,1,1,1,2,1,1,
           1,1,1,2,3,2,1,1,2,2,1,1,2,2,2,1,1,2,1,2,1,1,0,2]
assert len(NAMES) == len(ARITIES) == 64
IDS = {n:i for i,n in enumerate(NAMES)}
REGISTRY = {n:{'id':i,'arity':ARITIES[i]} for i,n in enumerate(NAMES)}

def node(op, *args, value=None):
    n = {'op':op, 'args':list(args)}
    if value is not None:
        n['value'] = value
    return n

def validate(n, depth=0):
    if not isinstance(n, dict) or n.get('op') not in IDS:
        raise ValueError('Unknown expression head')
    op, args = n['op'], n.get('args', [])
    if not isinstance(args, list):
        raise ValueError('Arguments must be a list')
    arity = REGISTRY[op]['arity']
    if (arity >= 0 and len(args) != arity) or (op == 'CALL' and not args):
        raise ValueError(f'Incorrect arity for {op}')
    if op in ('NAT','REF'):
        v = n.get('value')
        if type(v) is not int or v < 0:
            raise ValueError('Unsigned integer required')
        if op == 'REF' and v >= depth:
            raise ValueError('Unbound reference')
    elif op in ('TEXT','SYMBOL'):
        if not isinstance(n.get('value'),str):
            raise ValueError('String payload required')
        n['value'].encode('utf-8',errors='strict')
        if op == 'SYMBOL' and not n['value']:
            raise ValueError('A symbol identifier cannot be empty')
    elif 'value' in n:
        raise ValueError('Unexpected payload')
    if op in ('V0','V1','V2') and int(op[1]) >= depth:
        raise ValueError('Unbound reference')
    for i,a in enumerate(args):
        d = depth
        if op in ('ALL','SOME','LAM','THE'):
            d += 1
        elif op == 'LET' and i == 1:
            d += 1
        elif op == 'QUOTE':
            d = 0
        validate(a,d)
    return n

def uint(n):
    if type(n) is not int or n < 0:
        raise ValueError('Unsigned integer required')
    out=[]
    while n >= 32:
        out.append((n & 31) | 32)
        n >>= 5
    return out+[n]

class Reader:
    def __init__(self, words):
        self.words=list(words)
        if any(type(w) is not int or not 0 <= w < 64 for w in self.words):
            raise ValueError('Six-bit values required')
        self.pos=0
    def word(self):
        if self.pos >= len(self.words):
            raise ValueError('Truncated input')
        v=self.words[self.pos]
        self.pos += 1
        return v
    def uint(self):
        n=0; shift=0; count=0
        while True:
            v=self.word(); count+=1
            n |= (v & 31) << shift
            if v < 32:
                if count > 1 and v == 0:
                    raise ValueError('Noncanonical unsigned integer')
                return n
            shift += 5

def byte_words(b):
    bits=''.join(f'{v:08b}' for v in b)
    bits += '0' * (-len(bits) % 6)
    return [int(bits[i:i+6],2) for i in range(0,len(bits),6)]

def read_bytes(r, count):
    bits=''.join(f'{r.word():06b}' for _ in range((count*8+5)//6))
    if any(c == '1' for c in bits[count*8:]):
        raise ValueError('Nonzero string padding')
    return bytes(int(bits[i:i+8],2) for i in range(0,count*8,8))

def encode(n):
    validate(n)
    def go(t):
        op=t['op']; out=[IDS[op]]
        if op in ('NAT','REF'):
            v=t['value']
            if op == 'REF' and v <= 2:
                return [IDS[f'V{v}']]
            out += uint(v)
        elif op in ('TEXT','SYMBOL'):
            b=t['value'].encode('utf-8')
            out += uint(len(b))+byte_words(b)
        elif op == 'CALL':
            out += uint(len(t['args'])-1)
        for a in t['args']:
            out += go(a)
        return out
    return go(n)

def decode(words):
    r=Reader(words)
    def go():
        op=NAMES[r.word()]
        if op in ('NAT','REF'):
            v=r.uint()
            if op == 'REF' and v <= 2:
                raise ValueError('Use the canonical V0/V1/V2 shortcut')
            return node(op,value=v)
        if op in ('TEXT','SYMBOL'):
            v=read_bytes(r,r.uint()).decode('utf-8',errors='strict')
            return node(op,value=v)
        k=REGISTRY[op]['arity']
        if op == 'CALL':
            k=r.uint()+1
        return node(op,*[go() for _ in range(k)])
    n=go()
    if r.pos != len(r.words):
        raise ValueError('Extra expression material')
    return validate(n)

TOKENIZER = re.compile(r'\s*(\(|\)|"(?:\\.|[^"\\])*"|[^\s()]+)')
def parse(text):
    tokens=[]; cursor=0
    while cursor < len(text):
        if not text[cursor:].strip():
            break
        m=TOKENIZER.match(text,cursor)
        if m is None:
            raise ValueError('Malformed reference notation')
        tokens.append(m.group(1)); cursor=m.end()
    p=0
    def go():
        nonlocal p
        if p >= len(tokens):
            raise ValueError('Truncated expression')
        t=tokens[p]; p+=1
        if t == '(':
            if p >= len(tokens): raise ValueError('Missing head')
            op=tokens[p]; p+=1
            if op not in IDS: raise ValueError(f'Unknown head {op}')
            if op in ('REF','NAT','TEXT','SYMBOL'):
                if p >= len(tokens): raise ValueError('Missing payload')
                raw=tokens[p]; p+=1
                v=json.loads(raw) if op in ('TEXT','SYMBOL') else int(raw)
                n=node(op,value=v)
            else:
                args=[]
                while p < len(tokens) and tokens[p] != ')': args.append(go())
                n=node(op,*args)
            if p >= len(tokens) or tokens[p] != ')':
                raise ValueError('Missing close parenthesis')
            p+=1
            return n
        if t.startswith('"'):
            return node('TEXT',value=json.loads(t))
        if re.fullmatch(r'\d+',t): return node('NAT',value=int(t))
        if t not in IDS: raise ValueError(f'Unknown leaf {t}')
        return node(t)
    n=go()
    if p != len(tokens): raise ValueError('Trailing material')
    return validate(n)

def notation(n):
    op=n['op']
    if op == 'NAT': return str(n['value'])
    if op == 'TEXT': return json.dumps(n['value'],ensure_ascii=False)
    if op in ('REF','SYMBOL'):
        v=json.dumps(n['value'],ensure_ascii=False)
        return f'({op} {v})'
    if not n.get('args'): return op
    return '('+op+' '+' '.join(notation(a) for a in n['args'])+')'

def crc12(words):
    """Width 12, polynomial 0x80F, init 0xFFF, MSB first, xorout 0."""
    crc=0xFFF
    for w in words:
        for i in range(5,-1,-1):
            feedback=((crc>>11)&1)^((w>>i)&1)
            crc=(crc<<1)&0xFFF
            if feedback: crc ^= 0x80F
    return crc

def packet(body):
    if any(type(w) is not int or not 0 <= w < 64 for w in body):
        raise ValueError('Six-bit words required')
    h=[1]+uint(len(body))+list(body)
    c=crc12(h)
    return h+[c>>6,c&63]

def unpacket(words):
    r=Reader(words)
    profile=r.word()
    if profile not in (1,2): raise ValueError('Unsupported frame profile')
    if profile == 1:
        n=r.uint()
        body=[r.word() for _ in range(n)]
    else:
        byte_count=r.uint(); n=r.uint()
        compressed=read_bytes(r,byte_count)
    end=r.pos
    observed=(r.word()<<6)|r.word()
    if observed != crc12(r.words[:end]): raise ValueError('Checksum mismatch')
    if any(v != 0 for v in r.words[r.pos:]): raise ValueError('Nonzero frame padding')
    if profile == 2:
        try:
            inflater=zlib.decompressobj()
            raw=inflater.decompress(compressed,(n*6+7)//8+1)
            if not inflater.eof or inflater.unused_data or inflater.unconsumed_tail:
                raise ValueError('Invalid compressed stream termination')
        except zlib.error as error:
            raise ValueError('Invalid compressed stream') from error
        if len(raw)!=(n*6+7)//8: raise ValueError('Incorrect decompressed length')
        bits=''.join(f'{b:08b}' for b in raw)
        if any(v=='1' for v in bits[6*n:]): raise ValueError('Nonzero packed-body padding')
        body=[int(bits[i:i+6],2) for i in range(0,n*6,6)]
    return body

def compressed_packet(body):
    """Profile 2: zlib bytes with explicit compressed and decoded lengths."""
    if any(type(w) is not int or not 0 <= w < 64 for w in body):
        raise ValueError('Six-bit words required')
    bits=''.join(f'{w:06b}' for w in body)
    bits+='0'*(-len(bits)%8)
    raw=bytes(int(bits[i:i+8],2) for i in range(0,len(bits),8))
    b=zlib.compress(raw,9)
    h=[2]+uint(len(b))+uint(len(body))+byte_words(b)
    c=crc12(h)
    return h+[c>>6,c&63]

def choose_packet(body):
    """Minimize complete frame area between the two specified profiles."""
    direct=packet(body); packed=compressed_packet(body)
    def cost(words):
        c,r=layout(len(words))
        return ((2*c+4)*(3*r+4),len(words),words[0])
    return min((direct,packed),key=cost)

def layout(n, max_width=None):
    choices=[]
    for c in range(1,n+1):
        r=(n+c-1)//c; w=2*c+4; h=3*r+4
        if max_width is not None and w > max_width: continue
        choices.append((w*h,c*r-n,abs(math.log(w/h)),c,r))
    if not choices: raise ValueError('Width cannot accommodate a tile')
    _,_,_,c,r=min(choices)
    return c,r

def grid(words, cols=None):
    c,r=layout(len(words)) if cols is None else (cols,(len(words)+cols-1)//cols)
    W,H=2*c,3*r
    cells=[[0]*(W+4) for _ in range(H+4)]
    for y in range(1,H+3): cells[y][1]=1
    for x in range(1,W+3): cells[H+2][x]=1
    for x in range(2,W+2): cells[1][x]=int((x-2)%2==0)
    for y in range(2,H+2): cells[y][W+2]=int((y-2)%2==0)
    for i,w in enumerate(words):
        x=2+2*(i%c); y=2+3*(i//c)
        for j in range(6): cells[y+j//2][x+j%2]=(w>>(5-j))&1
    return cells

def ungrid(cells):
    H=len(cells); W=len(cells[0])
    if any(len(row)!=W or any(v not in (0,1) for v in row) for row in cells):
        raise ValueError('Rectangular binary grid required')
    if (W-4)%2 or (H-4)%3 or W<6 or H<7: raise ValueError('Invalid dimensions')
    c,r=(W-4)//2,(H-4)//3
    empty=grid([0]*(c*r),c)
    for y in range(H):
        for x in range(W):
            if not (2<=x<W-2 and 2<=y<H-2) and cells[y][x]!=empty[y][x]:
                raise ValueError('Invalid finder/timing border')
    out=[]
    for i in range(c*r):
        x=2+2*(i%c); y=2+3*(i//c); w=0
        for j in range(6): w=(w<<1)|cells[y+j//2][x+j%2]
        out.append(w)
    return unpacket(out)

def svg(cells, unit=8, title='Silex message'):
    import html
    W,H=len(cells[0]),len(cells)
    path=' '.join(f'M{x} {y}h1v1h-1z' for y,row in enumerate(cells) for x,v in enumerate(row) if v)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W*unit}" height="{H*unit}" '
            f'viewBox="0 0 {W} {H}" shape-rendering="crispEdges" role="img">'
            f'<title>{html.escape(title)}</title><rect width="{W}" height="{H}" fill="white"/>'
            f'<path d="{path}" fill="black"/></svg>')

def png(cells, path, unit=8):
    from PIL import Image
    W,H=len(cells[0]),len(cells)
    im=Image.new('L',(W,H),255)
    im.putdata([0 if v else 255 for row in cells for v in row])
    im.resize((W*unit,H*unit),Image.Resampling.NEAREST).save(path)

def decode_png(path):
    """Exact integer-scale, upright PNG, including its intact quiet zone.

    This is deliberately not a camera/OCR detector. All modules are checked,
    not just their center pixels. Framing supplies pitch; no meaning sidecar.
    """
    from PIL import Image
    im=Image.open(path).convert('L')
    black=im.point(lambda p:255 if p<128 else 0)
    box=black.getbbox()
    if box is None: raise ValueError('Empty image')
    u=box[0]
    if not u or box[1] != u or im.width%u or im.height%u:
        raise ValueError('Unsupported crop or scale')
    cells=[]
    for y in range(im.height//u):
        row=[]
        for x in range(im.width//u):
            values=[v<128 for v in im.crop((x*u,y*u,(x+1)*u,(y+1)*u)).getdata()]
            if min(values)!=max(values): raise ValueError('Damaged or antialiased module')
            row.append(int(values[0]))
        cells.append(row)
    return decode(ungrid(cells))

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('expression',nargs='?',help='S-expression reference notation')
    ap.add_argument('--png'); ap.add_argument('--svg'); ap.add_argument('--decode-png')
    ap.add_argument('--unit',type=int,default=8)
    ap.add_argument('--direct',action='store_true',help='Force the direct glyph carrier')
    a=ap.parse_args()
    if a.decode_png:
        print(notation(decode_png(a.decode_png))); return
    if not a.expression: ap.error('Provide an expression or --decode-png')
    n=parse(a.expression); body=encode(n)
    chosen=packet(body) if a.direct else choose_packet(body)
    cells=grid(chosen)
    if a.png: png(cells,a.png,a.unit)
    if a.svg: Path(a.svg).write_text(svg(cells,a.unit,notation(n)),encoding='utf-8')
    print(json.dumps({'notation':notation(decode(body)),'body_glyphs':len(body),
                      'body_bits':6*len(body),'frame_profile':chosen[0],'frame_units':[len(cells[0]),len(cells)],
                      'tokens':body},ensure_ascii=False,indent=2))

if __name__ == '__main__': main()
