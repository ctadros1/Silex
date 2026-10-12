/** Consume the model's real incremental response, checking cancellation at
 * every boundary. No model text is displayed before validation completes. */
export async function readModelStream(create,parameters,assertActive,onActivity=()=>{}){
  assertActive();
  const stream=await create({...parameters,stream:true});
  let response='',chunks=0;
  for await(const chunk of stream){
    assertActive();
    const delta=chunk.choices?.[0]?.delta?.content;
    if(typeof delta==='string'&&delta.length){response+=delta;chunks++;onActivity({characters:response.length,chunks});}
  }
  assertActive();
  if(!response)throw new Error('The local model returned no response.');
  return {choices:[{message:{content:response}}]};
}
