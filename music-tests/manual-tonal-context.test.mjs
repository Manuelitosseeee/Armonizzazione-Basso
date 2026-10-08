import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {harmonizeTonal,tonalIssues,normalizeTonalEvents} from '../sito/public/app/tonal.mjs';
import {label} from '../sito/public/app/engine.mjs';
const input=JSON.parse(fs.readFileSync(new URL('./fixtures/basso-73-modulazioni.json',import.meta.url)));
const check=(r,args)=>{
 assert.ok(r.solutions.length,r.diagnosis);
 for(const s of r.solutions){assert.equal(s.length,args.bass.length);assert.deepEqual(s.map(c=>c.voices[0]),args.bass);
  s.forEach((c,i)=>assert.deepEqual(tonalIssues(s[i-1],c,args.key,args.level,{preparationUnits:args.durations[i-1],minimumPreparationUnits:16}),[],`Nota ${i+1}`));
 }
};
test('diagnosi reale: tutte le 73 note, sei modulazioni e V–I 24–25 senza modificare il basso',()=>{
 const args=structuredClone(input),before=structuredClone(args),r=harmonizeTonal(args);check(r,args);assert.deepEqual(args,before);assert.equal(r.solutions.length,4);
 for(const s of r.solutions){assert.deepEqual(s.slice(23,25).map(label),['V','I']);assert.equal(s[23].tonalConfirmationMode,'manual');assert.deepEqual(s.filter(c=>c.tonalEvent).map(c=>c.tonalEvent.key),args.tonalEvents.map(e=>e.key));}
});
test('conferma manuale su dominante: V–I disponibile in maggiore e minore senza forzare I64',()=>{
 for(const [key,bass,destination] of [['Re maggiore',[50,55,54,47],'Si minore'],['Do maggiore',[48,55,50,43],'Sol maggiore']]){
  const args={bass,key,level:3,seventhsEnabled:false,modulationMode:'manual',durations:bass.map(()=>16),tonalEvents:[{kind:'modulation',index:1,confirm:2,key:destination,manualChoice:true,arrivalMode:'tonic'}]},before=structuredClone(args),r=harmonizeTonal(args);check(r,args);assert.deepEqual(args,before);assert.deepEqual(r.solutions[0].slice(-2).map(label),['V','I']);
 }
});
test('normalizzazione compatibile con eventi salvati, senza mutarli; cadenze esplicite restano obblighi',()=>{
 const events=[{kind:'modulation',index:1,confirm:2,key:'Si minore',manualChoice:true,arrivalMode:'tonic'}],before=structuredClone(events),r=normalizeTonalEvents(events,'Re maggiore');
 assert.equal(r.events[0].arrivalMode,'manual');assert.equal(r.events[0].arrivalConstraint,'context');assert.deepEqual(events,before);
 for(const override of [{arrivalMode:'cadence'},{arrivalConstraint:'tonic'}]){
  const e={...events[0],...override};assert.equal(normalizeTonalEvents([e],'Re maggiore').events[0].arrivalMode,e.arrivalMode);
  const r=harmonizeTonal({bass:[50,55,54,47],key:'Re maggiore',level:3,modulationMode:'manual',tonalEvents:[e]});assert.equal(r.solutions.length,0);
 }
});
