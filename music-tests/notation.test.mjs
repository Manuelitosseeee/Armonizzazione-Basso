import test from 'node:test';
import assert from 'node:assert/strict';
import {musicXML,midiBytes,fillMeasures,UNITS,eventUnits,validTies} from '../sito/public/app/notation.mjs';
import {KEYS,harmonize,diagnoseNoSolution,generateBass,bassForDegrees,pitchName,noteSpelling,label,supportedSevenths,candidateForVoices,issues} from '../sito/public/app/engine.mjs';

test('una croma seguita dalla sua pausa occupa due ottavi distinti',()=>{
 const events=[{start:0,kind:'note',midi:48,duration:'eighth',accidental:'key'},
  {start:8,kind:'rest',duration:'eighth'}];
 const xml=musicXML({events,solutions:null,key:'Do maggiore',meter:'4/4'});
 assert.match(xml,/<duration>8<\/duration><voice>1<\/voice><type>eighth<\/type><stem>down<\/stem><staff>1<\/staff><\/note><note><rest\/><duration>8<\/duration><voice>1<\/voice><type>eighth<\/type>/);
 assert.match(xml,/<fifths>0<\/fifths>/);
 const midi=midiBytes({events,solutions:null,bpm:84});
 assert.equal(String.fromCharCode(...midi.slice(0,4)),'MThd');
 assert.equal(midi.filter(n=>n===0x90).length,1);
});

test('armatura e metrica sono esportate; due voci armonizzate restano sincronizzate',()=>{
 const events=[{start:0,kind:'note',midi:43,duration:'quarter',accidental:'key'},
  {start:16,kind:'note',midi:48,duration:'quarter',accidental:'key'}];
 const xml=musicXML({events,solutions:[{voices:[43,55,60,72]},{voices:[48,55,64,72]}],key:'Sol maggiore',meter:'3/4'});
 assert.match(xml,/<fifths>1<\/fifths>/);
 assert.match(xml,/<beats>3<\/beats><beat-type>4<\/beat-type>/);
 assert.equal((xml.match(/<part id=/g)||[]).length,1);assert.match(xml,/<staves>2<\/staves>/);assert.match(xml,/<clef number="1"><sign>G<\/sign>/);assert.match(xml,/<clef number="2"><sign>F<\/sign>/);
 assert.equal((xml.match(/<measure number="1">/g)||[]).length,1);assert.equal((xml.match(/<backup>/g)||[]).length,3);
});

test('il motore usa la tonalità scelta e non inventa risultati impossibili',()=>{
 assert.throws(()=>harmonize({bass:[48,54],key:'Do maggiore',level:1}),/tonalità/);
 assert.doesNotThrow(()=>harmonize({bass:[48,55],key:'Do maggiore',level:1}));
 assert.ok(harmonize({bass:[48,55],key:'Do maggiore',level:1}).length>0);
 const longBass=Array.from({length:24},(_,i)=>[48,53,55,48,57,50,55,48][i%8]);
 assert.ok(harmonize({bass:longBass,key:'Do maggiore',level:1}).length>0);
});

test('l alterazione manuale resta nella notazione e nel MIDI',()=>{
 const events=[{start:0,kind:'note',midi:65,baseMidi:66,duration:'eighth',accidental:'natural'}];
 const xml=musicXML({events,key:'Sol maggiore',meter:'4/4'});
 assert.match(xml,/<step>F<\/step><octave>4<\/octave><\/pitch><duration>8<\/duration><voice>1<\/voice><type>eighth<\/type><accidental>natural<\/accidental>/);
 assert.ok([...midiBytes({events,bpm:90})].includes(65));
});

test('MusicXML include le battute vuote aggiunte dall editor',()=>{
 const xml=musicXML({events:[],key:'Do maggiore',meter:'6/8',measureCount:13});
 assert.equal((xml.match(/<measure number=/g)||[]).length,13);
 assert.match(xml,/<measure number="13">/);
});

