import {KEYS} from './engine.mjs';
import {UNITS,eventUnits,fillMeasures,validTies} from './notation.mjs';
export const LETTERS={Do:0,Re:2,Mi:4,Fa:5,Sol:7,La:9,Si:11};
export function reviewMidi({letter,alter,octave}){
 const a=Number(alter),o=Number(octave);if(!(letter in LETTERS)||!Number.isInteger(a)||Math.abs(a)>2||!Number.isInteger(o))throw Error('Altezza non valida.');
 const midi=(o+1)*12+LETTERS[letter]+a;if(midi<0||midi>127)throw Error('Altezza fuori dal registro MIDI.');return midi;
}
export function inspectImport({events,key,meter,measureCount=1}){
 if(!KEYS[key])throw Error('Scegli una tonalità valida.');
 const [b,d]=String(meter).split('/').map(Number),bar=b*64/d;
 if(!Number.isInteger(b)||b<1||b>32||![1,2,4,8,16,32,64].includes(d)||!Number.isInteger(bar))throw Error('Metrica non valida.');
 if(!events.length||!events.some(e=>e.kind==='note'))throw Error('Il basso deve contenere almeno una nota.');
 const sorted=events.map(e=>({...e})).sort((a,b)=>a.start-b.start);
 if(sorted.length>5000)throw Error('Troppi eventi: importa un tratto più corto.');
 for(const [i,e]of sorted.entries()){
  if(!Number.isInteger(e.start)||e.start<0||!['note','rest'].includes(e.kind)||!UNITS[e.duration]||!Number.isInteger(eventUnits(e)))throw Error(`Evento ${i+1}: posizione o durata non valida.`);
  if(e.kind==='note'&&(!Number.isInteger(e.midi)||e.midi<0||e.midi>127))throw Error(`Evento ${i+1}: altezza non valida.`);
 }
 const total=Math.max(measureCount,Math.ceil(Math.max(...sorted.map(e=>e.start+eventUnits(e)))/bar));
 if(total>1000)throw Error('Troppe battute: importa un tratto più corto.');
 fillMeasures(sorted,meter,total);validTies(sorted);
 const gaps=[];for(let m=0;m<total;m++){const used=sorted.filter(e=>Math.floor(e.start/bar)===m).reduce((n,e)=>n+eventUnits(e),0);if(used<bar)gaps.push(m+1)}
 return {events:sorted,key,meter,measureCount:total,warnings:gaps.length?[`Battute incomplete: ${gaps.slice(0,15).join(', ')}${gaps.length>15?'…':''}. Gli spazi liberi saranno visualizzati come pause.`]:[]};
}
