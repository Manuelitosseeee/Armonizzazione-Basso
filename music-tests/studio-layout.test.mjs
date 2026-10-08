import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../sito/public/harmony.html',import.meta.url),'utf8');
const original=JSON.parse(readFileSync(new URL('./fixtures/design-controls.json',import.meta.url),'utf8'));
test('riorganizzazione dello studio conserva tutti i controlli precedenti, senza duplicare ID',()=>{const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);for(const id of original)assert.ok(ids.includes(id),id);for(const id of ['importMenu','exportMenu','modulationsPanel','seventhsPanel','chordMenu','sidebarTools'])assert.ok(ids.includes(id))});
test('strumenti di scrittura prima del lavoro, senza menu decorativi della foto',()=>{assert.ok(source.indexOf('notationToolbar')<source.indexOf('<main>'));assert.match(source,/class="workspaceHead documentTab"/);assert.match(source,/class="manualHead"/);for(const item of ['Feedback','Palette colori','Avanzata','<summary>File</summary>','<summary>Modifica</summary>','<summary>Visualizza</summary>'])assert.ok(!source.includes(item),item);assert.match(source,/app\/studio.css\?v=20261007-cifrature-settime-1/)});