test('ogni battuta rispetta la metrica anche se l autore lascia tempi vuoti',()=>{
 const events=[{start:0,kind:'note',midi:48,duration:'quarter'},
  {start:16,kind:'note',midi:50,duration:'quarter'},
  {start:32,kind:'note',midi:52,duration:'quarter'},
  {start:64,kind:'note',midi:48,duration:'eighth'}];
 const filled=fillMeasures(events,'4/4',3);
 for(let m=0;m<3;m++)assert.equal(filled.filter(e=>Math.floor(e.start/64)===m).reduce((sum,e)=>sum+UNITS[e.duration],0),64);
 assert.deepEqual(filled.filter(e=>e.implicit).map(e=>[e.start,e.duration]),[[48,'quarter'],[72,'eighth'],[80,'quarter'],[96,'half'],[128,'whole']]);
 const xml=musicXML({events,key:'Do maggiore',meter:'4/4',measureCount:3});
 assert.match(xml,/<duration>16<\/duration><voice>1<\/voice><type>quarter<\/type><staff>1<\/staff><\/note><\/measure><measure number="2">/);
 assert.throws(()=>fillMeasures([{start:56,kind:'note',midi:48,duration:'quarter'}],'4/4'),/battuta 1/);
});

test('sei crome occupano esattamente una battuta in 6/8; le pause completano le altre',()=>{
 const events=[0,8,16,24,32].map(start=>({start,kind:'note',midi:48,duration:'eighth'}));
 const filled=fillMeasures(events,'6/8',2);
 assert.deepEqual(filled.filter(e=>e.implicit).map(e=>[e.start,e.duration]),[[40,'eighth'],[48,'quarter'],[64,'eighth'],[72,'quarter'],[88,'eighth']]);
 assert.equal(filled.filter(e=>e.start<48).reduce((sum,e)=>sum+UNITS[e.duration],0),48);
});

test('le settime selezionabili e le cifre dei rivolti seguono il profilo teorico',()=>{
 assert.deepEqual(supportedSevenths('Do maggiore'),[0,1,2,4,5]);
 assert.deepEqual(supportedSevenths('La minore'),[1,4]);
 assert.deepEqual([0,1,2].map(inv=>label({root:0,inv,seventh:false})),['I','I6','I64']);
 assert.deepEqual([0,1,2,3].map(inv=>label({root:0,inv,seventh:true})),['I7','I65','I43','I42']);
});

test('senza settime il motore genera solo triadi; con settime risolve V7 e i suoi rivolti',()=>{
 for(const [bass,figura] of [[[43,48],'V7'],[[47,48],'V65'],[[50,48],'V43'],[[53,52],'V42']]){
  const settings={bass,key:'Do maggiore',level:3,seventhsEnabled:true,allowedSevenths:[4]};
  const solutions=harmonize(settings);
  assert.ok(solutions.some(s=>label(s[0])===figura),`${figura} deve essere disponibile`);
  for(const sol of solutions)for(let i=0;i<sol.length;i++){
   const c=candidateForVoices(sol[i].voices,'Do maggiore',3,{seventhsEnabled:true,allowedSevenths:[4]});
   assert.ok(c);
   assert.deepEqual(issues(i?sol[i-1]:null,c,'Do maggiore',3),[]);
  }
  assert.ok(harmonize({...settings,seventhsEnabled:false}).every(sol=>sol.every(c=>!c.seventh)));
 }
});

test('escludere la settima di dominante non disabilita le altre settime ammesse',()=>{
 const bass=[53,50,55,48],key='Do maggiore';
 const solutions=harmonize({bass,key,level:3,seventhsEnabled:true,allowedSevenths:[1]});
 assert.ok(solutions.some(sol=>sol.some(c=>c.seventh&&c.root===1)));
 assert.ok(solutions.every(sol=>sol.every(c=>!c.seventh||c.root===1)));
});

test('il primo risultato costruisce una cadenza quando il basso la consente',()=>{
 for(const key of ['Do maggiore','La minore','Do minore','Fa♯ maggiore'])for(const [degrees,expected] of [
  [[0,1,4,0],'I II V I'],[[0,3,4,0],'I IV V I'],[[0,4,0],'I V I']]){
  const solutions=harmonize({bass:bassForDegrees(degrees,key),key,level:3,seventhsEnabled:false});
  assert.ok(solutions.length,`${key} · ${degrees}`);
  assert.equal(solutions[0].map(label).join(' '),expected,`${key} · ${degrees}`);
  assert.ok(solutions.every(sol=>sol.at(-1).root===0),`${key}: le alternative chiudono sulla tonica`);
 }
});

test('la frase di due battute chiude due volte e una nota bloccata resta rispettata',()=>{
 const bass=bassForDegrees([0,3,4,0,5,1,4,0],'Do maggiore');
 const solutions=harmonize({bass,key:'Do maggiore',level:3,starts:[0,16,32,48,64,80,96,112],meter:'4/4',seventhsEnabled:false});
 assert.equal(solutions[0].map(label).join(' '),'I IV V I VI II V I');
 const locked=harmonize({bass:bassForDegrees([0,1,4,0],'Do maggiore'),key:'Do maggiore',level:2,locks:{0:{1:57,2:60,3:64}}});
 assert.ok(locked.length);
 assert.equal(label(locked[0][0]),'VI6');
 assert.deepEqual(locked[0][0].voices,[48,57,60,64]);
});

