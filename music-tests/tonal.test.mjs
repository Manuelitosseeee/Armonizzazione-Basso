import test from 'node:test';
import assert from 'node:assert/strict';
import {KEYS,label} from '../sito/public/app/engine.mjs';
import {closeKeys,generateTonalBass,harmonizeTonal,tonalIssues,readingLabel} from '../sito/public/app/tonal.mjs';
import {musicXML} from '../sito/public/app/notation.mjs';
const base={key:'Do maggiore',level:3,seventhsEnabled:true,allowedSevenths:[1,4]};
const check=sol=>{for(let i=0;i<sol.length;i++)assert.deepEqual(tonalIssues(sol[i-1],sol[i],sol[i].homeKey,3),[],`nota ${i+1}: ${sol.map(label).join('–')}`)};
test('V7/V risolve sul V senza dichiarare una modulazione',()=>{
 const r=harmonizeTonal({...base,bass:[48,50,55,48],secondaryEnabled:true,tonalEvents:[{kind:'tonicization',index:1,degree:4,figure:'V7'}]});
 assert.ok(r.solutions.length);for(const s of r.solutions){assert.equal(label(s[1]),'V7/V');assert.equal(s[2].root,4);assert.ok(!s.some(c=>c.tonalEvent));check(s)}
});
test('sensibile temporanea e settima non perdono gli obblighi di risoluzione',()=>{
 const s=harmonizeTonal({...base,bass:[48,50,55,48],tonalEvents:[{kind:'tonicization',index:1,degree:4,figure:'V7'}]}).solutions[0];
 const leading=s[1].voices.findIndex(n=>n%12===6),seventh=s[1].voices.findIndex(n=>n%12===0);
 assert.equal(s[2].voices[leading],s[1].voices[leading]+1);
 assert.ok(s[2].voices[seventh]<s[1].voices[seventh]);
 const bad={...s[2],voices:[...s[2].voices]};bad.voices[leading]=s[1].voices[leading]+2;
 assert.ok(tonalIssues(s[1],bad,base.key).includes('sensibile_irrisolta'));
});
test('V65–I e V42–I6 dello schema conservano tonalità locale e conferma',()=>{
 for(const [bass,key,index,confirm,figure] of [
  [[48,60,57,54,55],'Sol maggiore',3,4,'V65'],
  [[48,60,58,57,53,60,53],'Fa maggiore',2,3,'V42']
 ]){const r=harmonizeTonal({...base,bass,tonalEvents:[{kind:'modulation',index,key,confirm,figure}]});assert.ok(r.solutions.length,r.diagnosis);for(const s of r.solutions){assert.equal(label(s[index]),figure);assert.equal(s[confirm].confirmedKey,key);check(s)}}
});
test('modulazione con conferma incompatibile e nota bloccata dà zero risultati spiegati',()=>{
 const r=harmonizeTonal({...base,bass:[48,50,55,48],locks:{2:{3:61}},tonalEvents:[{kind:'tonicization',index:1,degree:4}]});assert.equal(r.solutions.length,0);assert.match(r.diagnosis,/note 2 e 3/);
 const impossible=harmonizeTonal({...base,bass:[48,50,55,48],tonalEvents:[{kind:'modulation',index:1,key:'Sol maggiore',confirm:3}]});assert.equal(impossible.solutions.length,0);assert.match(impossible.diagnosis,/conferma|chiusura|accordo/);
});
test('le settime escluse e il livello restano vincoli anche per dominanti secondarie',()=>{
 const args={...base,bass:[48,50,55,48],tonalEvents:[{kind:'tonicization',index:1,degree:4,figure:'V7'}]};
 assert.equal(harmonizeTonal({...args,seventhsEnabled:false}).solutions.length,0);
 assert.equal(harmonizeTonal({...args,allowedSevenths:[1]}).solutions.length,0);
 assert.equal(harmonizeTonal({...args,level:2}).solutions.length,0);
});
test('gli indizi senza alterazioni e la terza inferiore producono letture alternative',()=>{
 for(const bass of [[48,60,57,59,52],[48,60,59,57]]){const r=harmonizeTonal({...base,bass,secondaryEnabled:true,modulationMode:'auto'});assert.ok(r.solutions.length);assert.ok(r.solutions.some(s=>s.some(c=>c.tonalEvent)));assert.ok(r.solutions.some(s=>!s.some(c=>c.tonalEvent)));for(const s of r.solutions)check(s)}
});
test('basso legato che non torna a tono: V42–I6 in Sol, schema pagina 3',()=>{
 const r=harmonizeTonal({...base,bass:[48,60,60,59,55],tonalEvents:[{kind:'modulation',index:2,key:'Sol maggiore',confirm:3}]});assert.ok(r.solutions.length,r.diagnosis);assert.equal(label(r.solutions[0][2]),'V42');assert.equal(label(r.solutions[0][3]),'I6');check(r.solutions[0]);
});
test('il generatore verifica il percorso in tonalità maggiori e minori trasposte',()=>{
 for(const key of ['Do maggiore','Re maggiore','Mi♭ maggiore','Sol minore']){
  const destinations=closeKeys(key).filter(k=>KEYS[k].minor!==KEYS[key].minor).slice(0,2);
  for(const destination of destinations){const r=generateTonalBass({...base,key,destination,returnHome:true});assert.ok(r.solutions.length);for(const s of r.solutions){check(s);assert.equal(s.at(-1).key,key);assert.equal(s.filter(c=>c.tonalEvent).length,2)}}
 }
 for(const d of [1,2,3,4,5]){const r=generateTonalBass({...base,secondaryEnabled:true,secondaryTargets:[d]});assert.ok(r.solutions[0].some(c=>c.secondaryDegree===d));check(r.solutions[0])}
});
test('toni lontani e transizioni sovrapposte sono rifiutati esplicitamente',()=>{
 assert.throws(()=>harmonizeTonal({...base,bass:[48,50,55,48],tonalEvents:[{kind:'modulation',index:1,key:'Fa♯ maggiore',confirm:3}]}),/non è un tono vicino/);
 assert.throws(()=>harmonizeTonal({...base,bass:[48,50,55,48,53,48],tonalEvents:[{kind:'modulation',index:1,key:'Sol maggiore',confirm:3},{kind:'modulation',index:2,key:'Do maggiore',confirm:5}]}),/sovrapporsi/);
});
test('MusicXML conserva cromatismi, gradi e annotazioni tonali',()=>{
 const bass=[48,50,55,48],solutions=harmonizeTonal({...base,bass,tonalEvents:[{kind:'tonicization',index:1,degree:4,figure:'V7'}]}).solutions[0];
 const events=bass.map((midi,i)=>({midi,start:i*16,duration:'quarter',kind:'note',accidental:'key'})),xml=musicXML({events,solutions,key:base.key,meter:'4/4'});
 assert.match(xml,/<step>F<\/step><alter>1<\/alter>/);assert.match(xml,/V7 del V/);assert.doesNotMatch(xml,/Tonicizzazione: Sol maggiore/);assert.match(xml,/<staves>2<\/staves>/);
});

