import {scoreFigure as label} from './harmony-figures.mjs';
import {rhythmValue} from './harmonic-rhythm.mjs';
import {KEYS,chromaticName,supportedSevenths,possibleAt,chromaticSpelling} from './engine.mjs';
import {harmonizeTonal,tonalIssues} from './tonal.mjs';
const mod=n=>(n%12+12)%12;
export const CADENCES={authentic:{name:'Autentica · V–I',roots:[4,0]},perfect:{name:'Autentica perfetta · V–I, soprano sulla tonica',roots:[4,0],sopranoTonic:true},complete:{name:'Completa · II–V–I',roots:[1,4,0]},plagal:{name:'Plagale · IV–I',roots:[3,0]},deceptive:{name:'Inganno · V–VI',roots:[4,5]},half:{name:'Sospesa · II–V',roots:[1,4]}};
function pitches(pc,near){const out=[];for(let n=28;n<=60;n++)if(mod(n)===mod(pc)&&Math.abs(n-near)<=12)out.push(n);return out.sort((a,b)=>Math.abs(a-near)-Math.abs(b-near))}
function differences(before,after){const changes=[];after.forEach((c,i)=>c.voices.forEach((n,v)=>{if(n!==before[i].voices[v])changes.push({index:i,voice:v,from:before[i].voices[v],to:n,key:c.key})}));return changes}
function checked(sol,args){const [b,d]=(args.meter||'4/4').split('/').map(Number),min=d===8&&b%3===0?24:64/d;return sol.every((c,i)=>!tonalIssues(i?sol[i-1]:null,c,args.key,3,{preparationUnits:args.durations?.[i-1],minimumPreparationUnits:min}).length)}
export function proposeHeldPlagal({args,solution,index}){
 const c=solution?.[index],length=args.durations?.[index];if(!c||!length||length<32)return null;
 const key=c.key||args.key,k=KEYS[key],bass=args.bass[index];if(mod(bass)!==mod(k.tonic))return {proposals:[],message:'La plagale I–IV–I sul basso tenuto richiede la tonica al basso. Il basso scritto non viene modificato.'};
 const lengths=[length/4,length/4,length/2];let rhythms;try{rhythms=lengths.map(rhythmValue)}catch{return {proposals:[],message:'Il valore del basso non consente questa suddivisione ritmica.'}}
 const pools=[0,3,0].map((root,j)=>possibleAt(bass,key,3,{...(args.locks?.[index]||{}),...(args.rhythmLocks?.[index]?.[j]||{})},{pedalCadence:true,seventhsEnabled:false},Infinity).filter(x=>x.root===root&&x.inv===(root===3?2:0)&&!x.incompleteTonic).map(x=>({...x,key,spellings:x.voices.map(n=>chromaticSpelling(n,key))})));
 const before=solution[index-1],after=solution[index+1];let paths=[{chords:[],cost:0}];
 for(let j=0;j<3;j++){const next=[];for(const path of paths)for(const x of pools[j]){const prev=path.chords.at(-1)||before;if(tonalIssues(prev,x,args.key,3).length)continue;if(j===2&&after&&tonalIssues(x,after,args.key,3).length)continue;const near=path.chords.at(-1)||c;next.push({chords:[...path.chords,x],cost:path.cost+x.voices.reduce((n,p,v)=>n+Math.abs(p-near.voices[v]),0)+x.voices.reduce((n,p,v)=>n+Math.abs(p-c.voices[v])*.15,0)})}paths=next.sort((a,b)=>a.cost-b.cost).slice(0,120);if(!paths.length)break}
 if(!paths.length)return {proposals:[],message:'Nessuna disposizione valida per I–IV–I sul basso tenuto con le voci bloccate e i collegamenti attuali. Il basso resta invariato.'};
 let offset=0;const segments=paths[0].chords.map((x,j)=>{const r={...x,...rhythms[j],offset};offset+=lengths[j];return r}),result=structuredClone(solution);result[index]={...c,...segments[0],segments};const changes=differences(solution,result),figures=segments.map(label).join(' → ');
 return {proposals:[{kind:'cadence',type:'plagal',held:true,name:'Plagale sul basso tenuto',index,key,bass:args.bass.slice(),solution:result,requests:{[index]:{root:0,inv:0,key,heldCadence:'plagal'}},level:3,seventhsEnabled:args.seventhsEnabled,allowedSevenths:args.allowedSevenths,changes,score:paths[0].cost,figures,summary:'Basso invariato per tutta la durata. Voci superiori: '+rhythms.map(r=>({breve:'breve',whole:'semibreve',half:'minima',quarter:'semiminima',eighth:'croma','16th':'semicroma','32nd':'biscroma','64th':'semibiscroma'}[r.duration])+(r.dotted?' puntata':'')).join(' + ')+'. Il IV è in secondo rivolto sul pedale di tonica (IV64).',warning:''}],message:''};
}
export function proposeHarmonyEdit({args,solution,index,kind,cadenceType='auto',tiedIndexes=[]}){
 if(!solution?.length||solution.length!==args.bass.length)return {proposals:[],message:'Genera prima un’armonizzazione valida.'};
 if(!Number.isInteger(index)||index<0||index>=solution.length)return {proposals:[],message:'Seleziona una nota o una battuta della partitura.'};
 const selected=solution[index],key=selected.key||args.key,k=KEYS[key];
 if(kind==='cadence'&&(cadenceType==='plagal'||cadenceType==='auto')){const held=proposeHeldPlagal({args,solution,index});if(held&&(cadenceType==='plagal'||held.proposals.length))return held}
 if(kind==='seventh'&&(selected.seventh||!supportedSevenths(key).includes(selected.root)))return {proposals:[],message:selected.seventh?'Questo accordo contiene già la settima.':'La settima di questo grado non è ammessa dal profilo teorico attuale.'};
 if(kind==='seventh'&&index===solution.length-1)return {proposals:[],message:'La settima richiede una risoluzione successiva: aggiungi un accordo dopo questa nota.'};
 const choices=kind==='seventh'?[{name:'Aggiungi settima',roots:[selected.root]}]:cadenceType==='auto'?['perfect','complete','authentic','plagal','deceptive','half'].map(t=>({...CADENCES[t],type:t})):[{...CADENCES[cadenceType],type:cadenceType}];
 const proposals=[];
 for(const choice of choices){
  if(!choice.roots)continue;const start=kind==='seventh'?index:index-choice.roots.length+1;if(start<0)continue;
  if(solution.slice(start,index+1).some(c=>(c.key||args.key)!==key))continue;
  const requests={};choice.roots.forEach((root,j)=>{requests[start+j]={root,key,secondaryDegree:kind==='seventh'?selected.secondaryDegree:null,seventh:kind==='seventh',...(kind==='seventh'?{}:{inv:0}),...(choice.sopranoTonic&&j===choice.roots.length-1?{sopranoPc:mod(k.tonic)}:{})}});
  const base={...args,level:kind==='seventh'?3:args.level,limit:1,harmonicRequests:{...(args.harmonicRequests||{}),...requests},preferredSolution:solution,modulationMode:'manual',tonalEvents:solution.flatMap(c=>c.tonalEvent?[{...c.tonalEvent}]:c.tonicizationEvent?[{...c.tonicizationEvent}]:[])};
  if(kind==='seventh'){base.seventhsEnabled=true;base.allowedSevenths=[...new Set([...(args.allowedSevenths||[]),selected.secondaryDegree!==undefined?4:selected.root])];}
  let sequences=[args.bass.slice()];
  // Try the written bass first. Only the selected cadence region can change.
  const combinations=[];
  function variants(j,bass){if(combinations.length>=40)return;if(j===choice.roots.length){combinations.push(bass);return}const i=start+j,pc=k.tonic+k.steps[choice.roots[j]],pcs=kind==='seventh'?[0,2,4,6].map(step=>k.tonic+k.steps[(selected.root+step)%7]):[pc];let options=[...new Set(pcs.flatMap(pc=>pitches(pc,args.bass[i])))].sort((a,b)=>Math.abs(a-args.bass[i])-Math.abs(b-args.bass[i]));if(args.locks?.[i]?.[0]!==undefined||tiedIndexes.includes(i))options=options.filter(n=>n===args.bass[i]);for(const n of options){const b=bass.slice();b[i]=n;variants(j+1,b)}}
  variants(0,args.bass.slice());sequences.push(...combinations);const seen=new Set();let best;
  for(const bass of sequences){const id=bass.join(',');if(seen.has(id))continue;seen.add(id);if(bass.some((n,i)=>n!==args.bass[i]&&tiedIndexes.includes(i)))continue;
   const locks=structuredClone(args.locks||{});solution.forEach((c,i)=>{if(i<Math.max(0,start-2)||i>Math.min(solution.length-1,index+2)){locks[i]??={};c.voices.forEach((n,v)=>locks[i][v]??=n)}});
   const spellings=(args.bassSpellings||[]).slice();bass.forEach((n,i)=>{if(n!==args.bass[i])spellings[i]=null});
   const result=harmonizeTonal({...base,bass,bassSpellings:spellings,locks});
   for(const sol of result.solutions){if(!checked(sol,base))continue;const changes=differences(solution,sol),score=changes.reduce((s,c)=>s+(c.voice===0?100:5)+Math.abs(c.to-c.from),0);if(!best||score<best.score)best={kind,type:choice.type,name:choice.name,index,bass,solution:sol,changes,score,key,level:base.level,seventhsEnabled:base.seventhsEnabled,allowedSevenths:base.allowedSevenths,requests};}
   if(best&&!best.changes.some(c=>c.voice===0))break;
  }
  if(best){best.warning=best.changes.length>8||best.changes.some(c=>Math.abs(c.to-c.from)>7)?'La proposta richiede molti spostamenti: controlla l’anteprima prima di confermare.':'';best.summary=best.changes.length?best.changes.map(c=>`Nota ${c.index+1}, ${['basso','tenore','contralto','soprano'][c.voice]}: ${chromaticName(c.from,solution[c.index].key||args.key)} → ${chromaticName(c.to,best.solution[c.index].key||args.key)}`).join('\n'):'Nessuna nota da spostare.';best.figures=best.solution.slice(start,index+1).map(label).join(' → ');proposals.push(best)}
 }
 return {proposals:proposals.sort((a,b)=>a.score-b.score),message:proposals.length?'':'Nessuna proposta valida nella regione selezionata. Il motore rispetta note bloccate, legature, tonalità e risoluzioni. Prova un’altra cadenza o un punto con più accordi disponibili.'};
}
