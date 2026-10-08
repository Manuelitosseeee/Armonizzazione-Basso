export const MAX_SCAN_BYTES=4_000_000;
export function inputKind(file){
 const n=(file.name||'').toLowerCase(),t=(file.type||'').toLowerCase();
 if(/\.(mscz|mscx|musicxml|xml|mxl)$/.test(n))return 'score';
 if(t==='application/pdf'||n.endsWith('.pdf'))return 'scan';
 if(/^image\/(png|jpeg|webp|tiff|bmp)$/.test(t)||/\.(png|jpe?g|webp|tiff?|bmp)$/.test(n))return 'scan';
 throw Error('Scegli MuseScore, MusicXML, PDF oppure un’immagine PNG, JPG, WebP, TIFF o BMP.');
}
export function pastedFile(data){return Array.from(data?.files||[]).find(f=>{try{return inputKind(f)==='scan'}catch{return false}})||Array.from(data?.items||[]).filter(i=>i.kind==='file').map(i=>i.getAsFile()).find(f=>f&&/^image\//.test(f.type))||null;}
export function serviceUrl(base,params={}){
 const endpoint=base.trim()||'/api/omr';
 if(!endpoint.startsWith('/')&&!/^https?:\/\//i.test(endpoint))throw Error('Indirizzo del riconoscimento non valido.');
 const u=new URL(endpoint,globalThis.location?.href||'http://localhost/');
 if(u.username||u.password)throw Error('Non inserire credenziali nell’indirizzo.');
 for(const [k,v]of Object.entries(params))u.searchParams.set(k,v);
 return u.href;
}
async function answer(response){
 if(!response.ok){let message;try{message=(await response.json()).error}catch{}
 throw Error(message||(response.status===404?'Riconoscimento non collegato. Pubblica il progetto su Netlify con la build delle funzioni.':`Il servizio risponde con errore ${response.status}.`));}
 let data;try{data=await response.json()}catch{throw Error('Il collegamento non restituisce una risposta OMR. Verifica l’indirizzo del servizio e il deploy Netlify.')}if(data.error)throw Error(data.error);return data;
}
export async function recognizeScan(file,{base='/api/omr',token='',signal,onProgress=()=>{},fetchImpl=globalThis.fetch,delay=ms=>new Promise(r=>setTimeout(r,ms)),pollMs=2500,maxWaitMs=12*60*1000}={}){
 if(inputKind(file)!=='scan')throw Error('Questo file non richiede riconoscimento.');
 if(!file.size||file.size>MAX_SCAN_BYTES)throw Error('Per il riconoscimento scegli un file fino a 4 MB. Per PDF grandi, carica poche pagine alla volta.');
 const auth=token?{Authorization:`Bearer ${token}`}:{},request=async(params,options={})=>{try{return await fetchImpl(serviceUrl(base,params),{...options,headers:{...auth,...options.headers},signal})}catch(error){if(signal?.aborted||error.name==='AbortError')throw error;throw Error('Impossibile raggiungere il riconoscimento. Verifica il collegamento, la pubblicazione delle funzioni su Netlify.')}};
 onProgress('Invio della partitura…');
 let job=null;
 const abortJob=()=>{if(job)fetchImpl(serviceUrl(base,{job}),{method:'DELETE',headers:auth}).catch(()=>{});};
 signal?.addEventListener('abort',abortJob,{once:true});
 try{
  const created=await answer(await request({}, {method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','X-File-Name':encodeURIComponent(file.name||'immagine.png')},body:file}));
  if(!/^[a-f0-9]{32}$/.test(created.id||''))throw Error('Risposta del riconoscimento non valida.');job=created.id;
  if(signal?.aborted){abortJob();throw new DOMException('Annullato','AbortError')}
  const started=Date.now();
  for(;;){
   if(signal?.aborted)throw new DOMException('Annullato','AbortError');
   const progress=await answer(await request({job}));
   onProgress(progress.message||'Riconoscimento di note e ritmi…');
   if(progress.status==='done'){
    const response=await request({job,result:'1'});
    if(!response.ok)await answer(response);
    const blob=await response.blob();if(!blob.size||blob.size>20_000_000)throw Error('Partitura riconosciuta vuota o troppo grande.');
    return {name:'riconosciuto.mxl',size:blob.size,arrayBuffer:()=>blob.arrayBuffer(),warnings:progress.warnings||[]};
   }
   if(progress.status==='error'||progress.status==='cancelled')throw Error(progress.message||'Riconoscimento non riuscito.');
   if(!['queued','running'].includes(progress.status))throw Error('Stato del riconoscimento non valido.');
   if(Date.now()-started>maxWaitMs){abortJob();throw Error('Il riconoscimento ha impiegato troppo tempo. Prova meno pagine o un’immagine più pulita.');}
   await delay(pollMs);
  }
 }finally{signal?.removeEventListener('abort',abortJob)}
}
export async function checkService(options={}){try{return await answer(await (options.fetchImpl||globalThis.fetch)(serviceUrl(options.base||'/api/omr',{health:'1'}),{headers:options.token?{Authorization:`Bearer ${options.token}`}:{},signal:options.signal}))}catch(error){if(error.name==='TypeError')throw Error('Impossibile raggiungere Netlify. Controlla l’indirizzo e pubblica questa versione completa con build.');throw error}}
