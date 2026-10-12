import copy, importlib.util, json, random, sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sp=importlib.util.spec_from_file_location('silex',ROOT/'outputs'/'silex_codec.py')
s=importlib.util.module_from_spec(sp); sp.loader.exec_module(s)
rng=random.Random(20261011)
checks={}

def reject(fn,*args):
    try: fn(*args)
    except (ValueError,UnicodeError,IndexError,RecursionError): return
    raise AssertionError('Invalid input was accepted')

for i in range(64):
    words=s.packet([i])
    assert s.ungrid(s.grid(words))==[i]
checks['all_64_visual_patterns']=64
for n in [0,1,31,32,33,1023,1024,2**64,2**512]+[rng.randrange(2**100) for _ in range(100)]:
    rr=s.Reader(s.uint(n)); assert rr.uint()==n and rr.pos==len(rr.words)
checks['unsigned_integer_round_trips']=109
reject(lambda:s.Reader([32,0]).uint())
reject(lambda:s.Reader([32]).uint())

for text in ['', 'hello', '你好', '∃x∀y', '🐦', '\x00', 'e\u0301', 'é', 'a'*1000]:
    b=text.encode('utf-8'); rr=s.Reader(s.byte_words(b))
    assert s.read_bytes(rr,len(b))==b
    ast=s.node('TEXT',value=text)
    assert s.decode(s.encode(ast))==ast
checks['unicode_literal_round_trips']=9
reject(s.decode,[s.IDS['TEXT'],1,63,63])
reject(s.parse,'(REF 0)')
reject(s.parse,'V1')
reject(s.parse,'(SEE ME)')
reject(s.parse,'(QUOTE V0)')
reject(s.parse,'(LET TRUE (QUOTE V0))')
reject(s.parse,'(NAT -1)')
reject(s.decode,[s.IDS['TRUE'],s.IDS['FALSE']])
reject(s.decode,[s.IDS['REF'],0])
checks['malformed_integer_cases']=2
checks['malformed_scope_literal_and_arity_cases']=9

# Build randomized valid finite trees exercising all core constructors.
def tree(depth, binders=0):
    if depth==0:
        choices=['TRUE','FALSE','ME','YOU','NOW','NIL','WATER','NAT','TEXT','SYMBOL']
        if binders: choices += ['REF']
        op=rng.choice(choices)
        if op=='NAT': return s.node(op,value=rng.randrange(100000))
        if op=='TEXT': return s.node(op,value=rng.choice(['','abc','你好']))
        if op=='SYMBOL': return s.node(op,value='urn:sample:'+str(rng.randrange(100)))
        if op=='REF':
            v=rng.randrange(binders)
            return s.node(f'V{v}') if v<3 else s.node('REF',value=v)
        return s.node(op)
    op=rng.choice([n for n in s.NAMES if n not in ('NAT','TEXT','REF','SYMBOL','V0','V1','V2')])
    if op=='QUOTE': return s.node(op,tree(depth-1,0))
    k=s.REGISTRY[op]['arity']
    if k<0: k=rng.randrange(1,5)
    args=[]
    for i in range(k):
        b=binders+(op in ('ALL','SOME','LAM','THE') or (op=='LET' and i==1))
        args.append(tree(depth-1,b))
    return s.node(op,*args)

for i in range(1000):
    ast=tree(rng.randrange(5))
    words=s.encode(ast)
    assert s.decode(words)==ast
    assert s.parse(s.notation(ast))==ast
    assert s.ungrid(s.grid(s.packet(words)))==words
checks['random_syntax_round_trips']=1000
# These are syntax tests; random trees are not guaranteed semantically well typed.

for i,ref in enumerate([
 '(SEE ME YOU)',
 '(ALL (CHILD V0) (SOME (BIRD V0) (SEE V1 V0)))',
 '(SOME (BIRD V0) (ALL (CHILD V0) (SEE V0 V1)))',
 '(LET (LAM (AND (PERSON V0) (SEE V0 V0))) (ALL (APP V1 V0) (REMEMBER V0 V0)))',
 '(LAM (LAM (LAM (LAM (EQ (REF 3) V0)))))',
 '(CALL (SYMBOL "urn:demo:relation") ME YOU NOW)',
 '(AT NOW (NOT (FUTURE (HELP ME YOU))))',
 '(QUOTE (LAM (SEE V0 YOU)))'
]):
    ast=s.parse(ref); cells=s.grid(s.packet(s.encode(ast)))
    for u in [1,2,4,9]:
        path=ROOT/'work'/f'check-{i}-{u}.png'
        s.png(cells,path,u); assert s.decode_png(path)==ast
