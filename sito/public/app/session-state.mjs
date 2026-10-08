import {KEYS} from './engine.mjs';
import {expandHarmony} from './harmonic-rhythm.mjs';
import {fillMeasures} from './notation.mjs';
export function validMeter(value){const match=/^(\d{1,2})\/(1|2|4|8|16|32|64)$/.exec(String(value));return !!match&&Number(match[1])>=1&&Number(match[1])<=32;}
export function restoredManual(solution,events){
 const notes=events.filter(e=>e.kind==='note').sort((a,b)=>a.start-b.start);if(!Array.isArray(solution)||solution.length!==notes.length||!notes.length)return null;
 const valid=c=>c&&Array.isArray(c.voices)&&c.voices.length===4&&c.voices.every(n=>Number.isInteger(n)&&n>=0&&n<=127)&&Number.isInteger(c.root)&&c.root>=0&&c.root<=6&&Number.isInteger(c.inv)&&c.inv>=0&&c.inv<=3&&Array.isArray(c.pcs)&&c.pcs.length>2&&c.pcs.length<5&&c.pcs.every(n=>Number.isInteger(n)&&n>=0&&n<12)&&(!c.key||KEYS[c.key]);
 if(solution.some((c,i)=>!valid(c)||c.voices[0]!==notes[i].midi||c.segments&&(c.segments.length>16||!c.segments.length||c.segments.some(s=>!valid(s)||s.voices[0]!==notes[i].midi))))return null;
 try{expandHarmony(events,solution);return structuredClone(solution)}catch{return null}
}
export function validateSavedEvents(events,meter){try{if(events.length>5000||events.some(e=>!Number.isInteger(e.start)||e.start<0||e.kind==='note'&&(!Number.isInteger(e.midi)||e.midi<0||e.midi>127)))return false;fillMeasures(events,meter);return true}catch{return false}}
