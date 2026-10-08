import {solveVoicingLayers} from './voicing-search.mjs';
import {KEYS,RULES,possibleAt,harmonize,issues,degree,label,chromaticName,octaveCandidates,cadencePathClass,preferClosingCadence} from './engine.mjs';
const mod=n=>((n%12)+12)%12,roman=['I','II','III','IV','V','VI','VII'];
export const TONAL_RULES=[
 {id:'dominanti_secondarie',title:'Dominanti secondarie e tonicizzazione',source:'Piston, Armonia',page:263,printed:250,section:'cap. 16, pp. 250–253',level:2,detail:'La dominante temporanea risolve sul grado tonicizzato; sensibile locale non raddoppiata e settima discendente. La tonalità principale può rimanere invariata.'},
 {id:'modulazioni_transitorie',title:'Modulazione stabile e transitoria',source:'Dionisi, Armonia',page:45,printed:46,section:'La modulazione, pp. 46–47',level:3,detail:'Il tono stabile è confermato da formule cadenzali; quello transitorio resta riferibile al tono precedente. Nell’app la lettura breve viene indicata come tonicizzazione.'},
 {id:'modulazioni_schema',title:'Modulazioni ai toni vicini',source:'Schema modulazioni ai toni vicini',page:1,printed:1,section:'pp. 1–3',level:3,detail:'Indizi: alterazione ascendente e V65–I; alterazione discendente e V42–I6 oppure VI/IV6–V–I in minore; II–V–I e IV–V–I senza alterazioni al basso. Gli indizi sono verificati nel contesto.'}
];
export function closeKeys(key){return Object.keys(KEYS).filter(k=>k!==key&&Math.abs(KEYS[k].fifths-KEYS[key].fifths)<=1)}
export function tonicizedDegree(from,to){return [1,2,3,4,5,6].find(d=>targetKey(from,d)===to)}
function targetKey(key,d){const k=KEYS[key];let pc=mod(k.tonic+k.steps[d]),minor=[1,2,5].includes(d);if(k.minor){minor=[0,3].includes(d);if(d===2||d===6)pc=mod(k.tonic+(d===2?3:10));if(d===1)return null;}
 return Object.keys(KEYS).filter(name=>mod(KEYS[name].tonic)===pc&&KEYS[name].minor===minor).sort((a,b)=>Math.abs(KEYS[a].fifths-k.fifths)-Math.abs(KEYS[b].fifths-k.fifths))[0]||null;
}
const sameChord=(a,b)=>a.length===b.length&&a.every(pc=>b.includes(pc));
// The pivot depends on chord class, inversion, bass and key, not on each path.
// Avoid enumerating the same voicings for every edge of a tonal search.
const pivotCache=new Map();
function pivotRoot(previous,key,level){
 const id=`${key}|${level}|${previous.voices[0]}|${previous.inv}|${[...previous.pcs].sort((a,b)=>a-b)}`;
 if(pivotCache.has(id))return pivotCache.get(id);
 const root=possibleAt(previous.voices[0],key,level,{}, {tonalMinor:true,seventhsEnabled:false},Infinity).find(c=>sameChord(c.pcs,previous.pcs)&&c.inv===previous.inv)?.root??null;
 if(pivotCache.size>=512)pivotCache.delete(pivotCache.keys().next().value);pivotCache.set(id,root);return root;
}
export function tonalIssues(prev,next,key,level=3,context={}){
 let p=prev,n=next;
 // Read the resolution chord as a tonic in the temporary key, retaining its voices.
 if(p?.secondaryDegree!==undefined){
  if(mod(n.pcs[0])!==mod(KEYS[p.key].tonic))return ['dominante_secondaria_senza_bersaglio'];
  n={...n,key:p.key,root:0};
 }
 // A common chord can carry the new function; unresolved dissonances remain in their old context.
 if(p&&p.key!==n.key&&!p.seventh&&p.secondaryDegree===undefined){
  const root=pivotRoot(p,n.key,level);
  if(root!==null)p={...p,key:n.key,root};
 }
 const out=issues(p,n,n.key||key,level,context);
 // Chromatic alteration in one part is preferred; cross relations between distinct parts are rejected.
 if(prev&&prev.key!==next.key){
  for(let i=0;i<4;i++)for(let j=0;j<4;j++)if(i!==j){
   const a=prev.spellings?.[i],b=next.spellings?.[j];
   if(a&&b&&a.letter===b.letter&&a.alter!==b.alter&&prev.voices[j]!==prev.voices[i]&&next.voices[i]!==next.voices[j]){
    const samePart=prev.spellings.some((p,v)=>p.letter===a.letter&&p.alter===a.alter&&next.spellings?.[v]?.letter===a.letter&&next.spellings[v].alter===b.alter);if(!samePart)out.push('falsa_relazione');
   }
  }
 }
 return [...new Set(out)];
}
import {chromaticSpelling} from './engine.mjs';
function tag(c,key,homeKey,extra={}){return {...c,key,homeKey,...extra,spellings:c.voices.map(n=>chromaticSpelling(n,key))}}
// Secondary dominants keep the written scale-degree letters of the home key,
// even when the temporary key must use an enharmonic name (e.g. Db minor → C# minor).
function secondarySpellings(c,homeKey,targetDegree){
 const first=(KEYS[homeKey].letterIndex+targetDegree+4)%7,naturals=[0,2,4,5,7,9,11],letters=['Do','Re','Mi','Fa','Sol','La','Si'];
 return c.voices.map(n=>{const tone=c.pcs.indexOf(mod(n)),letterIndex=(first+tone*2)%7,natural=naturals[letterIndex],alter=((mod(n)-natural+18)%12)-6;return {letter:letters[letterIndex],letterIndex,alter,octave:(n-natural-alter)/12-1}});
}
export function tonalCandidates(bass,key,level,locks={},options={},nextBass){
 const out=possibleAt(bass,key,level,locks,{...options,tonalMinor:true},Infinity).map(c=>tag(c,key,key));
 if(options.secondaryEnabled){for(const d of options.secondaryTargets||[1,2,3,4,5]){
  const temporary=targetKey(key,d);if(!temporary||temporary===key)continue;
  const tonicCandidates=nextBass===undefined?[]:possibleAt(nextBass,temporary,level,{}, {seventhsEnabled:false,tonalMinor:true},Infinity).filter(c=>c.root===0);
  if(!tonicCandidates.length)continue;
  out.push(...possibleAt(bass,temporary,level,locks,{seventhsEnabled:options.seventhsEnabled&&(options.allowedSevenths||[4]).includes(4),allowedSevenths:[4]},Infinity).filter(c=>c.root===4).map(c=>({...tag(c,temporary,key,{secondaryDegree:d}),spellings:secondarySpellings(c,key,d)})));
 }}
 return out;
}
// A repeated key is a confirmation of the current context, not a modulation.
// Normalize copied/saved events without changing the caller's data or removing real returns.
export function normalizeTonalEvents(events=[],key){
 let active=key;const kept=[],ignored=[];
 for(const e of [...events].sort((a,b)=>a.index-b.index)){
  if(e.kind==='modulation'&&e.key===active){ignored.push(e);continue;}
  // A manually confirmed destination selects a tonal context, not an I chord.
  // Older review events stored the inferred 'tonic' mode and accidentally forced
  // I64 on a dominant bass. Preserve explicitly requested cadences/tonics.
  const contextual=e.kind==='modulation'&&e.manualChoice&&e.arrivalMode==='tonic'&&e.arrivalConstraint!=='tonic';
  kept.push(contextual?{...e,arrivalMode:'manual',arrivalConstraint:'context'}:e);
  if(e.kind==='modulation')active=e.key;
 }
 return {events:kept,ignored};
}
function validateEvents(events,bass,key){let previous=key,lastEnd=-1;
 for(const e of events){
  if(!Number.isInteger(e.index)||e.index<0||e.index>=bass.length)throw Error('Evento tonale: scegli una nota di basso esistente.');
  if(e.kind==='modulation'){
   if(!KEYS[e.key]||!e.manualChoice&&!closeKeys(previous).includes(e.key))throw Error(`Nota ${e.index+1}: ${e.key} non è un tono vicino di ${previous}.`);
   if(!Number.isInteger(e.confirm)||e.confirm<=e.index||e.confirm>=bass.length)throw Error(`Modulazione alla nota ${e.index+1}: scegli una conferma successiva presente nel basso.`);
   if(e.index<=lastEnd)throw Error('Le transizioni tonali non possono sovrapporsi.');lastEnd=e.confirm;previous=e.key;
  }else if(e.kind==='tonicization'||e.kind==='extendedTonicization'){
   if(!targetKey(previous,e.degree))throw Error('Il grado scelto non è una tonica secondaria disponibile.');
   if(e.index>=bass.length-1)throw Error('La tonicizzazione richiede una nota successiva per risolvere.');if(e.kind==='extendedTonicization'){if(!Number.isInteger(e.confirm)||e.confirm<=e.index||e.confirm>=bass.length)throw Error('Scegli la nota finale della tonicizzazione estesa.');if(e.index<=lastEnd)throw Error('Le transizioni tonali non possono sovrapporsi.');lastEnd=e.confirm;}
  }else throw Error('Evento tonale non valido.');
 }
}
function localKeys(length,key,events){const keys=Array(length).fill(key);for(const e of events)if(e.kind==='modulation')for(let i=e.index;i<length;i++)keys[i]=e.key;for(const e of events)if(e.kind==='extendedTonicization'){const temporary=targetKey(keys[e.index],e.degree);for(let i=e.index;i<=e.confirm;i++)keys[i]=temporary}return keys}
function cadence(prev,c){return prev&&prev.secondaryDegree===undefined&&c.secondaryDegree===undefined&&prev.key===c.key&&prev.root===4&&c.root===0&&!c.seventh&&((prev.inv===3&&c.inv===1)||(prev.inv!==3&&c.inv===0))}
function searchPlan(args,events){
 const {bass,key,level=3,locks={},seventhsEnabled=false,allowedSevenths=[1,4],secondaryEnabled=false,secondaryTargets=[1,2,3,4,5],starts=[],durations=[],meter='4/4',limit=4}=args;
 const keys=localKeys(bass.length,key,events),homeKeys=localKeys(bass.length,key,events.filter(e=>e.kind==='modulation')),[beats,denominator]=meter.split('/').map(Number),bar=beats*64/denominator,minimumPreparationUnits=denominator===8&&beats%3===0?24:64/denominator;
 const mandatory=new Map(events.filter(e=>e.kind==='tonicization').map(e=>[e.index,e]));
 const entries=new Map(events.filter(e=>e.kind==='modulation'&&e.figure).map(e=>[e.index,e]));
 const confirmations=new Map(events.filter(e=>e.kind==='modulation'||e.kind==='extendedTonicization').map(e=>[e.confirm,e]));
 const pools=bass.map((n,i)=>{
  const e=mandatory.get(i),extended=events.find(e=>e.kind==='extendedTonicization'&&i>=e.index&&i<=e.confirm),options={seventhsEnabled,allowedSevenths,secondaryEnabled:!extended&&(secondaryEnabled||!!e),secondaryTargets:e?[e.degree]:secondaryTargets};
  return [...tonalCandidates(n,keys[i],level,locks[i]||{},options,bass[i+1]),...octaveCandidates({...args,key:keys[i]},i)].filter(c=>!args.bassSpellings?.[i]||c.spellings[0].letter===args.bassSpellings[i].letter&&c.spellings[0].alter===args.bassSpellings[i].alter).filter(c=>!e||c.secondaryDegree===e.degree).filter(c=>!e?.figure||label(c).split('/')[0]===e.figure).filter(c=>!entries.has(i)||label(c)===entries.get(i).figure).filter(c=>!confirmations.has(i)||confirmations.get(i).arrivalMode==='manual'||c.root===0&&c.secondaryDegree===undefined&&!c.seventh).filter(c=>{const r=args.harmonicRequests?.[i];return !r||(r.root===undefined||c.root===r.root)&&(r.key===undefined||c.key===r.key)&&(r.seventh===undefined||c.seventh===r.seventh)&&(r.inv===undefined||c.inv===r.inv)&&(r.sopranoPc===undefined||mod(c.voices[3])===r.sopranoPc)&&(r.secondaryDegree===undefined||r.secondaryDegree===null&&c.secondaryDegree===undefined||r.secondaryDegree===c.secondaryDegree)}).map(c=>extended?{...c,homeKey:homeKeys[i],tonicizedDegree:extended.degree}:c).sort((a,b)=>a.score-b.score);
 });
 if(pools.some(p=>!p.length))return {solutions:[],failure:pools.findIndex(p=>!p.length),reason:'nessun accordo ammesso'};
 const cost=(p,c,i)=>{
  let v=(args.preferredSolution?.[i]?c.voices.reduce((sum,n,v)=>sum+(n!==args.preferredSolution[i].voices[v]?12:0)+Math.abs(n-args.preferredSolution[i].voices[v]),0):0)+c.score+([0,3,16,3,0,9,18][c.root])+c.inv*3+(c.secondaryDegree!==undefined?12:0);
  if(p){v+=c.voices.slice(1).reduce((a,n,j)=>a+Math.abs(n-p.voices[j+1])*.25,0);if(cadence(p,c))v-=16;if(p.secondaryDegree!==undefined&&c.secondaryDegree===undefined)v-=6;if(p.key===c.key&&(p.root===1||p.root===3)&&c.root===4)v-=7;}
  if(i===bass.length-1&&c.root===0&&c.inv===0)v-=14;return v;
 };
 const edge=(p,c,i)=>!tonalIssues(p,c,key,level,{preparationUnits:durations[i-1],minimumPreparationUnits}).length&&(!confirmations.has(i)||confirmations.get(i).arrivalMode==='manual'||cadence(p,c)||confirmations.get(i).arrivalMode==='tonic'&&c.root===0&&c.secondaryDegree===undefined&&!c.seventh);
 const finalValid=c=>!c.seventh&&c.secondaryDegree===undefined&&!(c.root===0&&c.inv===2);
 const searched=solveVoicingLayers({pools,limit,initialValid:c=>!tonalIssues(null,c,key,level).length,edge,
  edgeContext:i=>JSON.stringify([durations[i-1],minimumPreparationUnits,confirmations.get(i)?.arrivalMode||'',confirmations.has(i)]),
  cost:(path,c,i)=>path?path.cost+cost(path.c,c,i):cost(null,c,0),finalValid,onProgress:args.onProgress,pathClass:cadencePathClass(bass.length,key)});
 if(!searched.paths.length){
  const i=searched.failure,localLinkExists=i>0&&searched.reason==='edge'&&pools[i-1].some(p=>pools[i].some(c=>edge(p,c,i)));
  const examples=[],seenErrors=new Set();let sampled=0;
  if(searched.reason==='edge')outer:for(const p of searched.failedPredecessors||[])for(const c of pools[i]){
   const errors=tonalIssues(p,c,key,level,{preparationUnits:durations[i-1],minimumPreparationUnits});
   if(confirmations.has(i)&&confirmations.get(i).arrivalMode!=='manual'&&!cadence(p,c)&&!(confirmations.get(i).arrivalMode==='tonic'&&c.root===0&&c.secondaryDegree===undefined&&!c.seventh))errors.push('conferma_cadenza');
   const id=[...errors].sort().join('|');if(!seenErrors.has(id)){seenErrors.add(id);examples.push({previous:p.voices,next:c.voices,figures:[label(p),label(c)],keys:[p.key,c.key],errors})}
   if(++sampled>=2000)break outer;
  }
  const trace={index:i,key:keys[i],stage:searched.reason,candidates:pools.map(p=>p.length),sampled,examples:examples.sort((a,b)=>a.errors.length-b.errors.length).slice(0,5)};
  return {solutions:[],failure:i,localLinkExists,trace,reason:searched.reason==='initial'?'accordo iniziale incompatibile':searched.reason==='final'?'chiusura irrisolta':confirmations.has(i)?'cadenza di conferma incompatibile':'collegamento delle voci incompatibile'};
 }
 const paths=preferClosingCadence(searched.paths,key);
 const distinct=new Set();const solutions=paths.filter(p=>{const id=p.items.map(c=>`${c.key}:${c.secondaryDegree}:${c.voices}`).join('|');if(distinct.has(id))return false;distinct.add(id);return true}).slice(0,limit).map(p=>{
  const items=p.items.map(c=>({...c}));for(const e of events)if(e.kind==='extendedTonicization'){items[e.index].tonicizationEvent={...e,key:keys[e.index]};items[e.confirm].tonicizationEnd=keys[e.index];}for(const e of events)if(e.kind==='modulation'){
   items[e.index].tonalEvent={...e,from:e.index?keys[e.index-1]:key,source:'Schema modulazioni ai toni vicini, pp. 1–3'};items[e.confirm].confirmedKey=e.key;items[e.confirm].tonalConfirmationMode=e.arrivalMode;
   const previous=items[e.index-1];if(previous&&!previous.seventh){const pivot=possibleAt(previous.voices[0],e.key,level,{}, {seventhsEnabled:false,tonalMinor:true},Infinity).find(c=>sameChord(c.pcs,previous.pcs)&&c.inv===previous.inv);if(pivot)previous.pivot={key:e.key,root:pivot.root,inv:pivot.inv,seventh:false};}
  }
  return items;
 });
 return {solutions,failure:Math.max(0,bass.length-1),reason:'chiusura irrisolta'};
}
const LETTERS=['Do','Re','Mi','Fa','Sol','La','Si'];
const SIG_SHARPS=['Fa','Do','Sol','Re','La','Mi','Si'],SIG_FLATS=['Si','Mi','La','Re','Sol','Do','Fa'];
export function signatureAlter(letter,key){const f=KEYS[key].fifths;return f>0&&SIG_SHARPS.slice(0,f).includes(letter)?1:f<0&&SIG_FLATS.slice(0,-f).includes(letter)?-1:0}
export function alterationCandidates({midi,spelling,key}){
 if(!spelling){const found=[];for(const destination of [key,...closeKeys(key)]){const written=chromaticSpelling(midi,destination);for(const candidate of alterationCandidates({midi,spelling:written,key}))if(!found.some(c=>c.key===candidate.key&&c.role===candidate.role))found.push(candidate)}return found;}const written=spelling,change=written.alter-signatureAlter(written.letter,key);
 if(!change)return [];
 const roles=change>0?[[false,6,'VII'],[true,1,'II']]:[[false,3,'IV'],[true,3,'IV'],[true,5,'VI']];
 const candidates=[];
 for(const destination of closeKeys(key))for(const [minor,d,role] of roles){const k=KEYS[destination];
  if(k.minor!==minor||mod(k.tonic+k.steps[d])!==mod(midi)||LETTERS[(k.letterIndex+d)%7]!==written.letter)continue;
  candidates.push({key:destination,degree:d,role,direction:change>0?'ascendente':'discendente',change,reason:`${chromaticName(midi,destination)}: alterazione ${change>0?'ascendente':'discendente'} rispetto a ${key}; ${role} di ${destination}`});
 }
 return candidates;
}
function writtenAt(args,i,key){return args.bassSpellings?.[i]||null}
function belongs(n,key){return degree(n,key)>=0||KEYS[key].minor&&mod(n-KEYS[key].tonic)===10}
function arrivals(args,index,candidate,end=args.bass.length-1,limit=4){
 const {bass}=args,k=KEYS[candidate.key],out=[];
 for(let j=index+1;j<=end;j++){
  if(bass.slice(index,j+1).some(n=>!belongs(n,candidate.key)))break;
  const d=degree(bass[j],candidate.key),before=degree(bass[j-1],candidate.key),delta=bass[j]-bass[j-1];
  const rootArrival=d===0,thirdArrival=d===2&&before===3&&[-1,-2].includes(delta);
  if(!rootArrival&&!thirdArrival)continue;
  const authentic=rootArrival&&before===4,leading=rootArrival&&before===6&&delta===1,second=rootArrival&&before===1;
  const score=(authentic?0:leading?1:thirdArrival?2:second?3:6)+(j-index)*.05;
  out.push({kind:'modulation',index,key:candidate.key,confirm:j,automatic:true,uncertain:!authentic,arrivalMode:authentic||leading||second?'cadence':'tonic',role:candidate.role,reason:candidate.reason+(authentic?'; V–I':leading?'; sensibile che sale alla tonica':thirdArrival?'; IV al basso che scende sulla terza della tonica':'; arrivo sulla tonica'),score});
 }
 return out.sort((a,b)=>a.score-b.score).slice(0,limit);
}
export function manualModulationCandidates(args,index,confirm){
 if(index<0||confirm<=index||confirm>=args.bass.length)return [];
 const localKey=args.key,cue=alterationCandidates({midi:args.bass[index],spelling:writtenAt(args,index,localKey),key:localKey});
 const destinations=cue.length?cue:closeKeys(localKey).map(key=>({key,reason:`Arrivo compatibile con ${key}`,role:''}));
 return destinations.flatMap(candidate=>arrivals(args,index,candidate,confirm,Infinity).filter(e=>e.confirm===confirm)).sort((a,b)=>a.score-b.score);
}
export function suggestModulations(args){
 const {bass,key,allowAtStart=false}=args,out=[];
 for(let i=allowAtStart?0:1;i<bass.length-1;i++){
  const candidates=alterationCandidates({midi:bass[i],spelling:writtenAt(args,i,key),key});
  for(const candidate of candidates)out.push(...arrivals(args,i,candidate));
 }
 // Diatonic changes remain possible; chromatic cues get priority over unrelated cadence guesses.
 if(!out.length){for(const destination of closeKeys(key))for(let i=allowAtStart?0:1;i<bass.length-1;i++){
  if(![1,3,5].includes(degree(bass[i],destination)))continue;
  out.push(...arrivals(args,i,{key:destination,reason:`Rilettura del basso in ${destination}`,role:''}).filter(e=>degree(bass[e.confirm-1],destination)===4||degree(bass[e.confirm-1],destination)===1));
 }}
 return out.sort((a,b)=>a.index-b.index||a.score-b.score);
}
export function automaticTonalPlans(args){
 const {bass,key}=args,max=args.maxModulations??12,plans=[],seen=new Set(),fixed=(args.tonalEvents||[]).filter(e=>e.kind==='modulation').sort((a,b)=>a.index-b.index);let explored=0;
 function visit(current,cursor,events){
  if(++explored>180)return;
  const forced=fixed.find(e=>e.index>=cursor),stop=forced?.index??bass.length;
  const cues=[];for(let i=cursor;i<Math.min(stop,bass.length-1);i++){
   if(!belongs(bass[i],current)){
    const c=alterationCandidates({midi:bass[i],spelling:writtenAt(args,i,current),key:current});
    if(c.length){cues.push({index:i,candidates:c});break}
   }
  }
  if(!cues.length&&forced){visit(forced.key,forced.confirm+1,[...events,forced]);return}
  if(!cues.length){const id=JSON.stringify(events.map(e=>[e.index,e.key,e.confirm]));if(!seen.has(id)){seen.add(id);plans.push(events)}return}
  if(events.length>=max)return;
  const {index,candidates}=cues[0];
  for(const candidate of candidates){
   for(const event of arrivals(args,index,candidate,stop-1)){
    const nextForeign=bass.findIndex((n,i)=>i>index&&i<stop&&!belongs(n,candidate.key));if(nextForeign>=0&&event.confirm>=nextForeign)continue;
    visit(candidate.key,event.confirm+1,[...events,event]);
   }
  }
 }
 visit(key,0,[]);
 // Retain simple ambiguous/diatonic alternatives, but do not let a truncation discard a complete route.
 for(const e of (fixed.length?[]:suggestModulations(args)).slice(0,16)){if(bass.slice(e.confirm+1).every(n=>belongs(n,e.key)))plans.push([e]);}
 return plans.sort((a,b)=>a.reduce((s,e)=>s+(e.score||0),0)-b.reduce((s,e)=>s+(e.score||0),0)).slice(0,24);
}
export function harmonizeTonal(args){
 const {bass,key='Do maggiore',tonalEvents=[],modulationMode='off',secondaryEnabled=false,limit=4}=args;
 if(!bass?.length)return {solutions:[],diagnosis:'Inserisci almeno una nota di basso.'};
 if(!KEYS[key]||bass.some(n=>!Number.isInteger(n)))throw Error('Tonalità o note non valide.');
 const events=normalizeTonalEvents(tonalEvents,key).events;validateEvents(events,bass,key);
 if(!args.harmonicRequests&&!events.length&&!secondaryEnabled&&modulationMode==='off'&&bass.every((n,i)=>degree(n,key)>=0&&(!args.bassSpellings?.[i]||(chromaticSpelling(n,key).letter===args.bassSpellings[i].letter&&chromaticSpelling(n,key).alter===args.bassSpellings[i].alter)))){const solutions=harmonize(args);if(solutions.length)return {solutions};}
 const plans=[events];if(modulationMode==='auto'){
  for(const route of automaticTonalPlans(args)){const plan=[...events.filter(e=>e.kind!=='modulation'),...route].sort((a,b)=>a.index-b.index);plans.push(plan);}
  for(const e of (events.some(e=>e.kind==='modulation')?[]:suggestModulations(args)).slice(0,8)){const target=[1,2,3,4,5,6].find(d=>targetKey(key,d)===e.key);if(e.uncertain&&target!==undefined&&bass.slice(e.confirm+1).every(n=>belongs(n,key)))plans.push([...events,{...e,kind:'extendedTonicization',degree:target}].sort((a,b)=>a.index-b.index));}
 }
 let solutions=[],failure;const solvedRoutes=new Set();
 for(const plan of plans){try{validateEvents(plan,bass,key)}catch{continue}const routeId=JSON.stringify(plan.map(e=>[e.kind,e.index,e.key,e.degree]));if(solvedRoutes.has(routeId))continue;const r=searchPlan(args,plan);if(!r.solutions.length&&(!failure||r.failure>failure.failure))failure={...r,events:plan};if(r.solutions.length)solvedRoutes.add(routeId);solutions.push(...r.solutions);if(solutions.length>=limit&&plans.length===1)break;}
 // Keep different tonal readings visible before filling the list with different voicings.
 if(modulationMode==='auto')solutions.sort((a,b)=>b.filter(c=>c.tonalEvent).length-a.filter(c=>c.tonalEvent).length);const readings=new Set(),chosen=[];const stable=solutions.find(s=>!s.some(c=>c.tonalEvent));if(solutions.length){chosen.push(solutions[0]);if(stable&&stable!==solutions[0]&&limit>1)chosen.push(stable);for(const sol of chosen)readings.add(sol.map(c=>`${c.homeKey}:${c.tonalEvent?.key||c.tonicizationEvent?.key||''}`).join('|'));}for(const sol of solutions){const id=sol.map(c=>`${c.homeKey}:${c.tonalEvent?.key||c.tonicizationEvent?.key||''}`).join('|');if(!readings.has(id)){chosen.push(sol);readings.add(id)}if(chosen.length===limit)break}
 for(const sol of solutions){if(chosen.length===limit)break;if(!chosen.includes(sol))chosen.push(sol)}
 const i=failure?.failure??0,failedEvents=failure?.events||events,keys=localKeys(bass.length,key,failedEvents),e=failedEvents.find(e=>e.confirm===i||e.index===i),writtenName=j=>{const p=args.bassSpellings?.[j];return p?p.letter+({'-2':'♭♭','-1':'♭','0':'','1':'♯','2':'𝄪'}[p.alter]||'')+p.octave:chromaticName(bass[j],keys[j])};
 const outside=failure?.reason==='nessun accordo ammesso'&&!belongs(bass[i],keys[i]);
 const localCadence=i>0&&keys[i-1]===keys[i]&&degree(bass[i-1],keys[i])===4&&degree(bass[i],keys[i])===0
  &&possibleAt(bass[i-1],keys[i],3,{}, {seventhsEnabled:false,tonalMinor:true},Infinity).filter(c=>c.root===4&&c.inv===0).some(p=>possibleAt(bass[i],keys[i],3,{}, {seventhsEnabled:false,tonalMinor:true},Infinity).filter(c=>c.root===0&&c.inv===0).some(c=>!tonalIssues(p,c,keys[i],3).length));
 const hasVoiceLocks=Object.values(args.locks||{}).some(v=>Object.keys(v).length),hasFigures=Object.keys(args.harmonicRequests||{}).length>0;
 const constraints=[hasVoiceLocks?'note bloccate':'',hasFigures?'accordi richiesti':'','livello e percorso tonale'].filter(Boolean).join(', ');
 const detail=localCadence? `Il collegamento ${writtenName(i-1)} → ${writtenName(i)} è ammesso: V–I valido in ${keys[i]}. La ricerca dell’intero basso si arresta con questi vincoli: ${constraints}. Non è dimostrato un errore in queste due note del basso.`:outside?`La nota ${writtenName(i)} non appartiene alla tonalità locale ${keys[i]}. Se indica un cambio di tonalità, seleziona il nuovo evento su questa nota e la sua nota di arrivo, oppure usa la modalità automatica.`:failure?.reason==='nessun accordo ammesso'?`Sulla nota ${i+1}, in ${keys[i]}, nessun accordo rispetta insieme ${constraints}, rivolti e settime selezionate. Non è un errore di salto tra le due note.`:failure?.localLinkExists?`Il collegamento ${writtenName(i-1)} → ${writtenName(i)} è ammesso in ${keys[i]}. Non è stata trovata una disposizione che lo unisca all’intero tratto precedente rispettando i vincoli attuali; i vincoli presenti sono ${constraints}.`:`In ${keys[i]}: ${failure?.reason||'nessuna soluzione valida'}.`;
 const diagnosis=`${failure?.localLinkExists?'Verifica del percorso fino alle note '+i+' e '+(i+1):i?'Tra le note '+i+' e '+(i+1):'Sulla nota 1'} (${i?writtenName(i-1)+' → ':''}${writtenName(i)}): ${detail}${e?.kind==='modulation'&&!['tonic','manual'].includes(e.arrivalMode)?` La conferma scelta a ${e.key}, nota ${e.confirm+1}, richiede V–I oppure V42–I6 (con settima abilitata).`:''}`;
 let assessment,recovery;
 if(!chosen.length&&!args._assessmentProbe){
  args.onProgress?.({phase:'diagnosis'});
  const hasLocks=Object.values(args.locks||{}).some(v=>Object.keys(v).length),hasRequests=Object.keys(args.harmonicRequests||{}).length>0;
  if(hasLocks||hasRequests){
   const relaxed={...args,locks:{},harmonicRequests:undefined,_assessmentProbe:true},r=harmonizeTonal(relaxed);
   if(r.solutions.length){recovery={solutions:r.solutions,level:args.level||3,clearVoiceConstraints:true};assessment={message:`${localCadence?`${writtenName(i-1)} → ${writtenName(i)}: V–I valido in ${keys[i]}. `:''}${hasLocks&&hasRequests?'Le note bloccate e gli accordi richiesti':hasLocks?'Le note bloccate':'Gli accordi richiesti'} impediscono la soluzione. Ho verificato un’armonizzazione dell’intero basso senza questi vincoli. Il basso resta identico.`,recoveryLabel:'Armonizza mantenendo solo il basso'};}
  }
  if(!recovery&&(args.level||3)<3){
   for(let level=(args.level||3)+1;level<=3;level++){
    const r=harmonizeTonal({...args,level,_assessmentProbe:true});
    if(r.solutions.length){const index=r.solutions[0].findIndex(c=>c.inv>0||c.seventh),figure=index>=0?`${label(r.solutions[0][index])} sulla nota ${index+1} (${chromaticName(bass[index],key)})`:'i rivolti necessari';recovery={solutions:r.solutions,level,clearVoiceConstraints:false};assessment={message:`Il livello ${args.level} esclude ${figure}. Ho verificato una soluzione al livello ${level} con lo stesso basso e le stesse note bloccate.`,recoveryLabel:`Passa al livello ${level}`};break;}
   }
  }
 }
 return {solutions:chosen,diagnosis:chosen.length?'':diagnosis,assessment,recovery,trace:chosen.length?undefined:{...(failure?.trace||{index:i,stage:'candidates'}),tonalEvents:failedEvents,localKeys:keys}};
}
export function readingLabel(sol,key){const events=sol.filter(c=>c.tonalEvent).map(c=>`${c.tonalEvent.automatic&&c.tonalEvent.uncertain?'Possibile modulazione':'Modulazione'}: ${c.tonalEvent.from} → ${c.tonalEvent.key}`);return events.length?events.join(' · '):sol.some(c=>c.secondaryDegree!==undefined||c.tonicizedDegree!==undefined)?`${key} · tonicizzazioni`:`${key} · tonalità stabile`}
export function generateTonalBass({key='Do maggiore',destination,secondaryEnabled=false,returnHome=false,level=3,seventhsEnabled=false,allowedSevenths=[1,4],secondaryTargets=[1,2,3,4,5],variation=0}){
 const tonic=k=>{let n=KEYS[k].tonic-24;while(n<40)n+=12;while(n>55)n-=12;return n};
 const root=(k,d,anchor)=>{const pc=mod(KEYS[k].tonic+KEYS[k].steps[d]),choices=[];for(let n=36;n<=55;n++)if(mod(n)===pc)choices.push(n);return choices.sort((a,b)=>Math.abs(a-anchor)-Math.abs(b-anchor)||a-b)[0]};
 const home=tonic(key),bass=[home,root(key,3,home),root(key,4,home),home],tonalEvents=[];
 if(destination){if(!closeKeys(key).includes(destination))throw Error('Scegli un tono vicino.');
  const append=k=>{const index=bass.length,pre=root(k,KEYS[k].minor?3:1,bass.at(-1)),dominant=root(k,4,pre),arrival=root(k,0,dominant);bass.push(pre,dominant,arrival,arrival);tonalEvents.push({kind:'modulation',index,key:k,confirm:index+2})};
  append(destination);if(returnHome)append(key);
 }
 else if(secondaryEnabled){const choices=(KEYS[key].minor?[3,4,5]:[1,2,3,4,5]).filter(d=>secondaryTargets.includes(d));if(!choices.length)throw Error('Seleziona almeno un grado tonicizzabile.');const d=choices[variation%choices.length],target=targetKey(key,d),t=root(key,d,home),index=bass.length;bass.push(root(target,4,t),t,root(key,4,home),home);tonalEvents.push({kind:'tonicization',index,degree:d})}
 const result=harmonizeTonal({bass,key,level,seventhsEnabled,allowedSevenths,secondaryEnabled,secondaryTargets,tonalEvents});
 if(!result.solutions.length)throw Error(result.diagnosis);return {bass,tonalEvents,solutions:result.solutions};
}


export function tonicizedKey(key,degree){return targetKey(key,degree)}
