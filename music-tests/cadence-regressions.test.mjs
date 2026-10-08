import test from 'node:test';
import assert from 'node:assert/strict';
import {KEYS,chromaticSpelling,possibleAt,issues,bachResolution,label} from '../sito/public/app/engine.mjs';
import {harmonizeTonal,tonalIssues} from '../sito/public/app/tonal.mjs';
import {solveVoicingLayers} from '../sito/public/app/voicing-search.mjs';
const mod=n=>(n%12+12)%12;
const check=(sol,key,durations=[])=>sol.forEach((c,i)=>assert.deepEqual(tonalIssues(sol[i-1],c,key,3,{preparationUnits:durations[i-1],minimumPreparationUnits:16}),[],`${key}, nota ${i+1}, ${sol.map(label).join('–')}`));
test('Fa♯3 → Si2 ha una vera risoluzione V–I in Si minore, con e senza settime',()=>{
 for(const enabled of [false,true]){
  const args={key:'Si minore',bass:[54,47],level:3,seventhsEnabled:enabled,allowedSevenths:[1,4],modulationMode:'manual',harmonicRequests:{0:{root:4,inv:0},1:{root:0,inv:0,seventh:false}}};
  const r=harmonizeTonal(args);assert.ok(r.solutions.length,r.diagnosis);for(const sol of r.solutions){assert.deepEqual(sol.map(c=>c.root),[4,0]);assert.deepEqual(sol.map(c=>c.voices[0]),args.bass);check(sol,args.key)}
 }
});
test('720 cadenze trasposte: tutte le 30 tonalità, due registri, due direzioni, tre livelli e filtro settime',()=>{
 let tested=0;
 for(const [key,k]of Object.entries(KEYS))for(let tonic=36;tonic<60;tonic++)if(mod(tonic-k.tonic)===0)for(const step of [-5,7])for(const level of [1,2,3])for(const enabled of [false,true]){
  const bass=[tonic+step,tonic],r=harmonizeTonal({bass,key,level,seventhsEnabled:enabled,allowedSevenths:[1,4],modulationMode:'manual',bassSpellings:bass.map(n=>chromaticSpelling(n,key)),harmonicRequests:{0:{root:4,inv:0},1:{root:0,inv:0,seventh:false}},limit:1});
  assert.ok(r.solutions.length,`${key}, livello ${level}, ${bass}: ${r.diagnosis}`);assert.deepEqual(r.solutions[0].map(c=>c.root),[4,0]);check(r.solutions[0],key);if(!enabled)assert.ok(r.solutions[0].every(c=>!c.seventh));tested++;
 }
 assert.equal(tested,720);
});
test('un basso lungo arriva al V–I alle note 24 e 25 anche trasposto in 15 tonalità minori',()=>{
 const offsets=[0,2,3,5,7,8,5,3,2,0,5,5,5,3,0,8,7,12,12,5,7,0,5,7,0];
 for(const [key,k] of Object.entries(KEYS).filter(([,k])=>k.minor)){
  let t=k.tonic-24;while(t>51)t-=12;while(t<40)t+=12;const bass=offsets.map(d=>t+d),r=harmonizeTonal({bass,key,level:3,seventhsEnabled:false,modulationMode:'manual',harmonicRequests:{23:{root:4,inv:0},24:{root:0,inv:0}}});
  assert.ok(r.solutions.length,`${key}: ${r.diagnosis}`);for(const sol of r.solutions){assert.deepEqual(sol.slice(23).map(c=>c.root),[4,0]);assert.deepEqual(sol.map(c=>c.voices[0]),bass);check(sol,key)}
 }
});
test('unisono non è incrocio, ma gli unisoni paralleli restano errori',()=>{
 const p=possibleAt(64,'La maggiore',3,{}, {seventhsEnabled:false},Infinity).find(c=>c.root===4&&c.inv===0&&c.voices[0]===c.voices[1]);assert.ok(p);assert.ok(!issues(null,p,'La maggiore').includes('incrocio'));
 const moving={...p,voices:p.voices.map(n=>n+2)};assert.ok(issues(p,moving,'La maggiore').includes('ottave_parallele'));
 const crossing={...p,voices:[64,63,70,73]};assert.ok(issues(null,crossing,'La maggiore').includes('incrocio'));
});
test('eccezione di Bach: terza discendente interna con compensazione; soprano e assenza di compensazione sono rifiutati',()=>{
 const key='Si minore',p=possibleAt(42,key,3,{}, {seventhsEnabled:false},Infinity).find(c=>c.voices.join()==='42,58,61,66'&&c.root===4),n=possibleAt(47,key,3,{}, {seventhsEnabled:false},Infinity).find(c=>c.voices.join()==='47,54,59,62'&&c.root===0);
 assert.ok(p&&n);assert.equal(bachResolution(p,n,1,key),true);assert.deepEqual(issues(p,n,key),[]);
 const missing={...n,voices:[47,54,62,66]};assert.equal(bachResolution(p,missing,1,key),false);assert.ok(issues(p,missing,key).includes('sensibile_irrisolta'));
 const highLeading={...p,voices:[42,54,61,70]},badSoprano={...n,voices:[47,54,59,66]};assert.equal(bachResolution(highLeading,badSoprano,3,key),false);assert.ok(issues(highLeading,badSoprano,key).includes('sensibile_irrisolta'));
 const wrongOctave={...n,voices:[47,71,74,78]};assert.ok(issues(p,wrongOctave,key).includes('sensibile_irrisolta'));
});
test('nessun risultato fittizio e nessuno sblocco automatico per una cadenza',()=>{
 const args={key:'Si minore',bass:[54,47],level:3,modulationMode:'manual',locks:{1:{3:61}},harmonicRequests:{0:{root:4},1:{root:0}}},before=structuredClone(args),r=harmonizeTonal(args);assert.equal(r.solutions.length,0);assert.deepEqual(args,before);
});
test('la ricerca conserva anche la disposizione valida oltre 300 alternative più economiche',()=>{
 const nodes=Array.from({length:301},(_,i)=>({voices:[i,i+1,i+2,i+3],root:0})),end={voices:[999,1000,1001,1002],root:0};
 const r=solveVoicingLayers({pools:[nodes,[end]],initialValid:()=>true,edge:p=>p.voices[0]===300,cost:(path,c)=>path?path.cost:c.voices[0],limit:1});assert.equal(r.paths.length,1);assert.equal(r.paths[0].items[0].voices[0],300);
});
test('la memorizzazione evita di verificare più volte lo stesso collegamento',()=>{
 const a={voices:[1,2,3,4],root:0},b={voices:[2,3,4,5],root:4};let calls=0;
 const r=solveVoicingLayers({pools:Array.from({length:80},(_,i)=>[i%2?b:a]),initialValid:()=>true,edge:()=>{calls++;return true},cost:()=>0,limit:1});assert.equal(r.paths[0].items.length,80);assert.equal(calls,2);
});
test('regola dell’ottava VII–VI–V discendente in tutte le 15 tonalità maggiori',()=>{
 for(const [key,k] of Object.entries(KEYS).filter(([,k])=>!k.minor)){
  let t=k.tonic-24;while(t<36)t+=12;while(t>48)t-=12;const bass=[t+12,t+11,t+9,t+7,t],r=harmonizeTonal({bass,key,level:3,seventhsEnabled:true,allowedSevenths:[1,4],modulationMode:'manual'});assert.ok(r.solutions.length,`${key}: ${r.diagnosis}`);
  for(const s of r.solutions){assert.equal(label(s[1]),'V6');assert.equal(label(s[2]),'V43/V');assert.equal(s[2].octaveRule,true);assert.equal(label(s[3]),'V');check(s,key)}
  const disabled=harmonizeTonal({bass,key,level:3,seventhsEnabled:false,modulationMode:'manual'});assert.equal(disabled.solutions.length,0);const excluded=harmonizeTonal({bass,key,level:3,seventhsEnabled:true,allowedSevenths:[1],modulationMode:'manual'});assert.equal(excluded.solutions.length,0);
 }
});
test('conferma nella stessa tonalità non impone una falsa modulazione e non cambia gli input',()=>{
 const args={key:'Si minore',bass:[47,52,54,47],level:3,seventhsEnabled:false,modulationMode:'manual',tonalEvents:[{kind:'modulation',index:1,confirm:2,key:'Si minore'}]},before=structuredClone(args),r=harmonizeTonal(args);assert.ok(r.solutions.length,r.diagnosis);assert.deepEqual(args,before);assert.ok(r.solutions.every(s=>!s.some(c=>c.tonalEvent)));r.solutions.forEach(s=>check(s,args.key));
});
test('conferma manuale non obbliga una tonica o una cadenza quando non è stata richiesta',()=>{
 const args={key:'Do maggiore',bass:[45,54,55,48],level:3,seventhsEnabled:false,modulationMode:'manual',tonalEvents:[{kind:'modulation',index:1,confirm:3,key:'Sol maggiore',arrivalMode:'manual'}]},r=harmonizeTonal(args);assert.ok(r.solutions.length,r.diagnosis);for(const s of r.solutions){assert.equal(s.at(-1).key,'Sol maggiore');assert.equal(s.at(-1).voices[0],48);check(s,args.key)}
});
test('arrivo manuale oltre quattro toniche ripetute resta disponibile',async()=>{
 const{manualModulationCandidates}=await import('../sito/public/app/tonal.mjs');const p=manualModulationCandidates({key:'Do maggiore',bass:[48,54,55,55,55,55,55,55]},1,7);assert.ok(p.some(c=>c.key==='Sol maggiore'&&c.confirm===7));
});
test('la grafia del basso è un vincolo anche con modulazioni disattivate',()=>{
 const args={key:'Do♯ maggiore',bass:[60,61],level:3,seventhsEnabled:false,modulationMode:'off',bassSpellings:[{letter:'Do',alter:0,octave:4},null]},r=harmonizeTonal(args);assert.equal(r.solutions.length,0);const valid=harmonizeTonal({...args,bassSpellings:[{letter:'Si',alter:1,octave:3},null]});assert.ok(valid.solutions.length);
});
test('diagnosi distingue un V–I valido da un conflitto con le voci bloccate nel tratto precedente',()=>{
 const args={bass:[48,43,48],key:'Do maggiore',level:3,seventhsEnabled:false,modulationMode:'manual',locks:{0:{0:48,1:55,2:64,3:72},2:{0:48,1:52,2:60,3:67}},harmonicRequests:{0:{root:0},1:{root:4},2:{root:0}}},r=harmonizeTonal(args);assert.equal(r.solutions.length,0);assert.match(r.diagnosis,/Il collegamento Sol2 → Do3 è ammesso/);assert.match(r.diagnosis,/note bloccate/);assert.doesNotMatch(r.diagnosis,/collegamento delle voci incompatibile/);assert.ok(harmonizeTonal({...args,locks:{}}).solutions.length);
});