test('tonicizzazione estesa ha gradi relativi e ritorna alla tonalità principale',()=>{
 const r=harmonizeTonal({...base,bass:[48,57,50,55,48],tonalEvents:[{kind:'extendedTonicization',index:1,degree:4,confirm:3}]});assert.ok(r.solutions.length,r.diagnosis);for(const s of r.solutions){assert.deepEqual(s.slice(1,4).map(label),['II/V','V/V','I/V']);assert.ok(!s.some(c=>c.tonalEvent));assert.equal(s[4].key,'Do maggiore');check(s)}
});

test('una nota scritta non viene reinterpretata enarmonicamente senza consenso',()=>{
 const args={key:'Si maggiore',level:3,seventhsEnabled:true,bass:[47,48,49],tonalEvents:[{kind:'modulation',index:1,key:'Do♯ minore',confirm:2}]};
 const valid=harmonizeTonal(args);assert.ok(valid.solutions.length,valid.diagnosis);
 const wrong=harmonizeTonal({...args,bassSpellings:[null,{letter:'Do',alter:0,octave:3},null]});assert.equal(wrong.solutions.length,0);
});

test('Fa diesis in Do propone VII di Sol e II di Mi; Si bemolle propone IV di Fa e VI di Re',async()=>{
 const {alterationCandidates}=await import('../sito/public/app/tonal.mjs');
 assert.deepEqual(alterationCandidates({midi:54,spelling:{letter:'Fa',alter:1},key:'Do maggiore'}).map(c=>[c.key,c.role]),[['Sol maggiore','VII'],['Mi minore','II']]);
 assert.deepEqual(alterationCandidates({midi:58,spelling:{letter:'Si',alter:-1},key:'Do maggiore'}).map(c=>[c.key,c.role]),[['Fa maggiore','IV'],['Re minore','VI']]);
 assert.ok(alterationCandidates({midi:58,key:'Do maggiore'}).some(c=>c.key==='Fa maggiore'));
});

