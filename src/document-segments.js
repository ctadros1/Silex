// UDPipe TokenRange counts Unicode code points, not JS UTF-16 code units.
// This adapter only cuts the original document at learned sentence boundaries.
// It never rewrites, normalizes or deduplicates the source.
export function documentSegments(source,conllu){
  const points=[...source],ends=[];
  for(const group of conllu.trim().split(/\n\s*\n/)){
    let end=-1;
    for(const line of group.split('\n')){
      if(line.startsWith('#'))continue;
      const fields=line.split('\t');if(!/^\d+(?:-\d+)?$/.test(fields[0]))continue;
      const range=fields[9]?.match(/(?:^|\|)TokenRange=(\d+):(\d+)(?:\||$)/);
      if(range)end=Math.max(end,Number(range[2]));
    }
    if(end>=0)ends.push(end);
  }
  if(!ends.length||ends.some((e,i)=>e<= (i?ends[i-1]:0)||e>points.length))throw Error('The document tokenizer could not locate every sentence.');
  let begin=0;const parts=ends.map((end,i)=>{if(i===ends.length-1)end=points.length;else while(end<points.length&&/\s/u.test(points[end]))end++;const part=points.slice(begin,end).join('');begin=end;return part;});
  if(parts.some(s=>!s.trim())||parts.join('')!==source)throw Error('The sentence boundaries did not preserve the document.');
  return parts;
}
