import {KEYS,chromaticSpelling,degree} from './engine.mjs';
import {signatureAlter,alterationCandidates,tonicizedKey} from './tonal.mjs';
const mod=n=>((n%12)+12)%12;
const letters=['Do','Re','Mi','Fa','Sol','La','Si'];
const belongs=(n,k)=>degree(n,k)>=0||KEYS[k].minor&&mod(n-KEYS[k].tonic)===10;
export function reviewChromaticModulations(args){
 const {bass,key,bassSpellings=[]}=args,events=(args.tonalEvents||[]).filter(e=>['modulation','extendedTonicization'].includes(e.kind)).sort((a,b)=>a.index-b.index),out=[];
 for(let index=0;index<bass.length;index++){
  // An approved transition is already represented by its tonal event, even
  // when its trigger remains chromatic in the destination (minor leading tone).
  if(events.some(e=>e.index===index))continue;
  let localKey=key;for(const e of events){if(e.index>index)break;if(e.kind==='modulation')localKey=e.key;else if(index<=e.confirm)localKey=tonicizedKey(localKey,e.degree)||localKey;}
  const spelling=bassSpellings[index]||chromaticSpelling(bass[index],localKey);
  const change=spelling.alter-signatureAlter(spelling.letter,localKey);
  if(!change)continue;
  const clues=alterationCandidates({midi:bass[index],spelling,key:localKey});
  const roles=change>0?[[false,6,'VII'],[true,1,'II']]:[[false,3,'IV'],[true,3,'IV'],[true,5,'VI']];
  for(const destination of Object.keys(KEYS))for(const [minor,d,role] of roles){
   const k=KEYS[destination];
   if(destination===localKey||k.minor!==minor||mod(k.tonic+k.steps[d])!==mod(bass[index])||letters[(k.letterIndex+d)%7]!==spelling.letter||clues.some(c=>c.key===destination))continue;
   clues.push({key:destination,role,reason:`${spelling.letter}: possibile ${role} di ${destination}`});
  }
  // Fallback proposals retain spelling and context, even when the simple role scheme gives no match.
  if(!clues.length)for(const destination of Object.keys(KEYS)){
   const p=chromaticSpelling(bass[index],destination);
   if(destination!==localKey&&belongs(bass[index],destination)&&p.letter===spelling.letter&&p.alter===spelling.alter)clues.push({key:destination,role:'',reason:'Grafia compatibile: il contesto deve confermare la funzione.'});
  }
  const candidates=clues.map(c=>{
   let confirm=null,arrivalMode='tonic',cadential=false,fit=0;
   for(let j=index+1;j<Math.min(bass.length,index+13);j++){
    if(!belongs(bass[j],c.key))break;
    fit++;
    const d=degree(bass[j],c.key),before=degree(bass[j-1],c.key);
    if(d===0||d===2&&before===3&&[-1,-2].includes(bass[j]-bass[j-1])){
     const strong=d===0&&before===4;
     if(confirm===null||strong&&!cadential){confirm=j;cadential=strong;arrivalMode=strong?'cadence':'tonic';}
    }
   }
   const score=(confirm===null?35:cadential?0:10)+Math.abs(KEYS[c.key].fifths-KEYS[localKey].fifths)*1.5-fit*.1;
   return {...c,index,confirm,arrivalMode,score,uncertain:!cadential,reason:c.reason+(confirm===null?'; manca un arrivo riconoscibile: selezionalo tu.':cadential?`; movimento V–I del basso alla nota ${confirm+1}; da verificare nelle quattro voci.`:`; possibile arrivo alla nota ${confirm+1}, senza cadenza forte.`)};
  }).sort((a,b)=>a.score-b.score);
  const minorLeading=KEYS[localKey].minor&&degree(bass[index],localKey)===6;
  if(minorLeading)candidates.unshift({key:localKey,index,confirm:null,score:-1,arrivalMode:'tonic',uncertain:true,role:'VII armonico',reason:'Può essere la sensibile della tonalità minore attuale: non implica un cambio di tonalità.'});
  const unique=candidates.filter((c,i,a)=>a.findIndex(p=>p.key===c.key)===i).slice(0,2);
  out.push({index,localKey,spelling,change,direction:change>0?'ascendente':'discendente',candidates:unique,key:unique[0]?.key||'',confirm:unique[0]?.confirm??null,reason:unique[0]?.reason||'Alterazione rilevata, ma nessuna tonalità attendibile proposta. Puoi sceglierla manualmente.'});
 }
 return out;
}
