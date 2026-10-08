import {solveVoicingLayers} from './voicing-search.mjs';
const LETTERS=['Do','Re','Mi','Fa','Sol','La','Si'],NATURAL=[0,2,4,5,7,9,11];
const ACCIDENTAL={"♭":-1,"♯":1,"𝄪":2,"𝄫":-2};
const MAJOR=[['Do♭',-7],['Sol♭',-6],['Re♭',-5],['La♭',-4],['Mi♭',-3],['Si♭',-2],['Fa',-1],['Do',0],['Sol',1],['Re',2],['La',3],['Mi',4],['Si',5],['Fa♯',6],['Do♯',7]];
const MINOR=[['La♭',-7],['Mi♭',-6],['Si♭',-5],['Fa',-4],['Do',-3],['Sol',-2],['Re',-1],['La',0],['Mi',1],['Si',2],['Fa♯',3],['Do♯',4],['Sol♯',5],['Re♯',6],['La♯',7]];
const symbol=a=>a===2?'𝄪':a===1?'♯':a===-1?'♭':a===-2?'𝄫':'';
function makeKey(name,fifths,minor){
 const letter=name.replace(/[♯♭]/g,''),letterIndex=LETTERS.indexOf(letter),tonic=60+NATURAL[letterIndex]+(ACCIDENTAL[name.slice(letter.length)]||0);
 const steps=minor?[0,2,3,5,7,8,11]:[0,2,4,5,7,9,11];
 const names=steps.map((semitones,d)=>{
  const index=letterIndex+d,natural=60+NATURAL[index%7]+12*Math.floor(index/7);
  return LETTERS[index%7]+symbol(tonic+semitones-natural);
 });
 return {tonic,steps,names,minor,fifths,letterIndex};
}
export const KEYS=Object.fromEntries([...MAJOR.map(([name,fifths])=>[`${name} maggiore`,makeKey(name,fifths,false)]),...MINOR.map(([name,fifths])=>[`${name} minore`,makeKey(name,fifths,true)])]);
export const RULES = [
 {id:'parallele',title:'Quinte e ottave parallele',source:'Giannetta',page:24,printed:14,section:'§2.6',level:1,detail:'Due voci non procedono per moto retto parallelo in quinta, ottava o unisono.'},
 {id:'unisono',title:'Raddoppio all’unisono',source:'Giannetta',page:22,printed:12,section:'§2.3',level:1,detail:'Il raddoppio può essere all’unisono o all’ottava; l’unisono non è un incrocio. Restano vietati i movimenti paralleli all’unisono.'},
 {id:'nascoste',title:'Quinte e ottave nascoste',source:'Giannetta',page:25,printed:15,section:'§2.6',level:1,detail:'Quinta nascosta ammessa se una voce procede per grado; ottava nascosta se la voce superiore procede per grado.'},
 {id:'salti',title:'Intervalli melodici aumentati',source:'Giannetta',page:25,printed:15,section:'§2.7',level:1,detail:'Evitare seconde e quarte aumentate nel moto melodico.'},
 {id:'legame',title:'Legame armonico ed economia',source:'Giannetta',page:27,printed:17,section:'§3.1',level:1,detail:'Conservare preferibilmente i suoni comuni nella stessa voce e contenere gli spostamenti.'},
 {id:'ii_v',title:'Collegamento II–V',source:'Giannetta',page:28,printed:18,section:'§3.2',level:1,detail:'Nel II–V ascendente di quarta le voci superiori discendono, anche in presenza di un suono comune.'},
 {id:'ottava_discendente',title:'Regola dell’ottava: VII–VI–V discendente',source:'De Ninno, Regola dell’ottava',page:1,printed:179,section:'Scala di Do maggiore, tre posizioni',level:3,detail:'Nel VII–VI–V discendente: V6–V43/V–V. La discesa della sensibile al basso è ammessa esclusivamente in questo schema; la dominante secondaria conserva gli obblighi di risoluzione. Richiede settime di dominante abilitate.'},
 {id:'sensibile',title:'Risoluzione e raddoppio della sensibile',source:'Giannetta',page:29,printed:19,section:'§3.3',level:1,detail:'La sensibile sale di semitono alla tonica e non si raddoppia. Eccezione di Bach: nella dominante–tonica, fuori dal soprano, può scendere di terza se una voce superiore porta la sopratonica sulla tonica (§3.3).'},
 {id:'v_vi',title:'Collegamento V–VI',source:'Giannetta',page:29,printed:19,section:'§3.4',level:1,detail:'Nella cadenza d’inganno il VI presenta il raddoppio della terza.'},
 {id:'funzioni',title:'Ordine funzionale',source:'Giannetta',page:30,printed:20,section:'§3.5',level:1,detail:'La sequenza tipica è tonica–sottodominante–dominante–tonica; evitare V–IV fondamentale.'},
 {id:'cadenze',title:'Cadenze e chiusura della frase',source:'Giannetta',page:43,printed:33,section:'§5',level:1,detail:'Favorire II–V–I, IV–V–I e V–I quando il basso e la condotta delle voci lo consentono. La cadenza plagale IV–I e quella d’inganno V–VI hanno funzioni diverse.'},
 {id:'primo_rivolto',title:'Raddoppi nel primo rivolto',source:'Giannetta',page:34,printed:24,section:'§4.2',level:2,detail:'Il raddoppio preferito è spesso la fondamentale; non raddoppiare mai la sensibile.'},
 {id:'quarta_sesta',title:'Quarta e sesta di cadenza',source:'Giannetta',page:43,printed:33,section:'§5.2',level:3,detail:'Il secondo rivolto di tonica precede la triade fondamentale di dominante nella cadenza composta.'},
 {id:'settima',title:'Risoluzione della settima',source:'Giannetta',page:61,printed:51,section:'§7.1',level:3,detail:'La settima scende di grado nell’accordo successivo.'},
 {id:'rivolti_settima',title:'Rivolti della settima di dominante',source:'Giannetta',page:63,printed:53,section:'§7.3',level:3,detail:'La settima completa si dispone allo stato fondamentale o nei tre rivolti 6/5, 4/3 e 4/2.'},
 {id:'settime_artificiali',title:'Preparazione delle settime artificiali',source:'Giannetta',page:64,printed:54,section:'§7.5',level:3,detail:'La settima artificiale è preparata nella stessa voce e alla stessa altezza; il suono di preparazione dura almeno un tempo.'},
 {id:'settime_gradi',title:'Gradi delle settime artificiali',source:'Giannetta',page:72,printed:62,section:'§8.8',level:3,detail:'In maggiore: I–IV, III–VI, VI–II; la settima di II risolve su V (§8.1). In minore il profilo usa solo II–V.'}
];
const mod=(a,b)=>((a%b)+b)%b;
export function noteSpelling(n,key='Do maggiore'){
 const k=KEYS[key],i=k?.steps.findIndex(s=>mod(k.tonic+s,12)===mod(n,12))??-1;
 if(i<0)return null;
 const name=k.names[i],letter=name.replace(/[♯♭𝄪𝄫]/gu,''),accidental=name.slice(letter.length);
 return {letter,alter:ACCIDENTAL[accidental]||0,octave:4+Math.floor((k.letterIndex+i)/7)+(n-k.tonic-k.steps[i])/12,degree:i};
}
export function pitchName(n,key='Do maggiore') {const spelling=noteSpelling(n,key);return spelling?KEYS[key].names[spelling.degree]+spelling.octave:String(n)}
export function degree(n,key) { const k=KEYS[key];return k.steps.findIndex(s=>mod(k.tonic+s,12)===mod(n,12)); }
export function bassForDegrees(degrees,key) { const k=KEYS[key];return degrees.map(d=>{if(!Number.isInteger(d)||d<0||d>6)throw Error('Grado non valido');let n=k.tonic-24+k.steps[d];while(n<40)n+=12;while(n>60)n-=12;return n;}); }
export function generateBass(key='Do maggiore',length=8,variation=0){const forms=KEYS[key]?.minor?[[0,2,3,4,0,3,4,0],[0,3,1,4,0,3,4,0],[0,3,4,0,3,1,4,0],[0,5,3,4,0,3,4,0]]:[[0,3,4,0,5,1,4,0],[0,3,4,0,3,1,4,0],[0,5,1,4,0,3,4,0],[0,3,1,4,5,1,4,0]];return bassForDegrees(forms[mod(variation,forms.length)].slice(0,length),key);}
function chord(key,root,seventh=false){const k=KEYS[key], base=k.tonic+k.steps[root];const i=[0,2,4,...(seventh?[6]:[])].map(offset=>{let x=root+offset;let n=k.tonic+k.steps[x%7]+12*Math.floor(x/7);while(n<base)n+=12;return mod(n,12)});return i;}
const matches=(n,p)=>mod(n,12)===p;
export function supportedSevenths(key){return KEYS[key]?.minor?[1,4]:[0,1,2,4,5]}
export function possibleAt(bass,key,level,locks={},options={},cap=380){
 const k=KEYS[key],out=[];
 const enabled=options.seventhsEnabled??level>=3,allowed=options.allowedSevenths??[4],supports=supportedSevenths(key);
 for(let root=0;root<7;root++)for(const seventh of (level>=3&&enabled&&allowed.includes(root)&&supports.includes(root)?[false,true]:[false]))for(let inv=0;inv<(seventh?4:level>=3?3:level>=2?2:1);inv++){
  if(!seventh&&root===6&&inv===0)continue; // accordo diminuito di sensibile solo in primo rivolto, Giannetta §4.4
  if(!seventh&&inv===2&&root!==0&&!(options.pedalCadence&&root===3))continue; // quarta e sesta di tonica, §5.2
  const pcs=chord(key,root,seventh);if(options.tonalMinor&&k.minor&&root===2&&!seventh)pcs[2]=mod(pcs[2]-1,12);if(!matches(bass,pcs[inv]))continue;
  const pool=(lo,hi)=>{let a=[];for(let n=lo;n<=hi;n++)if(pcs.includes(mod(n,12)))a.push(n);return a};
  for(const t of pool(48,67))for(const a of pool(55,74))for(const s of pool(60,81)){
   if(!(bass<=t&&t<=a&&a<=s&&s-a<=12&&a-t<=12))continue;
   const v=[bass,t,a,s],counts=pcs.map(pc=>v.filter(n=>matches(n,pc)).length);
   const incompleteTonic=level>=3&&root===0&&!seventh&&counts[0]===3&&counts[1]===1&&counts[2]===0;
   // V7 incompleto: la quinta può mancare se la fondamentale è raddoppiata;
   // terza (sensibile) e settima devono comunque essere presenti una volta sola.
   const incompleteDominant=seventh&&root===4&&counts[0]===2&&counts[1]===1&&counts[2]===0&&counts[3]===1;
   if(!incompleteTonic&&!incompleteDominant&&counts.some(c=>c===0))continue;
   if(counts.filter(c=>c>1).length>1)continue;
   if(counts[2]>1&&root===6)continue;
   if(counts.some((c,i)=>c>1&&matches(k.tonic+k.steps[6],pcs[i])))continue;
   if(seventh&&counts[3]!==1)continue;
   if(root===4&&inv===0&&seventh===false&&counts[1]>1)continue;
   if(root===5&&inv===0&&counts[1]===2){} // V–VI determined by preceding chord below
   if(Object.entries(locks).some(([voice,n])=>v[Number(voice)]!==n))continue;
   out.push({voices:v,root,inv,seventh,pcs,...(options.pedalCadence?{pedalCadence:true}:{}),incompleteTonic,incompleteDominant,score:Math.abs(s-72)*.15+Math.abs(t-57)*.1+(inv?1:0)+(inv===2&&!seventh?2:0)+(seventh?2:0)+(incompleteTonic?3:0)+(incompleteDominant?2:0)+(counts[0]===2?0:1)+v.slice(1).filter((n,i)=>n===v[i]).length*6});
  }
 }
 return out.sort((a,b)=>a.score-b.score).slice(0,cap);
}
export function octaveDescentAt(bass,key,i){return !KEYS[key].minor&&i>0&&i+1<bass.length&&degree(bass[i-1],key)===6&&degree(bass[i],key)===5&&degree(bass[i+1],key)===4&&bass[i]-bass[i-1]===-2&&bass[i+1]-bass[i]===-2}
export function octaveCandidates({bass,key,level=3,seventhsEnabled=level>=3,allowedSevenths=[4],locks={}},i){
 if(level<3||!seventhsEnabled||!allowedSevenths.includes(4)||!octaveDescentAt(bass,key,i))return [];
 const tonic=mod(KEYS[key].tonic+7,12),temporary=Object.keys(KEYS).filter(k=>!KEYS[k].minor&&mod(KEYS[k].tonic,12)===tonic).sort((a,b)=>Math.abs(KEYS[a].fifths-KEYS[key].fifths)-Math.abs(KEYS[b].fifths-KEYS[key].fifths))[0];
 return possibleAt(bass[i],temporary,3,locks[i]||{},{seventhsEnabled:true,allowedSevenths:[4]},Infinity).filter(c=>c.root===4&&c.inv===2&&c.seventh).map(c=>({...c,key:temporary,homeKey:key,secondaryDegree:4,octaveRule:true,spellings:c.voices.map(n=>{const d=[1,3,5,0][c.pcs.indexOf(mod(n,12))],name=KEYS[key].names[d],letter=name.replace(/[♯♭𝄪𝄫]/gu,''),alter=(ACCIDENTAL[name.slice(letter.length)]||0)+(d===3?1:0),letterIndex=mod(KEYS[key].letterIndex+d,7),natural=[0,2,4,5,7,9,11][letterIndex];return{letter,alter,letterIndex,octave:(n-natural-alter)/12-1}})}));
}
export function bachResolution(prev,next,voice,key=prev?.key||next?.key||'Do maggiore'){
 if(!prev||voice>=3||prev.root!==4||degree(next.pcs?.[0]??next.voices[0],key)!==0)return false;
 const k=KEYS[key],p=prev.voices,v=next.voices;
 if(!matches(p[voice],mod(k.tonic+k.steps[6],12))||v[voice]-p[voice]!==-4||!matches(v[voice],mod(k.tonic+7,12)))return false;
 return p.some((n,j)=>j>voice&&matches(n,mod(k.tonic+2,12))&&v[j]===n-2&&matches(v[j],mod(k.tonic,12)));
}
export function issues(prev,next,key,level=3,context={}){const out=[];key=next.key||key;const previousKey=prev?.key||key,k=KEYS[key],pk=KEYS[previousKey],v=next.voices,p=prev?.voices;const sameKey=previousKey===key,nextRootInPrev=degree(next.pcs?.[0]??v[0],previousKey);
 if(!(v[0]<=v[1]&&v[1]<=v[2]&&v[2]<=v[3]&&v[2]-v[1]<=12&&v[3]-v[2]<=12))out.push('incrocio');
 const pcs=next.pcs||chord(key,next.root,next.seventh);const count=pcs.map(pc=>v.filter(n=>matches(n,pc)).length);
 if(count.some(c=>!c)&&!(next.incompleteTonic&&prev?.seventh&&prev.root===4&&matches(p[0],prev.pcs[prev.inv]))&&!next.incompleteDominant)out.push('accordo_incompleto');
 if(count.some((c,i)=>c>1&&matches(k.tonic+k.steps[6],pcs[i])))out.push('sensibile_raddoppiata');
 if(next.seventh&&next.root!==4){
  const seventhVoice=v.findIndex(n=>matches(n,next.pcs[3]));
  if(!p||p[seventhVoice]!==v[seventhVoice]||context.preparationUnits!==undefined&&context.preparationUnits<context.minimumPreparationUnits)out.push('settima_non_preparata');
 }
 if(!p)return out;
 if(prev.inv===2&&!prev.seventh&&!(nextRootInPrev===4&&next.inv===0&&v[0]===p[0])&&!(prev.pedalCadence&&next.pedalCadence&&prev.root===3&&nextRootInPrev===0&&next.inv===0&&v[0]===p[0]))out.push('quarta_sesta_irrisolta');
 if(next.inv===2&&!next.seventh&&degree(prev.pcs[0],key)!==0&&degree(prev.pcs[0],key)!==3)out.push('quarta_sesta_non_preparata');
 if(prev.pedalCadence&&prev.root===3&&prev.inv===2&&nextRootInPrev===0){for(let voice=1;voice<4;voice++)if(matches(p[voice],prev.pcs[0])||matches(p[voice],prev.pcs[1])){const delta=v[voice]-p[voice];if(delta>=0||delta< -2)out.push('pedale_plagale_irrisolto')}}
 if(prev.seventh){const target={0:3,1:4,2:5,4:0,5:1}[prev.root];if(nextRootInPrev!==target&&!(prev.root===4&&nextRootInPrev===5))out.push('settima_senza_risoluzione_armonica')}
 if(prev.root===4&&nextRootInPrev===3&&prev.inv===0&&next.inv===0)out.push('dominante_sottodominante');
 for(let i=0;i<4;i++){
  let delta=v[i]-p[i];if(Math.abs(delta)>12)out.push('salto_eccessivo');
  const prevDegree=degree(p[i],previousKey),nextDegree=degree(v[i],key);
  const prevLetter=previousKey!==key||prev.key?(prev.spellings?.[i]?.letterIndex??chromaticSpelling(p[i],previousKey).letterIndex):prevDegree,nextLetter=previousKey!==key||next.key?(next.spellings?.[i]?.letterIndex??chromaticSpelling(v[i],key).letterIndex):nextDegree;const diatonicSpan=Math.abs(nextLetter-prevLetter);
  if(Math.abs(delta)===3&&(diatonicSpan===1||diatonicSpan===6))out.push('seconda_aumentata');
  if(Math.abs(delta)===6&&mod((delta>0?nextLetter-prevLetter:prevLetter-nextLetter),7)===3)out.push('quarta_aumentata');
  if(matches(p[i],mod(pk.tonic+pk.steps[6],12))&&delta!==0&&delta!==1&&!(i===0&&next.octaveRule&&prev.root===4&&prev.inv===1&&!prev.seventh&&delta===-2&&next.homeKey===previousKey)&&!bachResolution(prev,next,i,previousKey))out.push('sensibile_irrisolta');
  if(prev.seventh&&matches(p[i],prev.pcs[3])&&!(delta<0&&Math.abs(delta)<=2&&mod(chromaticSpelling(p[i],previousKey).letterIndex-chromaticSpelling(v[i],key).letterIndex,7)===1))out.push('settima_irrisolta');
  for(let j=i+1;j<4;j++){
   const d1=mod(p[j]-p[i],12),d2=mod(v[j]-v[i],12);const di=Math.sign(v[i]-p[i]),dj=Math.sign(v[j]-p[j]);
   if(di&&di===dj){
    if(d1===d2&&(d2===0||d2===7))out.push(d2===7?'quinte_parallele':'ottave_parallele');
    if(d1!==d2&&(d2===0||d2===7)){
     const upperStep=Math.abs(v[j]-p[j])<=2,lowerStep=Math.abs(v[i]-p[i])<=2;
     if((d2===0&&!upperStep)||(d2===7&&!upperStep&&!lowerStep))out.push(d2===7?'quinta_nascosta':'ottava_nascosta');
    }
   }
  }
 }
 if(sameKey&&prev.root===1&&prev.inv===0&&next.root===4&&next.inv===0&&mod(next.pcs[0]-prev.pcs[0],12)===5&&v[0]>p[0]){
  if([1,2,3].some(i=>v[i]>=p[i]))out.push('ii_v');
 }
 if(prev.root===4&&nextRootInPrev===5&&next.inv===0){const third=next.pcs[1];if(count[1]!==2)out.push('v_vi_raddoppio');}
 return [...new Set(out)];
}
// A written dominant followed by the tonic is a cadence candidate, never a bass correction.
export function isRootCadence(prev,next,key){
 const local=next?.key||key;
 return !!prev&&(!prev.key||prev.key===local)&&prev.secondaryDegree===undefined&&next.secondaryDegree===undefined&&prev.root===4&&prev.inv===0&&next.root===0&&next.inv===0&&!next.seventh;
}
export function cadencePathClass(length,key){return (path,c,i)=>Number(c.seventh||!!(path?.category&1))+(i===length-1&&isRootCadence(path?.c,c,key)?2:0)}
export function preferClosingCadence(paths,key){const cadences=paths.filter(p=>isRootCadence(p.items.at(-2),p.items.at(-1),key));return cadences.length?cadences:paths}
export function harmonize({bass,key='Do maggiore',level=1,locks={},limit=4,seventhsEnabled=level>=3,allowedSevenths=[4],durations=[],starts=[],meter='4/4',onProgress}){
 if(!KEYS[key])throw Error('Tonalità non disponibile');if(!Array.isArray(bass)||!bass.length)throw Error('Inserisci almeno una nota di basso');
 if(bass.some(n=>!Number.isInteger(n)||degree(n,key)<0))throw Error('Il basso deve contenere note della tonalità');
 const options={seventhsEnabled,allowedSevenths},[beats,denominator]=meter.split('/').map(Number),bar=beats*64/denominator,minimumPreparationUnits=denominator===8&&beats%3===0?24:64/denominator;
 const onsets=starts.length===bass.length?starts:bass.map((_,i)=>i*16);
 const phraseEnd=i=>i===bass.length-1||Math.floor(onsets[i+1]/bar)>Math.floor(onsets[i]/bar);
 const phraseStart=i=>i===0||phraseEnd(i-1);
 const context=i=>({preparationUnits:durations[i-1],minimumPreparationUnits});
 const finalValid=c=>!c.seventh&&!(c.root===0&&c.inv===2);
 // Preferenze stilistiche, non regole rigide: il basso o le note bloccate possono imporre altri accordi.
 const chordCost=(c,i)=>{
  let cost=[0,2,18,2,0,8,18][c.root]+[0,4,10,14][c.inv]+(c.seventh?2:0);
  // I rivolti di V7 sono disponibili, ma un accordo di passaggio non diventa
  // dominante a ogni grado del basso soltanto per il costo locale più basso.
  if(c.seventh&&c.root===4&&c.inv>0)cost+=4;
  if(c.seventh&&c.root===4&&c.inv===2)cost+=2;
  if(c.root===2&&c.inv===1)cost+=10;
  if(c.root===5&&c.inv===1)cost+=12;
  if(c.root===6&&c.inv===1)cost+=8;
  if(phraseStart(i)&&i>0&&c.inv>0)cost+=8;
  if(degree(bass[i],key)===0&&(phraseStart(i)||phraseEnd(i))){cost+=c.root===0?c.inv===0?-12:8:32}
  if(phraseEnd(i)&&degree(bass[i],key)!==0&&c.root===4)cost-=8; // semicadenza
  return cost;
 };
 const transitionCost=(path,c,i)=>{
  const prev=path.items?.at(-1)||path.c,prior=path.items?.at(-2)||path.prev?.c;
  const progression={0:{1:-5,3:-5,4:-2,5:0},1:{3:0,4:-9},2:{5:-3},3:{0:-3,1:0,4:-9},4:{0:-13,5:-3},5:{0:2,1:-5,3:-3,4:-2},6:{0:-6}};
  let cost=progression[prev.root]?.[c.root]??(prev.root===c.root?3:7);
  if(prev.root===4&&c.root===2)cost+=18;
  if(prev.root===4&&c.root===3)cost+=18;
  if((prev.root===1||prev.root===3)&&c.root===2)cost+=9;
  if(prior?.root===1&&prev.root===4&&c.root===0)cost-=15;
  if(prior?.root===3&&prev.root===4&&c.root===0)cost-=13;
  if(phraseEnd(i)&&c.root===0&&c.inv===0){if(prev.root===4)cost-=24;else if(prev.root===3)cost-=8}
  return cost;
 };
 const scoreNext=(path,c,i)=>{const prev=path.items?.at(-1)||path.c,motion=c.voices.slice(1).reduce((s,n,j)=>s+Math.abs(n-prev.voices[j+1]),0),common=c.voices.slice(1).filter((n,j)=>n===prev.voices[j+1]).length;return path.cost+c.score+motion*.2-common*1.2+chordCost(c,i)+transitionCost(path,c,i)};
 const octave=bass.some((_,i)=>octaveCandidates({bass,key,level,seventhsEnabled,allowedSevenths,locks},i).length);
 const pools=bass.map((n,i)=>[...possibleAt(n,key,level,locks[i]||{},options,Infinity).map(c=>octave?{...c,key,spellings:c.voices.map(n=>chromaticSpelling(n,key))}:c),...octaveCandidates({bass,key,level,seventhsEnabled,allowedSevenths,locks},i)]);
 const searched=solveVoicingLayers({pools,limit,initialValid:c=>!issues(null,c,key,level).length,
  edge:(p,c,i)=>!issues(p,c,key,level,context(i)).length,
  edgeContext:i=>JSON.stringify([durations[i-1],minimumPreparationUnits]),
  cost:(path,c,i)=>path?scoreNext(path,c,i):c.score+chordCost(c,0),finalValid,
  onProgress,pathClass:cadencePathClass(bass.length,key)});
 const unique=new Set(),candidates=preferClosingCadence(searched.paths,key);
 const filtered=candidates.filter(p=>{const id=p.items.map(x=>x.voices.join('.')).join('|');if(unique.has(id))return false;unique.add(id);return true}).sort((a,b)=>a.cost-b.cost);
 const eligible=filtered.length?filtered.filter(p=>p.cost<=filtered[0].cost+Math.max(16,bass.length*2)):[];
 const selected=[];if(eligible.length)selected.push(eligible[0]);
 if(level>=3&&seventhsEnabled){let withSeventh=eligible.find(p=>p.items.some(c=>c.seventh));if(withSeventh&&!selected.includes(withSeventh))selected.push(withSeventh)}
 const signatures=new Set(selected.map(p=>p.items.map(c=>`${c.root}.${c.inv}.${c.seventh}`).join('|')));
 for(const p of eligible){if(selected.length>=limit)break;const sig=p.items.map(c=>`${c.root}.${c.inv}.${c.seventh}`).join('|');if(!selected.includes(p)&&!signatures.has(sig)){selected.push(p);signatures.add(sig)}}
 for(const p of eligible){if(selected.length>=limit)break;if(!selected.includes(p))selected.push(p)}
 return selected.slice(0,limit).map(p=>p.items);
}
export function diagnoseNoSolution({bass,key,level=1,locks={},seventhsEnabled=level>=3,allowedSevenths=[4],durations=[],starts=[],meter='4/4'}){
 const base={bass,key,level,seventhsEnabled,allowedSevenths,durations,starts,meter,limit:1};
 if(Object.values(locks).some(voices=>Object.keys(voices).length)&&harmonize({...base,locks:{}}).length)
  return {message:'Le note bloccate impediscono questa armonizzazione. Sbloccane una e riprova.'};
 for(let nextLevel=level+1;nextLevel<=3;nextLevel++){
  const solution=harmonize({...base,level:nextLevel,locks,seventhsEnabled:nextLevel>=3&&seventhsEnabled})[0];
  if(solution){
   const i=solution.findIndex(c=>c.inv>0||c.seventh),figure=i>=0?`${label(solution[i])} sulla nota ${i+1} (${pitchName(bass[i],key)})`:'gli accordi ammessi';
   return {message:`Il livello ${level} esclude ${figure}. Il livello ${nextLevel} trova una soluzione: ${solution.map(label).join('–')}.`,alternativeLevel:nextLevel};
  }
 }
 const leading=bass.findIndex((n,i)=>i<bass.length-1&&degree(n,key)===6&&bass[i+1]!==n&&bass[i+1]!==n+1);
 if(leading>=0){
  const alternativeKey=Object.keys(KEYS).find(candidate=>candidate!==key&&bass.every(n=>degree(n,candidate)>=0)&&harmonize({...base,key:candidate,locks:{}}).length);
  const motion=bass[leading+1]<bass[leading]?'scende a':'si sposta su';
  return {message:`Errore tra le note ${leading+1} e ${leading+2}: ${pitchName(bass[leading],key)} → ${pitchName(bass[leading+1],key)}. In ${key}, ${pitchName(bass[leading],key)} è la sensibile: nel profilo adottato deve salire a ${pitchName(bass[leading]+1,key)}, non ${motion} ${pitchName(bass[leading+1],key)} (Giannetta, §3.3, p. 19). Prova a correggere la seconda nota${alternativeKey?` oppure scegli ${alternativeKey}, dove l'intero basso è armonizzabile`: ' oppure verifica la tonalità scelta'}.`,alternativeKey};
 }
 const leap=bass.findIndex((n,i)=>i<bass.length-1&&Math.abs(bass[i+1]-n)>12);
 if(leap>=0)return {message:`Errore tra le note ${leap+1} e ${leap+2}: ${pitchName(bass[leap],key)} → ${pitchName(bass[leap+1],key)}. Il salto nel basso supera l'ottava consentita dal profilo. Prova una nota intermedia o un'ottava diversa.`};
 return {message:`Non è stata trovata una disposizione a quattro voci per queste ${bass.length} note in ${key}, livello ${level}. Le singole note possono appartenere alla tonalità, ma i collegamenti disponibili non rispettano tutti i vincoli. Controlla i blocchi sulle voci, i rivolti ammessi e la tonalità.`};
}
export function checkExercise(items,key='Do maggiore',level=3){let violations=[];for(let i=0;i<items.length;i++)for(const id of issues(items[i-1],items[i],key,level))violations.push({index:i,id,rule:RULES.find(r=>id.includes('parallel')?r.id==='parallele':id.includes('nascosta')?r.id==='nascoste':id.includes('sensibile')?r.id==='sensibile':id==='ii_v'?r.id==='ii_v':id==='settima_irrisolta'?r.id==='settima':id==='v_vi_raddoppio'?r.id==='v_vi':r.id==='funzioni')});return violations;}
export function candidateForVoices(voices,key,level=3,options={}){const b=voices[0];return possibleAt(b,key,level,{},options,Infinity).find(c=>c.voices.every((v,i)=>v===voices[i]))||null;}
export function label(c){if(c.tonicizedDegree!==undefined)return label({...c,tonicizedDegree:undefined})+'/'+['I','II','III','IV','V','VI','VII'][c.tonicizedDegree];if(c.secondaryDegree!==undefined){const figure=c.seventh?['7','65','43','42'][c.inv]:['','6','64'][c.inv];return `V${figure}/${['I','II','III','IV','V','VI','VII'][c.secondaryDegree]}`}const roman=['I','II','III','IV','V','VI','VII'][c.root];return roman+(c.seventh?['7','65','43','42'][c.inv]:['','6','64'][c.inv]);}

// Spelling uses the local key, while the written signature can stay unchanged.
export function chromaticSpelling(n,key='Do maggiore') {
 const exact=noteSpelling(n,key);if(exact)return {...exact,letterIndex:LETTERS.indexOf(exact.letter)};
 const k=KEYS[key],candidates=[];
 for(let li=0;li<7;li++)for(let octave=0;octave<=8;octave++){const natural=12*(octave+1)+NATURAL[li],alter=n-natural;if(Math.abs(alter)>2)continue;
 const keyName=k.names[mod(li-k.letterIndex,7)],keyAlter=ACCIDENTAL[keyName.replace(LETTERS[li],'')]||0;
 candidates.push({letter:LETTERS[li],letterIndex:li,octave,alter,degree:mod(li-k.letterIndex,7),cost:Math.abs(alter-keyAlter)*2+Math.abs(alter)+(k.minor&&li===mod(k.letterIndex+6,7)?-1:0)});}
 return candidates.sort((a,b)=>a.cost-b.cost)[0];
}
export function chromaticName(n,key='Do maggiore'){const p=chromaticSpelling(n,key);return p.letter+symbol(p.alter)+p.octave}