test('la cadenza finale resta raggiungibile anche con alternative più economiche e limit=1',()=>{
 const v={root:4,inv:0,voices:[54,58,61,66]},other={root:5,inv:1,voices:[54,59,62,67]},i={root:0,inv:0,voices:[47,59,62,66]};
 const r=solveVoicingLayers({pools:[[other,v],[i]],initialValid:()=>true,edge:()=>true,cost:(p,c)=>p?p.cost:c.root===4?100:0,limit:1,pathClass:(p,c,index)=>index===1&&p.c.root===4?2:0});
 assert.ok(r.paths.some(p=>p.items[0].root===4));
});
test('basso completo invariato: cadenza Fa♯3–Si2 preferita senza richieste di accordi',()=>{
 const bass=[47,49,50,52,54,55,52,50,49,47,52,52,52,50,47,55,54,59,59,52,54,47,52,54,47];
 for(const mode of ['off','manual'])for(const enabled of [false,true]){
  const args={bass,key:'Si minore',level:3,modulationMode:mode,seventhsEnabled:enabled,allowedSevenths:[1,4],bassSpellings:bass.map(n=>chromaticSpelling(n,'Si minore')),durations:bass.map((_,i)=>i===23?32:16)},before=structuredClone(args),r=harmonizeTonal(args);
  assert.ok(r.solutions.length,r.diagnosis);assert.deepEqual(args,before);for(const sol of r.solutions){assert.deepEqual(sol.map(c=>c.voices[0]),bass);assert.deepEqual(sol.slice(-2).map(c=>[c.root,c.inv]),[[4,0],[0,0]]);check(sol,args.key,args.durations)}
 }
});
test('conflitto su Si finale offre solo una soluzione verificata che conserva basso e tonalità',()=>{
 const args={bass:[54,47],key:'Si minore',level:3,modulationMode:'manual',seventhsEnabled:false,locks:{1:{3:61}},harmonicRequests:{0:{root:4},1:{root:0}}},before=structuredClone(args),r=harmonizeTonal(args);
 assert.equal(r.solutions.length,0);assert.match(r.diagnosis,/V–I valido/);assert.doesNotMatch(r.diagnosis,/collegamento delle voci incompatibile/);assert.ok(r.recovery?.solutions.length);assert.equal(r.recovery.clearVoiceConstraints,true);assert.deepEqual(args,before);
 for(const sol of r.recovery.solutions){assert.deepEqual(sol.map(c=>c.voices[0]),args.bass);assert.deepEqual(sol.map(c=>c.root),[4,0]);check(sol,args.key)}
});
test('diagnosi su Fa♯–Si con figure incompatibili distingue le richieste dal basso',()=>{
 const r=harmonizeTonal({bass:[54,47],key:'Si minore',level:3,modulationMode:'manual',harmonicRequests:{0:{root:0,inv:2},1:{root:0}}});
 assert.equal(r.solutions.length,0);assert.match(r.diagnosis,/V–I valido/);assert.ok(r.recovery.solutions.length);
});

test('diagnosi senza blocchi non inventa voci bloccate e registra la regola effettiva',()=>{
 const args={bass:[48,54,55],key:'Do maggiore',level:3,seventhsEnabled:false,modulationMode:'manual',tonalEvents:[{kind:'modulation',index:1,confirm:2,key:'Sol maggiore'}]},r=harmonizeTonal(args);
 assert.equal(r.solutions.length,0);assert.doesNotMatch(r.diagnosis,/bloccat|accordi richiesti/);assert.equal(r.trace.index,1);assert.ok(r.trace.examples.some(e=>e.errors.includes('quarta_aumentata')));assert.deepEqual(r.trace.tonalEvents,args.tonalEvents);
 const replay=harmonizeTonal(JSON.parse(JSON.stringify(args)));assert.equal(replay.diagnosis,r.diagnosis);assert.deepEqual(replay.trace,r.trace);
});
