/** Silex v1. Wire-compatible with the original Python research codec. */
export const NAMES = `TRUE FALSE NOT AND OR IF ALL SOME LAM APP LET EQ AT SAY KNOW BELIEVE
CAUSE BEFORE PAIR NIL NAT TEXT REF SYMBOL CALL THE QUOTE V0 V1 V2 ME YOU
NOW PAST FUTURE POSSIBLE NECESSARY WANT OUGHT ASK CHILD BIRD RED SEE GIVE
LOVE PERSON BOOK READ BUILD SCIENTIST CITY LIVE HELP REMEMBER DIE MACHINE
SOLVE PROBLEM PROVE FAIL RUN WATER DRINK`.split(/\s+/);
export const ARITIES = [0,0,1,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,2,0,
  0,0,0,0,-1,1,1,0,0,0,0,0,0,1,1,1,1,2,1,1,
  1,1,1,2,3,2,1,1,2,2,1,1,2,2,2,1,1,2,1,2,1,1,0,2];
export const IDS = Object.fromEntries(NAMES.map((n,i) => [n,i]));
export const LIMITS = {words: 24000, depth: 128, literalBytes: 12000, pixels: 8_000_000};
export const node = (op, ...args) => ({op,args});
export const literal = value => ({op:'TEXT',args:[],value});
const fail = message => { throw new Error(message); };
const own = (x,k) => Object.prototype.hasOwnProperty.call(x,k);
function integer(v) {
  if (typeof v==='bigint' && v>=0n) return v;
  if (typeof v==='number' && Number.isSafeInteger(v) && v>=0) return BigInt(v);
  if (typeof v==='string' && /^(0|[1-9][0-9]*)$/.test(v) && v.length<=3000) return BigInt(v);
  fail('Expected a nonnegative integer.');
}
function utf8(s) {
  if (typeof s!=='string' || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(s)) fail('Invalid Unicode literal.');
  const b=new TextEncoder().encode(s);
  if (b.length>LIMITS.literalBytes) fail('This literal exceeds the browser size limit.');
  return b;
}
export function validate(n, depth=0, level=0) {
  if (level>LIMITS.depth) fail('This expression is nested too deeply for the converter.');
  if (!n || typeof n!=='object' || !own(IDS,n.op)) fail('Unknown Silex head.');
  const {op,args}=n;
  if (!Array.isArray(args) || (ARITIES[IDS[op]]>=0 && args.length!==ARITIES[IDS[op]]) || (op==='CALL' && !args.length)) fail(`Incorrect number of arguments for ${op}.`);
  if (op==='NAT' || op==='REF') {
    const v=integer(n.value);
    if (op==='REF' && v>=BigInt(depth)) fail('Unbound variable reference.');
  } else if (op==='TEXT' || op==='SYMBOL') {
    utf8(n.value);
    if (op==='SYMBOL' && !n.value) fail('A symbol identifier cannot be empty.');
  } else if (own(n,'value')) fail('Unexpected head payload.');
  if (/^V[012]$/.test(op) && Number(op[1])>=depth) fail('Unbound variable reference.');
  args.forEach((a,i)=>validate(a,op==='QUOTE'?0:depth+(['ALL','SOME','LAM','THE'].includes(op)||(op==='LET' && i===1)?1:0),level+1));
  return n;
}
export function uint(v) {
  let n=integer(v); const out=[];
  while(n>=32n) {out.push(Number(n&31n)|32);n>>=5n;}
  return [...out,Number(n)];
}
export function byteWords(bytes) {
  let acc=0,bits=0;const out=[];
  for(const b of bytes) {acc=(acc<<8)|b;bits+=8;while(bits>=6){bits-=6;out.push((acc>>bits)&63);}acc&=(1<<bits)-1;}
  if(bits)out.push(acc<<(6-bits));
  return out;
}
export function packWords(words) {
  let acc=0,bits=0;const out=[];
  for(const w of words) {acc=(acc<<6)|w;bits+=6;while(bits>=8){bits-=8;out.push((acc>>bits)&255);}acc&=(1<<bits)-1;}
  if(bits)out.push(acc<<(8-bits));
  return Uint8Array.from(out);
}
export class Reader {
  constructor(words) {
    if(!Array.isArray(words) || words.length>LIMITS.words+100 || words.some(w=>!Number.isInteger(w)||w<0||w>63))fail('Invalid or oversized Silex data.');
    this.words=words;this.pos=0;
  }
  word(){if(this.pos>=this.words.length)fail('Truncated Silex data.');return this.words[this.pos++];}
  uint(){let n=0n,shift=0n,count=0;for(;;){const w=this.word();count++;n|=BigInt(w&31)<<shift;if(w<32){if(count>1&&w===0)fail('Noncanonical integer.');return n;}shift+=5n;if(count>2000)fail('Integer size limit exceeded.');}}
  count(max=LIMITS.words){const v=this.uint();if(v>BigInt(max))fail('This message exceeds the browser size limit.');return Number(v);}
  bytes(count){
    const out=[];let acc=0,bits=0;
    for(let i=0;i<Math.ceil(count*8/6);i++){acc=(acc<<6)|this.word();bits+=6;while(bits>=8){bits-=8;out.push((acc>>bits)&255);}acc&=(1<<bits)-1;}
    if(acc!==0 || out.length!==count)fail('Invalid literal padding.');
    return Uint8Array.from(out);
  }
}
export function encode(n) {
  validate(n);const words=[],records=[];
  function go(t,path='Meaning',environment=[]) {
    const start=words.length,op=t.op;
    words.push(IDS[op]);const record={index:start,op,value:IDS[op],kind:'head',path,node:t,start,end:0,environment:[...environment]};records.push(record);
    if(op==='NAT'||op==='REF') {
      const v=integer(t.value);
      if(op==='REF' && v<=2n){words[start]=IDS[`V${v}`];record.op=`V${v}`;record.value=words[start];}
      else append(uint(v),'integer',path,record);
    } else if(op==='TEXT'||op==='SYMBOL') {
      const bytes=utf8(t.value);append(uint(bytes.length),'byte count',path,record);append(byteWords(bytes),'literal bytes',path,record);
    } else if(op==='CALL')append(uint(t.args.length-1),'argument count',path,record);
    t.args.forEach((a,i)=>{
      const binds=['ALL','SOME','LAM','THE'].includes(op)||(op==='LET'&&i===1);
      const e=op==='QUOTE'?[]:binds?[`${op.toLowerCase()} variable at glyph ${start+1}`,...environment]:environment;
      go(a,`${path} / ${roles(op)[i]||`argument ${i+1}`}`,e);
    });
    record.end=words.length;
  }
  function append(ws,kind,path,parent){for(const value of ws){records.push({index:words.length,value,kind,path,node:parent.node,op:parent.op,start:words.length,end:words.length+1,environment:parent.environment});words.push(value);}}
  go(n);if(words.length>LIMITS.words)fail('This expression exceeds the browser size limit.');
  return {words,records};
}
export function decode(words) {
  const r=new Reader(words);
  function go(level=0){
    if(level>LIMITS.depth)fail('Expression depth limit exceeded.');
    const op=NAMES[r.word()];let n={op,args:[]};
    if(op==='NAT'||op==='REF'){const v=r.uint();if(op==='REF'&&v<=2n)fail('Use the canonical variable glyph.');n.value=v.toString();}
    else if(op==='TEXT'||op==='SYMBOL'){try{n.value=new TextDecoder('utf-8',{fatal:true}).decode(r.bytes(r.count(LIMITS.literalBytes)));}catch(e){fail('Invalid literal encoding: '+e.message);}}
    else {const k=op==='CALL'?r.count()+1:ARITIES[IDS[op]];for(let i=0;i<k;i++)n.args.push(go(level+1));}
    return n;
  }
  const n=go();if(r.pos!==words.length)fail('Extra data after the expression.');return validate(n);
}
export function parse(text) {
  if(typeof text!=='string' || text.length>24000)fail('Expression size limit exceeded.');
  const tokens=[];let cursor=0;const regex=/\s*(\(|\)|"(?:\\.|[^"\\])*"|[^\s()]+)/y;
  while(cursor<text.length){if(!text.slice(cursor).trim())break;regex.lastIndex=cursor;const m=regex.exec(text);if(!m)fail('Malformed expression.');tokens.push(m[1]);cursor=regex.lastIndex;}
  let p=0;
  function go(level=0){
    if(level>LIMITS.depth)fail('Expression depth limit exceeded.');
    const t=tokens[p++];if(t===undefined)fail('Incomplete expression.');
    if(t==='('){const op=tokens[p++];if(!own(IDS,op))fail('Unknown expression head.');let n={op,args:[]};
      if(['NAT','REF','TEXT','SYMBOL'].includes(op)){const raw=tokens[p++];try{n.value=['TEXT','SYMBOL'].includes(op)?JSON.parse(raw):integer(raw).toString();}catch{fail('Invalid literal value.');}}
      else {while(tokens[p]!==')' && p<tokens.length)n.args.push(go(level+1));}
      if(tokens[p++]!==')')fail('Missing closing parenthesis.');return n;
    }
    if(t.startsWith('"')){try{return literal(JSON.parse(t));}catch{fail('Invalid quoted text.');}}
    if(/^[0-9]+$/.test(t))return {op:'NAT',args:[],value:integer(t).toString()};
    if(!own(IDS,t))fail('Unknown expression leaf: '+String(t).slice(0,60));return node(t);
  }
  const n=go();if(p!==tokens.length)fail('Extra expression material.');return validate(n);
}
export function notation(n) {
  if(n.op==='TEXT')return JSON.stringify(n.value);
  if(n.op==='NAT')return String(n.value);
  if(n.op==='SYMBOL')return `(SYMBOL ${JSON.stringify(n.value)})`;
  if(n.op==='REF')return `(REF ${n.value})`;
  return n.args.length?`(${n.op} ${n.args.map(notation).join(' ')})`:n.op;
}
export function crc12(words){let crc=0xFFF;for(const w of words)for(let i=5;i>=0;i--){const fb=((crc>>11)&1)^((w>>i)&1);crc=(crc<<1)&4095;if(fb)crc^=0x80F;}return crc;}
export function packet(body){const h=[1,...uint(body.length),...body],c=crc12(h);return [...h,c>>6,c&63];}
export async function unpacket(words) {
  const r=new Reader(words),profile=r.word();if(profile!==1&&profile!==2)fail('Unsupported Silex version or profile.');
  let body,n,compressed,bodyStart;
  if(profile===1){n=r.count();bodyStart=r.pos;body=[];for(let i=0;i<n;i++)body.push(r.word());}
  else {const byteCount=r.count(LIMITS.words);n=r.count();compressed=r.bytes(byteCount);}
  const end=r.pos,observed=(r.word()<<6)|r.word();
  if(observed!==crc12(words.slice(0,end)))fail('The image checksum does not match. The image may be damaged.');
  if(words.slice(r.pos).some(w=>w!==0))fail('Nonzero frame padding.');
  if(profile===2){
    if(typeof DecompressionStream==='undefined')fail('This browser cannot decode compressed Silex. Try a current browser.');
    const expected=Math.ceil(n*6/8),stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate')),reader=stream.getReader();
    const chunks=[];let length=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>expected){await reader.cancel();fail('Compressed data exceeds its declared length.');}chunks.push(value);}}catch(e){fail('Invalid compressed Silex data: '+e.message);}
    if(length!==expected)fail('Incorrect decompressed length.');
    const raw=new Uint8Array(length);let off=0;for(const b of chunks){raw.set(b,off);off+=b.length;}
    const bits=Array.from(raw,b=>b.toString(2).padStart(8,'0')).join('');if(/1/.test(bits.slice(6*n)))fail('Nonzero compressed-body padding.');
    body=Array.from({length:n},(_,i)=>parseInt(bits.slice(i*6,i*6+6),2));
  }
  return {body,profile,bodyStart,packetLength:r.pos,ast:decode(body)};
}
export function layout(n) {
  let best;
  for(let c=1;c<=n;c++){const r=Math.ceil(n/c),w=2*c+4,h=3*r+4,key=[w*h,c*r-n,Math.abs(Math.log(w/h)),c,r];if(!best||compare(key,best)<0)best=key;}
  return {cols:best[3],rows:best[4],width:2*best[3]+4,height:3*best[4]+4};
}
function compare(a,b){for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;}
export function grid(words, cols=layout(words.length).cols) {
  const rows=Math.ceil(words.length/cols),W=2*cols,H=3*rows,cells=Array.from({length:H+4},()=>Array(W+4).fill(0));
  for(let y=1;y<H+3;y++)cells[y][1]=1;
  for(let x=1;x<W+3;x++)cells[H+2][x]=1;
  for(let x=2;x<W+2;x++)cells[1][x]=Number((x-2)%2===0);
  for(let y=2;y<H+2;y++)cells[y][W+2]=Number((y-2)%2===0);
  words.forEach((w,i)=>{const x=2+2*(i%cols),y=2+3*Math.floor(i/cols);for(let j=0;j<6;j++)cells[y+Math.floor(j/2)][x+j%2]=(w>>(5-j))&1;});
  return cells;
}
export async function ungrid(cells) {
  const H=cells.length,W=cells[0]?.length;
  if(!W || W<6||H<7||(W-4)%2||(H-4)%3||cells.some(row=>row.length!==W||row.some(v=>v!==0&&v!==1)))fail('Invalid Silex frame dimensions.');
  const cols=(W-4)/2,rows=(H-4)/3,blank=grid(Array(cols*rows).fill(0),cols),words=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(!(x>=2&&x<W-2&&y>=2&&y<H-2)&&cells[y][x]!==blank[y][x])fail('The Silex timing border is missing or damaged.');
  for(let i=0;i<cols*rows;i++){const x=2+2*(i%cols),y=2+3*Math.floor(i/cols);let w=0;for(let j=0;j<6;j++)w=(w<<1)|cells[y+Math.floor(j/2)][x+j%2];words.push(w);}
  return {...await unpacket(words),cells,cols,rows};
}
export function svg(cells, unit=12, highlights=[]) {
  const H=cells.length,W=cells[0].length,path=cells.flatMap((row,y)=>row.flatMap((v,x)=>v?[`M${x} ${y}h1v1h-1z`]:[])).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W*unit}" height="${H*unit}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" role="img" aria-label="Complete Silex image"><rect width="${W}" height="${H}" fill="white"/><path d="${path}" fill="black"/>${highlights.map(({x,y})=>`<rect x="${x-0.08}" y="${y-0.08}" width="2.16" height="3.16" fill="#2563eb" fill-opacity=".2" stroke="#2563eb" stroke-width=".16"/>`).join('')}</svg>`;
}
export function canvas(cells,unit=12){const c=document.createElement('canvas');c.width=cells[0].length*unit;c.height=cells.length*unit;if(c.width*c.height>LIMITS.pixels)fail('Choose a smaller image size so the exported PNG can also be decoded here.');const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='black';cells.forEach((row,y)=>row.forEach((v,x)=>{if(v)ctx.fillRect(x*unit,y*unit,unit,unit);}));return c;}
export async function pngBlob(cells,unit=12){return new Promise((resolve,reject)=>canvas(cells,unit).toBlob(b=>b?resolve(b):reject(new Error('Could not export image.')),'image/png'));}
export async function decodeImage(file) {
  if(!['image/png','image/webp','image/jpeg'].includes(file.type) || file.size>12_000_000)fail('Choose a PNG, WebP, or JPEG image smaller than 12 MB.');
  const image=await createImageBitmap(file);
  try {
    const W=image.width,H=image.height;if(W*H>LIMITS.pixels)fail('This image is too large. Export a smaller Silex PNG.');
    const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,W,H);ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,W,H).data;
    const dark=(x,y)=>{const i=(y*W+x)*4;return (data[i]*.299+data[i+1]*.587+data[i+2]*.114)<128;};
    let minX=W,minY=H;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(dark(x,y)){minX=Math.min(minX,x);minY=Math.min(minY,y);}
    const u=minX;if(!u||minY!==u||W%u||H%u||W/u*H/u>LIMITS.words*6+5000)fail('Use an intact Silex image with its white margin, at an integer scale. Screenshots containing captions are not supported.');
    let cells=[];for(let y=0;y<H/u;y++){const row=[];for(let x=0;x<W/u;x++){const bit=Number(dark(x*u,y*u));for(let dy=0;dy<u;dy++)for(let dx=0;dx<u;dx++)if(Number(dark(x*u+dx,y*u+dy))!==bit)fail('The image contains blurred or resized cells. Try the original downloaded PNG.');row.push(bit);}cells.push(row);}
    let lastError;for(let rotation=0;rotation<4;rotation++){try{return {...await ungrid(cells),unit:u,rotation:rotation*90};}catch(e){lastError=e;}cells=cells[0].map((_,x)=>cells.map(row=>row[x]).reverse());}
    throw lastError;
  } finally {image.close();}
}
export function roles(op){return ({SEE:['viewer','viewed entity'],GIVE:['giver','given entity','recipient'],LOVE:['lover','loved entity'],READ:['reader','read entity'],BUILD:['builder','built entity'],LIVE:['resident','place'],HELP:['helper','helped entity'],REMEMBER:['rememberer','remembered value'],SOLVE:['solver','problem'],PROVE:['prover','proposition'],DRINK:['drinker','consumed value'],ALL:['restriction','body'],SOME:['restriction','body'],THE:['unique-entity restriction'],LAM:['function body'],LET:['definition','body'],APP:['function','argument'],CALL:['function'],IF:['antecedent','consequent'],AND:['first proposition','second proposition'],OR:['first proposition','second proposition'],BELIEVE:['agent','believed proposition'],KNOW:['agent','known proposition'],WANT:['agent','desired proposition'],AT:['context','proposition'],SAY:['speaker','content'],EQ:['first value','second value'],BEFORE:['earlier event','later event'],CAUSE:['cause event','effect event'],PAIR:['first value','second value']})[op]||['argument'];}
