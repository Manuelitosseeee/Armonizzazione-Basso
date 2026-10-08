import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from '../sito/public/vendor/jszip.cjs';
import {parseMscx,parseMusicXml,readScoreFile} from '../sito/public/app/import.mjs';
import {musicXML} from '../sito/public/app/notation.mjs';

const native=`<?xml version="1.0"?><museScore version="4.0"><Score><Part><longName>Soprano</longName><Staff id="1"/></Part><Part><longName>Basso</longName><Staff id="2"/></Part>
<Staff id="1"><Measure><voice><KeySig><accidental>-2</accidental></KeySig><TimeSig><sigN>3</sigN><sigD>2</sigD></TimeSig><Rest><durationType>measure</durationType></Rest></voice></Measure></Staff>
<Staff id="2"><Measure><voice><KeySig><accidental>-2</accidental></KeySig><TimeSig><sigN>3</sigN><sigD>2</sigD></TimeSig><Chord><durationType>quarter</durationType><Note><pitch>43</pitch></Note></Chord><Chord><dots>1</dots><durationType>half</durationType><Note><pitch>45</pitch></Note></Chord><Rest><durationType>quarter</durationType></Rest><Chord><durationType>quarter</durationType><Note><pitch>46</pitch></Note></Chord></voice></Measure><Measure><voice><Chord><durationType>whole</durationType><Note><pitch>43</pitch></Note></Chord></voice></Measure></Staff></Score></museScore>`;

test('MSCX: seleziona il basso, conserva metrica, armatura, durata puntata e pause',()=>{
 const data=parseMscx(native);
 assert.equal(data.meter,'3/2');assert.equal(data.key,'Sol minore');assert.equal(data.tracks[0].name,'Basso');assert.equal(data.measureCount,2);
 assert.deepEqual(data.tracks[0].events.map(e=>[e.start,e.kind,e.midi,e.duration,e.dotted]),[[0,'note',43,'quarter',false],[16,'note',45,'half',true],[64,'rest',undefined,'quarter',false],[80,'note',46,'quarter',false],[96,'note',43,'whole',false]]);
});

test('MSCZ ZIP: estrae il file nativo e importa senza connessione',async()=>{
 const archive=new JSZip();archive.file('score.mscx',native);
 const bytes=await archive.generateAsync({type:'uint8array'});
 const result=await readScoreFile({name:'basso.mscz',size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)},JSZip);
 assert.equal(result.tracks[0].events.length,5);
});

test('MusicXML e MXL: importa note e chiave del basso',async()=>{
 const events=[{start:0,kind:'note',midi:43,duration:'quarter'},{start:16,kind:'note',midi:45,duration:'quarter'}];
 const xml=musicXML({events,key:'Sol minore',meter:'3/2',measureCount:2});
 const parsed=parseMusicXml(xml);assert.equal(parsed.key,'Sol minore');assert.equal(parsed.meter,'3/2');assert.equal(parsed.measureCount,2);assert.deepEqual(parsed.tracks[0].events.filter(e=>e.kind==='note').map(e=>e.midi),[43,45]);
 const zip=new JSZip();zip.file('META-INF/container.xml','<container><rootfiles><rootfile full-path="score.musicxml"/></rootfiles></container>');zip.file('score.musicxml',xml);
 const bytes=await zip.generateAsync({type:'uint8array'});
 const wrapped=await readScoreFile({name:'score.mxl',size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)},JSZip);
 assert.equal(wrapped.tracks[0].events.filter(e=>e.kind==='note').length,2);
});

test('non altera in silenzio tempi irregolari e cambi di tonalità',()=>{
 assert.throws(()=>parseMscx(native.replace('<sigN>3</sigN>','<sigN>5</sigN>')),/battuta 1|metrica/);
 const xml=musicXML({events:[{start:0,kind:'note',midi:43,duration:'quarter'}],key:'Sol minore',meter:'4/4'});
 assert.throws(()=>parseMusicXml(xml.replace('<duration>16</duration>','<duration>12</duration>')),/terzine/);
});

test('MusicXML per pianoforte separa il rigo del basso da quello superiore',()=>{
 const xml=`<score-partwise><part-list><score-part id="P1"><part-name>Pianoforte</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>16</divisions><key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes><note><pitch><step>C</step><octave>5</octave></pitch><duration>64</duration><voice>1</voice><type>whole</type><staff>1</staff></note><backup><duration>64</duration></backup><note><pitch><step>C</step><octave>3</octave></pitch><duration>32</duration><voice>2</voice><type>half</type><staff>2</staff></note><note><pitch><step>G</step><octave>2</octave></pitch><duration>32</duration><voice>2</voice><type>half</type><staff>2</staff></note></measure></part></score-partwise>`;
 const parsed=parseMusicXml(xml);assert.equal(parsed.tracks.length,2);assert.match(parsed.tracks[0].name,/rigo 2.*basso/);assert.deepEqual(parsed.tracks[0].events.map(e=>e.midi),[48,43]);
});

test('MSCX conserva tpc: Si bemolle non diventa La diesis',()=>{
 const xml='<museScore><Score><Staff id="1"><Measure><voice><Chord><durationType>half</durationType><Note><pitch>58</pitch><tpc>12</tpc></Note></Chord><Chord><durationType>half</durationType><Note><pitch>54</pitch><tpc>20</tpc></Note></Chord></voice></Measure></Staff></Score></museScore>';
 const e=parseMscx(xml).tracks[0].events;assert.deepEqual(e[0].spelling,{letter:'Si',alter:-1,octave:3});assert.deepEqual(e[1].spelling,{letter:'Fa',alter:1,octave:3});
});

test('MSCX con due voci nello stesso rigo importa la voce grave, con pause autonome e tonalità nella prima voce',()=>{const xml='<museScore><Score><Staff id="1"><Measure><voice><TimeSig><sigN>4</sigN><sigD>4</sigD></TimeSig><KeySig><accidental>0</accidental></KeySig><Chord><durationType>whole</durationType><Note><pitch>67</pitch></Note></Chord></voice><voice><Chord><durationType>whole</durationType><Note><pitch>48</pitch></Note></Chord></voice></Measure><Measure><voice><Chord><durationType>whole</durationType><Note><pitch>64</pitch></Note></Chord></voice><voice><Rest><durationType>measure</durationType></Rest></voice></Measure></Staff></Score></museScore>';const p=parseMscx(xml);assert.deepEqual(p.tracks[0].events.map(e=>e.midi),[48]);assert.equal(p.measureCount,2);assert.equal(p.key,'Do maggiore');});
test('MuseScore non converte terzine e gruppi irregolari in figure ordinarie',()=>{const xml='<museScore><Score><Staff id="1"><Measure><voice><Tuplet id="1"><normalNotes>2</normalNotes><actualNotes>3</actualNotes></Tuplet><Chord><durationType>quarter</durationType><Tuplet>1</Tuplet><Note><pitch>48</pitch></Note></Chord></voice></Measure></Staff></Score></museScore>';assert.throws(()=>parseMscx(xml),/gruppi irregolari/)});