test('il bequadro è crescente o decrescente rispetto alla nuova armatura locale',async()=>{
 const {alterationCandidates}=await import('../sito/public/app/tonal.mjs');
 assert.ok(alterationCandidates({midi:53,spelling:{letter:'Fa',alter:0},key:'Sol maggiore'}).some(c=>c.key==='Do maggiore'&&c.direction==='discendente'));
 assert.ok(alterationCandidates({midi:47,spelling:{letter:'Si',alter:0},key:'Fa maggiore'}).some(c=>c.key==='Do maggiore'&&c.direction==='ascendente'));
});

test('l andamento del basso distingue Fa diesis sensibile da Fa diesis II minore',async()=>{
 const {manualModulationCandidates}=await import('../sito/public/app/tonal.mjs');
 let c=manualModulationCandidates({bass:[48,54,55],key:'Do maggiore'},1,2);assert.equal(c[0].key,'Sol maggiore');
 c=manualModulationCandidates({bass:[48,54,59,52],key:'Do maggiore'},1,3);assert.equal(c[0].key,'Mi minore');
 assert.equal(manualModulationCandidates({bass:[48,54,56],key:'Do maggiore'},1,2).length,0);
});

test('basso dell immagine: riconosce quattro cambi e i ritorni; la regola è trasponibile',async()=>{
 const bass=[48,60,57,53,50,55,48,60,57,54,55,52,48,50,43,53,52,48,50,55,48,58,57,53,55,60,53,52,53,57,60,58,57,53,50,47,48,52,50,55,48,53,48];
 for(const [shift,key,expected]of[[0,'Do maggiore',['Sol maggiore','Do maggiore','Fa maggiore','Do maggiore']],[2,'Re maggiore',['La maggiore','Re maggiore','Sol maggiore','Re maggiore']]]){
 const r=harmonizeTonal({...base,key,bass:bass.map(n=>n+shift),secondaryEnabled:true,modulationMode:'auto',maxModulations:12});assert.ok(r.solutions.length,r.diagnosis);assert.deepEqual(r.solutions[0].filter(c=>c.tonalEvent).map(c=>c.key),expected);check(r.solutions[0]);
 }
});

test('rientri discendenti con sole triadi: Sol2–Fa3 non forza V42',()=>{
 const bass=[48,60,57,53,50,55,48,60,57,54,55,52,48,50,43,53,52,48,50,55,48,58,57,53,55,60,53,52,53,57,60,58,57,53,50,47,48,52,50,55,48,53,48];
 for(const shift of [0,2]){
 const key=shift?'Re maggiore':'Do maggiore',args={...base,key,bass:bass.map(n=>n+shift),seventhsEnabled:false,secondaryEnabled:false,modulationMode:'auto'};
 for(const tonalEvents of [[],[{kind:'modulation',index:9,key:shift?'La maggiore':'Sol maggiore',confirm:10}]]){
 const r=harmonizeTonal({...args,tonalEvents});assert.ok(r.solutions.length,r.diagnosis);for(const s of r.solutions){check(s);assert.ok(s.every(c=>!c.seventh));assert.equal(s[15].key,key);assert.ok(s[15].tonalEvent);}
 }
 }
});

test('diagnosi distingue nota fuori tonalità da collegamento e usa il tono locale',()=>{
 const r=harmonizeTonal({...base,bass:[48,54,55,43,53,52,48],seventhsEnabled:false,tonalEvents:[{kind:'modulation',index:1,key:'Sol maggiore',confirm:2}]});
 assert.equal(r.solutions.length,0);assert.match(r.diagnosis,/Sol2 → Fa3/);assert.match(r.diagnosis,/non appartiene alla tonalità locale Sol maggiore/);assert.doesNotMatch(r.diagnosis,/spostare o eliminare/);
});