test('il basso Fa–Sol–Do–Fa–Mi–Re–Do–Re–Mi–Fa distingue tonalità e sensibile',()=>{
 const bass=[53,55,48,53,52,50,48,50,52,53];
 const options={bass,level:3,seventhsEnabled:true,allowedSevenths:[1,4],starts:bass.map((_,i)=>i*16),durations:bass.map(()=>16),meter:'4/4'};
 assert.equal(harmonize({...options,key:'Fa maggiore',seventhsEnabled:false}).length,0);
 const octave=harmonize({...options,key:'Fa maggiore'});assert.ok(octave.length);assert.ok(octave.every(s=>s[5].octaveRule&&label(s[5])==='V43/V'));for(const s of octave)for(let i=0;i<s.length;i++)assert.deepEqual(issues(s[i-1],s[i],'Fa maggiore',3),[]);
 const diagnosis=diagnoseNoSolution({...options,key:'Fa maggiore',seventhsEnabled:false});
 assert.match(diagnosis.message,/note 5 e 6.*Mi3.*Re3.*deve salire a Fa3.*Giannetta/);
 assert.equal(diagnosis.alternativeKey,'Do maggiore');
 const solutions=harmonize({...options,key:'Do maggiore'});
 assert.ok(solutions.length);
 for(const sol of solutions)for(let i=0;i<sol.length;i++)assert.deepEqual(issues(sol[i-1],sol[i],'Do maggiore',3),[]);
});

test('Fa–Mi–Fa–Sol–Do–Fa richiede V6 al livello 2 e mantiene il basso',()=>{
 const bass=[53,52,53,55,48,53],key='Fa maggiore',options={bass,key,seventhsEnabled:false,starts:bass.map((_,i)=>i*16),durations:bass.map(()=>16),meter:'4/4'};
 assert.equal(harmonize({...options,level:1}).length,0);
 const diagnosis=diagnoseNoSolution({...options,level:1});
 assert.equal(diagnosis.alternativeLevel,2);
 assert.match(diagnosis.message,/V6 sulla nota 2 \(Mi3\).*I–V6–I–II–V–I/);
 const solutions=harmonize({...options,level:2});
 assert.equal(solutions[0].map(label).join(' '),'I V6 I II V I');
 for(const sol of solutions)for(let i=0;i<sol.length;i++)assert.deepEqual(issues(sol[i-1],sol[i],key,2),[]);
});

test('tutte le 15 armature maggiori e relative minori producono bassi armonizzabili',()=>{
 const keys=Object.entries(KEYS);
 assert.equal(keys.length,30);
 for(const minor of [false,true])assert.deepEqual(keys.filter(([,k])=>k.minor===minor).map(([,k])=>k.fifths),Array.from({length:15},(_,i)=>i-7));
 for(const [key] of keys)for(let variation=0;variation<4;variation++){
  const bass=generateBass(key,8,variation);
  assert.ok(harmonize({bass,key,level:1}).length>0,`${key} · basso ${variation+1}`);
 }
});

test('l ottava scritta e l alterazione della minore armonica sono esatte nel MusicXML',()=>{
 assert.equal(pitchName(59,'Do♭ maggiore'),'Do♭4');
 assert.equal(pitchName(72,'Do♯ maggiore'),'Si♯4');
 assert.deepEqual(noteSpelling(81,'La♯ minore'),{letter:'Sol',alter:2,octave:5,degree:6});
 for(const [key,midi,step,alter,octave,fifths] of [
  ['Do♭ maggiore',59,'C',-1,4,-7],['Do♯ maggiore',72,'B',1,4,7],['La♯ minore',81,'G',2,5,7]]){
  const xml=musicXML({events:[{start:0,kind:'note',midi,duration:'quarter',accidental:'key'}],key,meter:'4/4'});
  assert.match(xml,new RegExp(`<fifths>${fifths}<\\/fifths>`));
  assert.ok(xml.includes(`<step>${step}</step><alter>${alter}</alter><octave>${octave}</octave>`));
  if(key==='La♯ minore')assert.match(xml,/<accidental>double-sharp<\/accidental>/);
 }
});

