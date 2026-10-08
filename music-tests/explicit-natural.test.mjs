import test from 'node:test';import assert from 'node:assert/strict';
import {scoreScene} from '../sito/public/app/pdf-view.mjs';import {GLYPHS} from '../sito/public/app/music-glyphs.mjs';import {musicXML} from '../sito/public/app/notation.mjs';
const options=accidental=>({events:[0,16].map(start=>({start,midi:48,baseMidi:48,spelling:{letter:'Do',alter:0,octave:3},kind:'note',duration:'quarter',accidental})),key:'Do maggiore',meter:'4/4',measureCount:1});
test('due Do bequadro già naturali restano entrambi visibili nell’incisione condivisa schermo/PDF',()=>{
 const marks=scoreScene(options('natural')).pages.flatMap(p=>p.records).filter(r=>r.tag==='accidental'&&r.method==='drawSvgPath');
 assert.equal(marks.length,2);assert.ok(marks.every(r=>r.args[0]===GLYPHS.natural.path));
 assert.equal(scoreScene(options('key')).pages.flatMap(p=>p.records).filter(r=>r.tag==='accidental'&&r.method==='drawSvgPath').length,0);
});
test('MusicXML conserva il bequadro esplicito ridondante e le altezze originali',()=>{
 const xml=musicXML(options('natural'));assert.equal((xml.match(/<accidental>natural<\/accidental>/g)||[]).length,2);assert.ok(!xml.includes('<alter>'));
});
