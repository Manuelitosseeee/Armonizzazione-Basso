import {eventUnits} from './notation.mjs';
import {scoreFigure as label} from './harmony-figures.mjs';
import {supportedSevenths} from './engine.mjs';
import {tonalCandidates,tonalIssues} from './tonal.mjs';
// Beam search through the complete score: a seventh is accepted only as part
// of a valid path, with its preparation and resolution in the same voices.
export function proposeAutomaticSevenths({args,solution,degrees=[]}){
 if(!solution?.length||solution.length!==args.bass.length)return {proposals:[],message:'Armonizza prima tutto il basso.'};
 solution=solution.map(c=>({...c,key:c.key||args.key,segments:c.segments?.map(s=>({...s,key:s.key||c.key||args.key}))}));
 const selected=[...new Set(degrees)].filter(n=>Number.isInteger(n)&&n>=0&&n<7);
 if(!selected.length)return {proposals:[],message:'Scegli almeno un tipo di settima.'};
 const [beats,den]=(args.meter||'4/4').split('/').map(Number),minimum=den===8&&beats%3===0?24:64/den;
 const first=c=>c.segments?.[0]||c,last=c=>c.segments?.at(-1)||c;
 const duration=(c,i)=>c.segments?.length?args.durations[i]-c.segments.at(-1).offset:args.durations?.[i];
 const edge=(p,c,i)=>!tonalIssues(p&&last(p),first(c),args.key,3,{preparationUnits:p?duration(p,i-1):undefined,minimumPreparationUnits:minimum}).length;
 if(solution.some((c,i)=>!edge(solution[i-1],c,i)||c.segments?.some((n,j)=>j>0&&tonalIssues(c.segments[j-1],n,args.key,3,{preparationUnits:eventUnits(c.segments[j-1]),minimumPreparationUnits:minimum}).length))||last(solution.at(-1)).seventh)return {proposals:[],message:'Prima correggi i collegamenti dell’armonizzazione: la scansione non aggiunge settime a una sequenza già irregolare.'};
 const allowed=[...new Set([...(args.allowedSevenths||[]),...selected,...solution.filter(c=>c.seventh).map(c=>c.root)])];
 let paths=[{chords:[],added:0,cost:0}];
 for(let i=0;i<solution.length;i++){
  const c=solution[i],key=c.homeKey||c.key||args.key;
  let pool=[c];
  if(!c.segments){
   const canAdd=i<solution.length-1&&!c.seventh&&selected.includes(c.root)&&supportedSevenths(c.key||key).includes(c.root);
   const candidates=tonalCandidates(args.bass[i],key,3,args.locks?.[i]||{}, {seventhsEnabled:true,allowedSevenths:allowed,secondaryEnabled:c.secondaryDegree!==undefined,secondaryTargets:c.secondaryDegree===undefined?[]:[c.secondaryDegree]},args.bass[i+1]);
   pool.push(...candidates.filter(n=>(n.seventh===!!c.seventh||canAdd&&n.seventh)&&n.root===c.root&&n.inv===c.inv&&(n.key||key)===(c.key||key)&&n.secondaryDegree===c.secondaryDegree).map(n=>({...c,...n,homeKey:c.homeKey,tonicizedDegree:c.tonicizedDegree})));
  }
  const next=[];
  for(const path of paths)for(const n of pool){if(!edge(path.chords.at(-1),n,i))continue;
   next.push({chords:[...path.chords,n],added:path.added+Number(!c.seventh&&!!n.seventh),cost:path.cost+n.voices.reduce((s,p,v)=>s+Math.abs(p-c.voices[v]),0)});
  }
  next.sort((a,b)=>b.added-a.added||a.cost-b.cost);
  const unique=new Set();paths=next.filter(p=>{const c=last(p.chords.at(-1)),id=[c.key,c.root,c.inv,c.seventh,c.voices].join('|');if(unique.has(id))return false;unique.add(id);return true}).slice(0,180);
  args.onProgress?.({note:i+1,total:solution.length});
  if(!paths.length)return {proposals:[],message:'Non è stato trovato un percorso completo valido. Nessuna modifica applicata.'};
 }
 const best=paths[0];
 if(!best.added)return {proposals:[],message:'Nessuna settima dei tipi scelti può essere aggiunta rispettando preparazione, risoluzione, basso e voci bloccate.'};
 const requests={...(args.harmonicRequests||{})};
 // Pin the existing harmonic functions, so recalculation cannot replace them
 // with secondary interpretations or remove the accepted sevenths.
 best.chords.forEach((c,i)=>{requests[i]={...requests[i],root:c.root,key:c.key||args.key,inv:c.inv,seventh:!!c.seventh,secondaryDegree:c.secondaryDegree??null}});
 const added=best.chords.flatMap((c,i)=>!solution[i].seventh&&c.seventh?[{index:i,figure:label(c)}]:[]);
 const p={kind:'automaticSevenths',name:'Settime automatiche',bass:args.bass.slice(),solution:structuredClone(best.chords),requests,level:3,seventhsEnabled:true,allowedSevenths:allowed,changes:added,figures:added.map(c=>`Nota ${c.index+1}: ${c.figure}`).join(' · '),summary:`${best.added} settime aggiunte. Basso, gradi, rivolti, cadenze e blocchi mantenuti. Preparazione e risoluzione verificate su tutto il percorso.`,warning:''};
 return {proposals:[p],message:''};
}