test('il basso reale di 19 note in Sol minore e varianti di ritmo e trasposizione',()=>{
 const bass=[43,45,46,48,50,51,48,46,45,43,48,48,48,46,43,51,50,55,55];
 const durations=[16,16,16,16,32,16,32,16,16,16,32,16,16,16,16,16,32,32,16];
 const starts=[];let cursor=0;for(const duration of durations){starts.push(cursor);cursor+=duration}
 for(const [key,notes] of [['Sol minore',bass],['La minore',bass.map(n=>n+2)]]){
  for(const meter of ['3/2','4/4'])for(const seventhsEnabled of [false,true]){
   const solutions=harmonize({bass:notes,key,level:3,meter,starts,durations,seventhsEnabled,allowedSevenths:[1,4]});
   assert.ok(solutions.length,`${key}, ${meter}: deve avere almeno una soluzione`);
   for(const solution of solutions)for(let i=0;i<solution.length;i++){
    assert.equal(solution[i].voices[0],notes[i]);
    assert.deepEqual(issues(solution[i-1],solution[i],key,3,{preparationUnits:durations[i-1],minimumPreparationUnits:meter==='3/2'?32:16}),[]);
   }
  }
 }
});

test('punto e legatura preservano durata, notazione e un unico attacco MIDI',()=>{
 const events=[{start:0,kind:'note',midi:43,duration:'quarter',dotted:true,tieNext:true},
  {start:24,kind:'note',midi:43,duration:'eighth'},
  {start:32,kind:'rest',duration:'half'}];
 assert.equal(eventUnits(events[0]),24);
 assert.equal(fillMeasures(events,'4/4').reduce((sum,e)=>sum+eventUnits(e),0),64);
 const xml=musicXML({events,key:'Sol minore',meter:'4/4'});
 assert.match(xml,/<duration>24<\/duration><tie type="start"\/><voice>1<\/voice><type>quarter<\/type><dot\/>/);
 assert.match(xml,/<duration>8<\/duration><tie type="stop"\/><voice>1<\/voice><type>eighth<\/type>/);
 const midi=midiBytes({events,bpm:84});assert.equal([...midi].filter(n=>n===0x90).length,1);
 assert.throws(()=>validTies([{...events[0],tieNext:true},{...events[1],midi:45}]),/Legatura non valida/);
});

test('legatura attraverso la battuta in 3/2 e una pausa puntata',()=>{
 const events=[{start:80,kind:'note',midi:43,duration:'quarter',tieNext:true},
  {start:96,kind:'note',midi:43,duration:'half'},
  {start:128,kind:'rest',duration:'half',dotted:true}];
 assert.equal(fillMeasures(events,'3/2',2).filter(e=>e.start===128)[0].dotted,true);
 const xml=musicXML({events,key:'Sol minore',meter:'3/2'});
 assert.match(xml,/<beats>3<\/beats><beat-type>2<\/beat-type>/);
 assert.match(xml,/<type>half<\/type><dot\/><staff>1<\/staff><\/note>/);
 assert.equal([...midiBytes({events,bpm:84})].filter(n=>n===0x90).length,1);
});

test('PDF autonomo impagina tutte le battute in più pagine senza finestra di stampa',async()=>{
 const {readFileSync}=await import('node:fs');
 const {pdfFromSystems}=await import('../sito/public/app/pdf.mjs');
 const {PDFDocument}=await import('../sito/public/vendor/pdf-lib.mjs');
 const jpg=readFileSync(new URL('./blank.jpg',import.meta.url));
 const bytes=await pdfFromSystems(Array.from({length:7},()=>new Uint8Array(jpg)));
 assert.equal(new TextDecoder().decode(bytes.subarray(0,5)),'%PDF-');
 assert.equal((await PDFDocument.load(bytes)).getPageCount(),2);
});

test('parti strette e late assegnano chiavi MusicXML diverse al tenore',()=>{
 const settings={events:[{start:0,kind:'note',midi:43,duration:'quarter'}],solutions:[{voices:[43,55,60,67]}],key:'Sol maggiore',meter:'4/4'};
 const close=musicXML({...settings,partSpacing:'strette'}),open=musicXML({...settings,partSpacing:'late'});
 const tenor=xml=>xml.match(/<note>[^]*?<voice>3<\/voice>[^]*?<\/note>/)[0];
 assert.match(tenor(close),/<staff>2<\/staff>/);assert.match(open,/<voice>1<\/voice><type>quarter<\/type><stem>(up|down)<\/stem><staff>1<\/staff>/);assert.equal((open.match(/<chord\/>/g)||[]).length,2);
});