checks['native_png_round_trips']=32

# Exhaust every single payload/header/checksum bit flip on one real packet.
words=s.packet(s.encode(s.parse('(ALL (CHILD V0) (SOME (BIRD V0) (SEE V1 V0)))')))
count=0
for i in range(len(words)):
    for bit in range(6):
        damaged=words.copy(); damaged[i]^=1<<bit
        reject(s.unpacket,damaged); count+=1
checks['detected_single_bit_packet_corruptions']=count
cells=s.grid(words)
cells[1][2]^=1; reject(s.ungrid,cells)
checks['damaged_border_rejected']=1

# A tiny finite semantics check shows that the two quantifier orders differ.
# This is an independent evaluator of the subset used, rather than a token test.
domain=['c1','c2','b1','b2']
def truth(n,env=()):
    op=n['op']; a=n['args']
    if op=='V0': return env[0]
    if op=='V1': return env[1]
    if op=='CHILD': return truth(a[0],env).startswith('c')
    if op=='BIRD': return truth(a[0],env).startswith('b')
    if op=='SEE': return (truth(a[0],env),truth(a[1],env)) in {('c1','b1'),('c2','b2')}
    if op=='ALL': return all(not truth(a[0],(x,)+env) or truth(a[1],(x,)+env) for x in domain)
    if op=='SOME': return any(truth(a[0],(x,)+env) and truth(a[1],(x,)+env) for x in domain)
    raise ValueError(op)
a=s.parse('(ALL (CHILD V0) (SOME (BIRD V0) (SEE V1 V0)))')
b=s.parse('(SOME (BIRD V0) (ALL (CHILD V0) (SEE V0 V1)))')
assert truth(a) is True and truth(b) is False
assert s.encode(a)!=s.encode(b)
checks['independent_scope_countermodel']=1

# Optional compression preserves the expression and counts all transport fields.
for i in range(100):
    ast=tree(rng.randrange(5)); words=s.encode(ast)
    pkt=s.compressed_packet(words)
    assert s.unpacket(pkt)==words and s.decode(s.ungrid(s.grid(pkt)))==ast
    chosen=s.choose_packet(words)
    assert len(s.grid(chosen))*len(s.grid(chosen)[0]) <= len(s.grid(s.packet(words)))*len(s.grid(s.packet(words))[0])
checks['compressed_syntax_round_trips']=100
for i,text in enumerate(['a'*1000,'a'*5000,'∃x∀y','']):
    ast=s.node('TEXT',value=text); words=s.encode(ast)
    for u in [1,2,4]:
        path=ROOT/'work'/f'compressed-{i}-{u}.png'
        s.png(s.grid(s.compressed_packet(words)),path,u)
        assert s.decode_png(path)==ast
checks['compressed_native_png_round_trips']=12

def compressed_raw(raw,n):
    b=raw
    h=[2]+s.uint(len(b))+s.uint(n)+s.byte_words(b)
    crc=s.crc12(h)
    return h+[crc>>6,crc&63]

import zlib
words=s.encode(s.parse('(SEE ME YOU)'))
bits=''.join(f'{w:06b}' for w in words);bits+='0'*(-len(bits)%8)
raw=bytes(int(bits[i:i+8],2) for i in range(0,len(bits),8))
b=zlib.compress(raw,9)
reject(s.unpacket,compressed_raw(b+b'junk',len(words)))
reject(s.unpacket,compressed_raw(b[:-1],len(words)))
reject(s.unpacket,compressed_raw(b,len(words)+100))
damaged=raw[:-1]+bytes([raw[-1]|1])
reject(s.unpacket,compressed_raw(zlib.compress(damaged,9),len(words)))
checks['malformed_compressed_stream_cases']=4

result={'passed':True,'checks':checks,
        'limits':['No human readability or learning experiment',
                  'No camera, blur or perspective detection test',
                  'Randomized tests establish reversible syntax, not a full semantic interpreter',
                  'Only a quantified-predicate subset has an executed model evaluator']}
(ROOT/'outputs'/'verification.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
