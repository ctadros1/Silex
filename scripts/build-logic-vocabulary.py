"""Reproduce the shared Silex lexical vocabulary from Princeton WordNet 3.0.

Input: extracted WNdb-3.0.tar.gz (SHA-256 below). No sentence examples are used.
WordNet is redistributed under its original license, including modified data.
"""
import hashlib, json, re, sys, xml.etree.ElementTree as ET, html
from pathlib import Path

root = Path(__file__).resolve().parents[1]
folder = Path(sys.argv[1]) if len(sys.argv) > 1 else root / '.parser-cache/logic-vocabulary/dict'
frequencies, numbers = {}, {}
for line in (folder / 'index.sense').read_text().splitlines():
    sense, offset, number, count = line.split()
    lemma, kind = sense.split('%', 1); lemma=lemma.lower()
    pos = {'1':'n','2':'v','3':'a','4':'r','5':'a'}[kind[0]]
    key = (offset, pos)
    frequencies[key] = frequencies.get(key, 0) + int(count)
    numbers[(offset, pos, lemma)] = int(number)
rows = []
for filename in ['noun','verb','adj','adv']:
    for line in (folder / ('data.' + filename)).read_text().splitlines():
        if not re.match(r'^\d{8} ', line):
            continue
        data, gloss = line.split('|', 1)
        values = data.split(); offset, pos = values[0], values[2]
        if pos == 's': pos = 'a'
        count = int(values[3], 16)
        lemmas = [re.sub(r'\((?:a|p|ip)\)$','',values[4+i*2]).lower() for i in range(count)]
        first = lemmas[0]
        key = first + '.' + pos + '.' + str(numbers.get((offset,pos,first),int(offset))).zfill(2)
        definition = gloss.strip().split('; "')[0]
        frames=[]
        if pos=='v':
            cursor=4+count*2
            pointers=int(values[cursor]);cursor+=1+pointers*4
            frame_count=int(values[cursor]);cursor+=1
            frames=[int(values[cursor+i*3+1]) for i in range(frame_count)]
        rows.append((frequencies.get((offset,pos),0), offset, pos, [key,pos,'|'.join(lemmas),definition,frames,{lemma:numbers.get((offset,pos,lemma),999999) for lemma in lemmas}]))
rows.sort(key=lambda r:(-r[0],r[2],r[1]))
license_lines = (folder / 'data.noun').read_text().splitlines()[:29]
license_text = '\n'.join(re.sub(r'^\s*\d+\s?', '', s).rstrip() for s in license_lines)+'\n'
notice = root / 'reference/licenses/WordNet-3.0.txt'
notice.write_text(license_text)
vocabulary = {'version':1,'source':'Princeton WordNet 3.0','archive':'https://wordnetcode.princeton.edu/3.0/WNdb-3.0.tar.gz',
              'archiveSHA256':'658b1ba191f5f98c2e9bae3e25c186013158f30ef779f191d2a44e5d25046dc8',
              'license':'licenses/WordNet-3.0.txt','entries':[r[3] for r in rows]}
# PropBank rolesets retain their own sense IDs; WordNet sense numbers are not
# assumed to be equivalent. Example sentences and graph node records are omitted.
pb = Path(sys.argv[2]) if len(sys.argv)>2 else root / '.parser-cache/propbank-frames-main'
frames = {}
for file in sorted([*(pb/'frames').glob('*.xml'), pb/'AMR-UMR-91-rolesets.xml']):
    # Some upstream example markup is malformed. Extract only complete
    # roleset headers and roles sections, independent of example XML.
    source = file.read_text()
    for header, body in re.findall(r'<roleset\b([^>]+)>(.*?)</roleset>', source, re.S):
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', header))
        roles = {}
        roleblock = re.search(r'<roles>(.*?)</roles>', body, re.S)
        for tag in re.findall(r'<role\b([^>]+)>', roleblock.group(1) if roleblock else ''):
            values = dict(re.findall(r'(\w+)="([^"]*)"', tag))
            if values.get('n','').isdigit(): roles[values['n']] = html.unescape(values.get('descr',''))
        if roleblock:
            for role_number, role_content in re.findall(r'<role\b[^>]*\bn="(\d+)"[^>]*>(.*?)</role>', roleblock.group(1), re.S):
                labels = sorted(set(html.unescape(v.strip()) for v in re.findall(r'<rolelink\b[^>]*>([^<]+)</rolelink>', role_content)))
                if labels and role_number in roles: roles[role_number] += ' [linked semantic labels: '+', '.join(labels)+']'
        key = 'pb:'+attrs['id'].replace('.','-')
        frames[key] = [key,'p',attrs['id'].rsplit('.',1)[0],html.unescape(attrs.get('name','')),roles]
vocabulary['operators'] = json.loads((root/'.parser-cache/logic-operators.json').read_text())
vocabulary['entries'] += [frames[k] for k in sorted(frames)]
vocabulary['propbank'] = {'source':'https://github.com/propbank/propbank-frames','revision':'c66e0ccf28b53f00051b187db83e937b5bee2e32','license':'CC-BY-SA-4.0','changes':'Selected sense IDs, descriptions and numbered role descriptions only; examples omitted.'}
(root/'reference/licenses/PropBank-CC-BY-SA-4.0.txt').write_bytes((pb/'LICENSE').read_bytes())
output = root / 'reference/Logic-Vocabulary.json'
raw = (json.dumps(vocabulary, ensure_ascii=False,separators=(',',':'))+'\n').encode()
output.write_bytes(raw)
manifest = {'version':1,'path':'reference/Logic-Vocabulary.json','entries':len(vocabulary['entries']),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
(root/'src/logic-vocabulary-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest))
