import test from 'node:test';import assert from 'node:assert/strict';
import {KEYS} from '../sito/public/app/engine.mjs';
import {closeKeys,generateTonalBass,tonalIssues} from '../sito/public/app/tonal.mjs';
const check=(s,args)=>{assert.deepEqual(s.map(c=>c.voices[0]),args.bass);for(let i=0;i<s.length;i++)assert.deepEqual(tonalIssues(s[i-1],s[i],args.key,3),[],`${args.key}, nota ${i+1}`)};
test('568 percorsi modulanti: tutte le tonalità vicine, triadi/settime, con e senza ritorno',()=>{
 let count=0;
 for(const key of Object.keys(KEYS))for(const destination of closeKeys(key))for(const seventhsEnabled of [false,true])for(const returnHome of [false,true]){
  const args={key,destination,seventhsEnabled,returnHome,level:3,allowedSevenths:[1,4]},r=generateTonalBass(args);assert.ok(r.solutions.length,`${key} → ${destination}`);assert.ok(r.bass.every(n=>n>=36&&n<=55));count++;
  for(const s of r.solutions){check(s,{...args,bass:r.bass});assert.equal(s.at(-1).key,returnHome?key:destination);assert.equal(s.filter(c=>c.tonalEvent).length,returnHome?2:1);assert.equal(s.at(-1).root,0);if(!seventhsEnabled)assert.ok(s.every(c=>!c.seventh));}
 }
 assert.equal(count,568);
});
test('240 tonicizzazioni: trenta tonalità e filtri settime, altezze e grafia conservate',()=>{
 let count=0;
 for(const key of Object.keys(KEYS))for(const d of (KEYS[key].minor?[3,4,5]:[1,2,3,4,5]))for(const seventhsEnabled of [false,true]){
  const args={key,secondaryEnabled:true,secondaryTargets:[d],level:3,seventhsEnabled,allowedSevenths:[1,4]},r=generateTonalBass(args);assert.ok(r.solutions.length,`${key}, grado ${d+1}`);count++;
  for(const s of r.solutions){check(s,{...args,bass:r.bass});assert.ok(s.some(c=>c.secondaryDegree===d));for(const c of s)for(let v=0;v<4;v++){const p=c.spellings[v],naturals={Do:0,Re:2,Mi:4,Fa:5,Sol:7,La:9,Si:11};assert.equal(12*(p.octave+1)+naturals[p.letter]+p.alter,c.voices[v]);assert.ok(Math.abs(p.alter)<=2);}}
 }
 assert.equal(count,240);
});
