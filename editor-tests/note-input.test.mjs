import test from 'node:test';
import assert from 'node:assert/strict';
import {newScore,ScoreSession,length,measureStart,measureAt,validate} from '../sito/public/editor/model.mjs';
import {scoreMei,scoreMusicXml,performance} from '../sito/public/editor/encoding.mjs';
import {localPoint,pitchAt} from '../sito/public/editor/note-position.mjs';
const values=['breve','whole','half','quarter','eighth','16th','32nd','64th'];
test('Note al clic: coordinate locali corrette con zoom, traslazioni e chiavi G/F/C',()=>{
 const lines=Array.from({length:5},(_,i)=>({x1:0,x2:4000,y:1000+i*180}));
 for(const scale of [.01,.04,.1,1,2]){const p=localPoint({a:scale,b:0,c:0,d:scale,e:81,f:137},81+scale*900,137+scale*1720);assert.ok(Math.abs(p.y-1720)<1e-8);assert.equal(pitchAt(p.y,lines,{shape:'G',line:2}),64);assert.equal(pitchAt(p.y,lines,{shape:'F',line:4}),43);assert.equal(pitchAt(p.y,lines,{shape:'C',line:3}),53);assert.equal(pitchAt(p.y,lines,{shape:'C',line:4}),50)}
 assert.equal(pitchAt(1720,lines,{shape:'G',line:2},4),64);assert.equal(pitchAt(1630,lines,{shape:'G',line:2},1),66);
 assert.throws(()=>localPoint({a:0,b:0,c:0,d:0,e:0,f:0},12,12),/visibile/);
});
test('8/4 in 4/4: due semibrevi legate, nuova battuta, audio continuo e undo unico',()=>{
 const s=new ScoreSession(newScore({bars:1}));s.insert({start:0,midi:60,duration:'breve'});
 assert.equal(s.score.measures.length,2);assert.deepEqual(s.score.events.map(e=>[e.start,e.duration,!!e.tieNext]),[[0,'whole',true],[64,'whole',false]]);
 assert.equal(s.selected().start,64);const p=performance(s.score);assert.equal(p.notes.length,1);assert.equal(p.notes[0].length,128);
 assert.equal((scoreMei(s.score).match(/<tie /g)||[]).length,1);assert.equal((scoreMusicXml(s.score).match(/<tie type="start"/g)||[]).length,1);
 s.undo();assert.equal(s.score.events.length,0);assert.equal(s.score.measures.length,1);s.redo();assert.equal(s.score.events.length,2);
});
test('Tutte le metriche e gli otto valori, puntati e da fine battuta: durata esatta e nessun evento fuori battuta',()=>{
 let cases=0;
 for(const denominator of [1,2,4,8,16,32,64])for(let beats=1;beats<=32;beats++)for(const duration of values)for(const dotted of [false,true])for(const edge of [false,true]){
  const meter=beats+'/'+denominator,bar=beats*64/denominator,start=edge?bar-1:0,s=new ScoreSession(newScore({meter,bars:1}));s.insert({start,midi:48,duration,dotted});
  const expected=length({duration,dotted}),events=s.score.events;assert.ok(Math.abs(events.reduce((n,e)=>n+length(e),0)-expected)<1e-7,meter+' '+duration);assert.equal(events[0].start,start);
  events.forEach((e,i)=>{assert.ok(e.start+length(e)<=measureStart(s.score,measureAt(s.score,e.start)+1)+1e-7);assert.equal(!!e.tieNext,i<events.length-1);assert.deepEqual(e.pitches,[48])});validate(s.score);const rest=new ScoreSession(newScore({meter,bars:1}));rest.insert({start,kind:'rest',duration,dotted});assert.ok(Math.abs(rest.score.events.reduce((n,e)=>n+length(e),0)-expected)<1e-7);assert.ok(rest.score.events.every(e=>!e.tieNext));validate(rest.score);cases++;
 }
 assert.equal(cases,7168);
});
test('Pause, terzine, cambio di metrica e voci indipendenti conservano il tempo',()=>{
 const s=new ScoreSession(newScore({bars:2}));s.score.measures[1].meter='3/4';s.insert({start:48,midi:60,duration:'breve'});assert.equal(s.score.events.reduce((n,e)=>n+length(e),0),128);assert.equal(s.score.events.at(-1).start+length(s.score.events.at(-1)),176);
 const t=new ScoreSession(newScore({bars:1,meter:'1/64'}));t.insert({start:0,midi:60,duration:'64th',dotted:true});assert.deepEqual(t.score.events.map(e=>e.duration),['64th','128th']);
 const r=new ScoreSession(newScore({bars:1}));r.insert({start:60,kind:'rest',duration:'whole'});assert.ok(r.score.events.every(e=>!e.tieNext));assert.equal(r.score.events.reduce((n,e)=>n+length(e),0),64);
 const q=new ScoreSession(newScore({bars:1}));q.insert({start:60,midi:60,duration:'quarter',tuplet:true});assert.ok(Math.abs(q.score.events.reduce((n,e)=>n+length(e),0)-32/3)<1e-7);const voices=new ScoreSession(newScore({bars:1}));voices.insert({start:0,staff:0,voice:1,midi:60,duration:'breve'});voices.insert({start:0,staff:1,voice:2,midi:48,duration:'breve'});voices.insert({start:0,staff:0,voice:2,midi:64,duration:'breve'});validate(voices.score);assert.equal(performance(voices.score).notes.length,3);const xml=scoreMusicXml(q.score);assert.ok([...xml.matchAll(/<duration>(.*?)<\/duration>/g)].every(m=>Number.isInteger(+m[1])&&+m[1]>0));
});
test('Accordi prolungati: tutte le altezze si legano e il suono non si ripete',()=>{
 const s=new ScoreSession(newScore({bars:1}));s.insert({start:0,midi:60,duration:'breve'});s.insert({start:0,midi:64,chord:true});s.insert({start:0,midi:67,chord:true});
 assert.ok(s.score.events.every(e=>e.pitches.join(',')==='60,64,67'));assert.equal((scoreMei(s.score).match(/<tie /g)||[]).length,3);assert.equal((scoreMusicXml(s.score).match(/<tie type="start"/g)||[]).length,3);assert.equal(performance(s.score).notes.length,3);
});
test('Inserimento su una pausa: conserva le pause prima e dopo; conflitti con note annullano tutto',()=>{
 const s=new ScoreSession(newScore({bars:1}));s.insert({start:0,kind:'rest',duration:'whole'});s.insert({start:16,midi:60,duration:'quarter'});assert.deepEqual(s.score.events.map(e=>[e.start,e.kind,length(e)]),[[0,'rest',16],[16,'note',16],[32,'rest',32]]);
 const t=new ScoreSession(newScore({bars:2}));t.insert({start:80,midi:62});const before=structuredClone(t.score);assert.throws(()=>t.insert({start:0,midi:60,duration:'breve'}),/sovrapposte/);assert.deepEqual(t.score,before);
});
