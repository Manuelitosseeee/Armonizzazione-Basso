import {KEYS} from './engine.mjs';
import {harmonizeTonal,closeKeys,tonicizedKey} from './tonal.mjs';
export function generationKeys(key){const near=closeKeys(key);return {near,others:Object.keys(KEYS).filter(k=>k!==key&&!near.includes(k))}}
export function generateMeteredBass({bars=2,meter='4/4',key='Do maggiore',modulations=[],variation=0,...options}){
 const [beats,den]=meter.split('/').map(Number),unit=64/den,count=bars*beats;
 if(!KEYS[key]||!Number.isInteger(bars)||bars<1||bars>128||!Number.isInteger(beats)||beats<1||!Number.isInteger(unit))throw Error('Scegli da 1 a 128 battute e una metrica valida.');
 const duration=({1:'whole',2:'half',4:'quarter',8:'eighth',16:'16th'})[den];if(!duration)throw Error('Metrica non disponibile per il generatore.');
 const changes=modulations.map(e=>({...e,index:(e.bar-1)*beats+(e.position-1)})).sort((a,b)=>a.index-b.index);
 for(let j=0;j<changes.length;j++){const e=changes[j];if(!KEYS[e.key]||!Number.isInteger(e.bar)||!Number.isInteger(e.position)||e.bar<1||e.bar>bars||e.position<1||e.position>beats||e.index<1)throw Error('Scegli una modulazione dopo la prima nota, dentro le battute richieste.');if(j&&e.index-changes[j-1].index<3)throw Error('Lascia almeno tre posizioni tra due modulazioni per preparare la cadenza.');if(e.index+1>=count)throw Error('Lascia almeno due posizioni per la modulazione e il suo arrivo.');}
 const roots=[0,3,4,0],pick=(k,d,anchor,attempt)=>{let n=KEYS[k].tonic-24+KEYS[k].steps[d];while(n<40)n+=12;while(n>60)n-=12;if(attempt>1){const choices=[n-12,n,n+12].filter(x=>x>=40&&x<=60);choices.sort((a,b)=>Math.abs(a-anchor)-Math.abs(b-anchor));n=choices[attempt%choices.length]}return n};
 let lastFailure;
 for(let attempt=0;attempt<4;attempt++){
  const bass=[],events=[],tonalEvents=[];let active=key,segment=0,anchor=48;
  const entry=new Map();for(const e of changes){const room=count-e.index,pre=room>=3;entry.set(e.index,{...e,pre});tonalEvents.push({kind:'modulation',index:e.index,confirm:e.index+(pre?2:1),key:e.key,manualChoice:true,arrivalMode:'cadence'});}
  for(let i=0;i<count;i++){
   const e=entry.get(i);if(e){active=e.key;segment=i;}
   const current=changes.findLast(e=>e.index<=i),offset=i-segment;
   let d=roots[(offset+variation%2)%4];
   if(i===0)d=0;
   if(current&&offset<3){const pre=count-current.index>=3;d=pre?[KEYS[active].minor||attempt%2?3:1,4,0][offset]:[4,0,0][offset];}
   // A phrase closes in its current key before the next transition.
   if(i===count-1)d=0;
   if(i===count-2&&!entry.has(i)&&!entry.has(i+1)&&!(current&&offset<3))d=4;
   const n=pick(active,d,anchor,attempt);bass.push(n);anchor=n;events.push({start:i*unit,midi:n,kind:'note',duration,accidental:'key'});
  }
  if(options.secondaryEnabled&&!changes.length&&count>=6){
   const choices=(KEYS[key].minor?[3,4,5]:[1,2,3,4,5]).filter(d=>(options.secondaryTargets||[1,2,3,4,5]).includes(d));
   if(!choices.length)throw Error('Seleziona almeno un grado tonicizzabile.');
   const d=choices[(variation+attempt)%choices.length],target=tonicizedKey(key,d),index=count-4;
   bass[index]=pick(target,4,bass[index-1],attempt);bass[index+1]=pick(key,d,bass[index],attempt);events[index].midi=bass[index];events[index+1].midi=bass[index+1];tonalEvents.push({kind:'tonicization',index,degree:d});
  }
  const durations=bass.map(()=>unit),starts=events.map(e=>e.start);
  const r=harmonizeTonal({...options,key,bass,meter,durations,starts,tonalEvents,modulationMode:'manual'});
  if(r.solutions.length)return {bass,events,tonalEvents,measureCount:bars,solutions:r.solutions};
  lastFailure=r.diagnosis;
 }
 throw Error(`Non ho trovato un basso verificato per questo percorso. ${lastFailure||'Prova una diversa posizione della modulazione.'}`);
}
