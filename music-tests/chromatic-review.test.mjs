import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewChromaticModulations} from '../sito/public/app/chromatic-review.mjs';
import {KEYS} from '../sito/public/app/engine.mjs';
import {signatureAlter} from '../sito/public/app/tonal.mjs';
const p=(letter,alter,octave=3)=>({letter,alter,octave});
test('Fa diesis in Do propone Sol maggiore e Mi minore prima della conferma',()=>{
 const args={key:'Do maggiore',bass:[48,54,55,52],bassSpellings:[p('Do',0),p('Fa',1),p('Sol',0),p('Mi',0)]},before=structuredClone(args),r=reviewChromaticModulations(args);
 assert.equal(r.length,1);assert.deepEqual(new Set(r[0].candidates.map(c=>c.key)),new Set(['Sol maggiore','Mi minore']));assert.deepEqual(args,before);
});
test('prima e ultima nota cromatica sono incluse anche senza arrivo',()=>{
 const r=reviewChromaticModulations({key:'Do maggiore',bass:[54,48,54],bassSpellings:[p('Fa',1),p('Do',0),p('Fa',1)]});
 assert.deepEqual(r.map(x=>x.index),[0,2]);assert.equal(r[1].candidates.length,2);assert.ok(r[1].candidates.every(c=>c.confirm===null));
});
test('alterazione discendente propone due riferimenti e non diventa una modulazione certa',()=>{
 const r=reviewChromaticModulations({key:'Do maggiore',bass:[58],bassSpellings:[p('Si',-1)]});
 assert.equal(r.length,1);assert.equal(r[0].direction,'discendente');assert.deepEqual(new Set(r[0].candidates.map(c=>c.key)),new Set(['Fa maggiore','Re minore']));assert.ok(r[0].candidates.every(c=>c.uncertain));
});
test('sensibile della minore conserva come prima possibilità la tonalità corrente',()=>{
 const r=reviewChromaticModulations({key:'Do minore',bass:[59,60],bassSpellings:[p('Si',0),p('Do',0,4)]});
 assert.equal(r[0].candidates[0].key,'Do minore');assert.match(r[0].reason,/sensibile/);
});
test('bequadro ridondante non inventa cromatismi; quello che annulla la chiave viene rilevato',()=>{
 assert.equal(reviewChromaticModulations({key:'Do maggiore',bass:[48],bassSpellings:[p('Do',0)]}).length,0);
 const r=reviewChromaticModulations({key:'Re maggiore',bass:[48],bassSpellings:[p('Do',0)]});assert.equal(r.length,1);assert.equal(r[0].direction,'discendente');
});
test('ricalcolo usa tutti gli eventi tonali confermati e non perde i cromatismi del nuovo tono',()=>{
 const args={key:'Do maggiore',bass:[48,54,55,53],bassSpellings:[p('Do',0),p('Fa',1),p('Sol',0),p('Fa',0)],tonalEvents:[{kind:'modulation',index:1,confirm:2,key:'Sol maggiore'}]};
 const r=reviewChromaticModulations(args);assert.deepEqual(r.map(x=>x.index),[3]);assert.equal(r[0].localKey,'Sol maggiore');
});
test('tutte le tonalità, sette lettere e cinque alterazioni: nessuna nota fuori armatura scompare',()=>{
 const letters=['Do','Re','Mi','Fa','Sol','La','Si'],natural=[0,2,4,5,7,9,11];let checked=0;
 for(const key of Object.keys(KEYS))for(let i=0;i<7;i++)for(let alter=-2;alter<=2;alter++){
  const r=reviewChromaticModulations({key,bass:[48+natural[i]+alter],bassSpellings:[p(letters[i],alter)]});
  assert.equal(r.length,alter===signatureAlter(letters[i],key)?0:1,`${key} ${letters[i]} ${alter}`);
  if(r.length){assert.ok(r[0].candidates.length<=2);assert.equal(new Set(r[0].candidates.map(c=>c.key)).size,r[0].candidates.length);}
  checked++;
 }
 assert.equal(checked,1050);
});
test('tonicizzazione estesa usa l’armatura temporanea e torna al tono iniziale dopo la fine',()=>{
 const r=reviewChromaticModulations({key:'Do maggiore',bass:[54,55,53,53],bassSpellings:[p('Fa',1),p('Sol',0),p('Fa',0),p('Fa',0)],tonalEvents:[{kind:'extendedTonicization',index:0,confirm:2,degree:4}]});
 assert.deepEqual(r.map(x=>x.index),[2]);assert.equal(r[0].localKey,'Sol maggiore');
});
test('due conferme successive non ripropongono il cromatismo già approvato nella minore',()=>{
 const args={key:'Do maggiore',bass:[61,62,66,67],bassSpellings:[p('Do',1),p('Re',0),p('Fa',1),p('Sol',0)],tonalEvents:[{kind:'modulation',index:0,confirm:1,key:'Re minore'}]};
 const pending=reviewChromaticModulations(args);assert.ok(!pending.some(p=>p.index===0));assert.ok(pending.some(p=>p.index===2));
 args.tonalEvents.push({kind:'modulation',index:2,confirm:3,key:'Sol maggiore'});assert.deepEqual(reviewChromaticModulations(args),[]);
 args.tonalEvents.shift();assert.ok(reviewChromaticModulations(args).some(p=>p.index===0),'eliminare la conferma rende la nota di nuovo rivedibile');
});
