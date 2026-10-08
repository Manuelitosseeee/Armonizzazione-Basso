import test from 'node:test';
import assert from 'node:assert/strict';

class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.style={};this.value='';this.textContent='';this.className=''}
 get options(){return this.children}
 setAttribute(key,value){this.attributes[key]=String(value)}
 getAttribute(key){return this.attributes[key]}
 append(...children){this.children.push(...children)}
 prepend(...children){this.children.unshift(...children)}
 click(){this.onclick?.()}
 replaceChildren(...children){this.children=children}
 add(option){this.children.push(option)}
 cloneNode(){return new Element(this.tagName)}
 querySelectorAll(){return []}
 createSVGPoint(){return {x:0,y:0,matrixTransform(){return {x:this.x,y:this.y}}}}
 getScreenCTM(){return {inverse(){return {}}}}
}
const elements=new Map();
const listeners=new Map();
globalThis.document={
 getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id)},
 createElement:tag=>new Element(tag),
 createElementNS:(_,tag)=>new Element(tag),
 createTextNode:text=>({textContent:text}),
 addEventListener:(type,handler)=>{const previous=listeners.get(type);listeners.set(type,event=>{previous?.(event);handler(event)})}
};
globalThis.Option=class {constructor(label,value){this.textContent=label;this.value=value}};
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
globalThis.window={addEventListener(){},print(){this.printed=true}};
const el=id=>document.getElementById(id);
await import('../sito/public/app/main.mjs');
el('scoreLayout').onchange({target:{value:'paged'}});

function clickQuarter(index,y){const svg=el('staff').children[0],bars=svg.children.filter(n=>n.attributes.class==='barline'),guides=svg.children.filter(n=>n.attributes.class?.startsWith('beatGuide')),m=Math.floor(index/4),beat=index%4,x=beat?Number(guides[m*3+beat-1].attributes.x1):Number(bars[m].attributes.x1)+12*10/7;svg.children.find(n=>n.attributes.class==='manualHit').onclick({clientX:x,clientY:y});}
test('Scrivi basso genera armonizzazioni e i due comandi eliminano le note',()=>{
 el('writeMode').onclick();
 assert.equal(el('bassEditor').children.length,0);
 const hit=()=>el('staff').children[0].children.find(node=>node.attributes.class==='manualHit');
 hit().onclick({clientX:145.142857,clientY:212.71428571428572});
 assert.equal(el('bassEditor').children.length,1);
 el('solve').onclick();
 assert.match(el('status').textContent,/armonizzazioni generate in Do maggiore/);
 assert.match(el('resultCount').textContent,/[1-4] soluzioni/);
 let prevented=false;
 hit().oncontextmenu({clientX:145.142857,clientY:212.71428571428572,preventDefault(){prevented=true}});
 assert.ok(prevented);
 assert.equal(el('bassEditor').children.length,0);
 hit().onclick({clientX:145.142857,clientY:212.71428571428572});
 el('clearAll').onclick();
 assert.equal(el('bassEditor').children.length,0);
 assert.equal(el('resultCount').textContent,'0 soluzioni');
});



test('l armatura segue la chiave e resta davanti alla metrica',()=>{
 el('key').onchange({target:{value:'Re maggiore'}});
 const children=el('staff').children[0].children;
 const sharps=children.filter(node=>node.attributes.class==='keySignature');
 assert.deepEqual(sharps.map(node=>Number(node.attributes.x)),[54,64]);
 const time=children.find(node=>node.attributes.class==='timeSignature');
 assert.ok(Number(time.attributes.x)>64);
});

test('le battute si aggiungono senza limite fisso e si navigano a pagine',()=>{
 for(let n=0;n<9;n++)el('addMeasure').onclick();
 assert.equal(el('measureRange').textContent,'Battute 13–13 di 13');
 assert.ok(el('previousMeasures').disabled===false);
 el('previousMeasures').onclick();
 assert.equal(el('measureRange').textContent,'Battute 9–12 di 13');
 assert.ok(el('staff').children[0].style.width.endsWith('px'));
});

test('in 6/8 le stanghette e le sei crome guidano la scrittura',()=>{
 el('meter').onchange({target:{value:'6/8'}});
 const svg=()=>el('staff').children[0],hit=()=>svg().children.find(node=>node.attributes.class==='manualHit');
 assert.equal(svg().children.filter(node=>node.attributes.class==='barline').length,5);
 assert.equal(svg().children.filter(node=>node.attributes.class==='beatGuide grouped').length,4);
 el('noteTools').children[4].onclick();
 hit().onpointermove({clientX:Number(svg().children.find(n=>n.attributes.class==='barline').attributes.x1)+12*10/7,clientY:212.71428571428572});
 assert.match(el('cursorReadout').textContent,/Battuta 9 · croma 1\/6/);
 hit().onclick({clientX:Number(svg().children.find(n=>n.attributes.class==='barline').attributes.x1)+12*10/7,clientY:212.71428571428572});
 el('restTools').children[4].onclick();
 hit().onclick({clientX:Number(svg().children.find(n=>n.attributes.class==='beatGuide').attributes.x1),clientY:212.71428571428572});
 assert.equal(el('bassEditor').children.length,1);
 const rests=svg().children.filter(node=>node.attributes.class==='restGlyph');
 assert.equal(rests.length,1);
});

test('la tastiera scrive note con la figura scelta e le parti late spostano il tenore in violino',()=>{
 el('meter').onchange({target:{value:'4/4'}});el('key').onchange({target:{value:'Do maggiore'}});el('clearAll').onclick();
 el('noteTools').children[2].onclick();
 listeners.get('keydown')({key:'g',target:{},preventDefault(){}});
 assert.match(el('bassEditor').children[0].textContent,/Sol2 · Minima/);
 listeners.get('keydown')({key:'a',target:{},preventDefault(){}});
 assert.equal(el('bassEditor').children.length,2);
 el('solve').onclick();
 const tenor=()=>el('staff').children[0].children.find(n=>n.attributes['aria-label']?.includes('tenore'))?.children.find(n=>n.tagName==='ellipse');
 const tightY=Number(tenor().attributes.cy);
 el('partSpacing').onchange({target:{value:'late'}});
 assert.notEqual(Number(tenor().attributes.cy),tightY);

});

test('la scelta delle settime aggiorna il livello e i gradi sono sotto gli accordi',()=>{
 el('key').onchange({target:{value:'Do maggiore'}});
 el('generateMode').onclick();
 el('seventhEnabled').onchange({target:{checked:true}});
 assert.equal(el('level').value,'3');
 assert.equal(el('seventhFilters').hidden,false);
 assert.equal(el('seventhDegrees').children.length,7);
 assert.equal(el('seventhDegrees').children[3].children[0].disabled,true);
 assert.equal(el('seventhDegrees').children[6].children[0].disabled,true);
 el('verify').onclick();
 assert.match(el('feedback').textContent,/Nessuna violazione/);
 const chord=el('staff').children[0].children.find(node=>node.attributes.class==='chordText');
 assert.ok(chord);
 assert.ok(Number(chord.attributes.y)>227.71428571428572);
 el('seventhEnabled').onchange({target:{checked:false}});
 assert.equal(el('seventhFilters').hidden,true);
});

test('in 4/4 tre semiminime mostrano la pausa mancante; la quarta completa la battuta',()=>{
 el('meter').onchange({target:{value:'4/4'}});
 el('clearAll').onclick();
 el('noteTools').children[3].onclick();
 const hit=()=>el('staff').children[0].children.find(node=>node.attributes.class==='manualHit');
 for(let i=0;i<3;i++)clickQuarter(i,212.71428571428572);
 let svg=el('staff').children[0];
 assert.ok(svg.children.some(node=>node.attributes.class==='restGlyph implicitRest'));
 assert.ok(svg.children.some(node=>node.attributes.class==='measureBalance'&&node.textContent==='3/4 scritti · 1/4 in pausa'));
 clickQuarter(3,212.71428571428572);
 svg=el('staff').children[0];
 assert.equal(svg.children.filter(node=>node.attributes.class==='measureBalance'&&Number(node.attributes.x)<Number(svg.children.filter(n=>n.attributes.class==='barline')[1].attributes.x1)).length,0);
 el('solve').onclick();
 assert.doesNotMatch(el('status').textContent,/La battuta/);
});

test('armature con sette alterazioni restano davanti alla metrica e alle note',()=>{
 el('generateMode').onclick();
 for(const [key,symbol] of [['Do♯ maggiore','♯'],['Do♭ maggiore','♭'],['La♯ minore','♯']]){
  el('key').onchange({target:{value:key}});
  const children=el('staff').children[0].children;
  const signs=children.filter(node=>node.attributes.class==='keySignature'&&node.attributes['data-system']==='0');
  assert.equal(signs.length,14);
  assert.ok(signs.every(node=>node.attributes['aria-label']===symbol));
  assert.deepEqual([...new Set(signs.map(node=>Number(node.attributes.x)))],[54,64,74,84,94,104,114]);
  const time=children.find(node=>node.attributes.class==='timeSignature');
  const bar=children.find(node=>node.attributes.class==='barline');
  assert.ok(Number(time.attributes.x)>114);
  assert.ok(Number(bar.attributes.x1)>Number(time.attributes.x));
  assert.match(el('resultCount').textContent,/[1-4] soluzioni/);
 }
});

test('il basso Fa maggiore con sensibile discendente spiega il blocco e offre Do maggiore',()=>{
 el('key').onchange({target:{value:'Fa maggiore'}});
 el('writeMode').onclick();
 el('noteTools').children[3].onclick();
 const notes=[244,239,259,244,249,254,259,254,249,244];
 for(let i=0;i<notes.length;i++){
  const hit=el('staff').children[0].children.find(node=>node.attributes.class==='manualHit');
  clickQuarter(i,notes[i]-142+67*10/7);
 }
 assert.equal(el('bassEditor').children.length,10);
 el('solve').onclick();
 assert.match(el('status').textContent,/note 5 e 6.*Mi3.*Re3/);
 const action=el('status').children.at(-1);
 assert.equal(action.textContent,'Prova in Do maggiore');
 action.onclick();
 assert.equal(el('key').value,'Do maggiore');
 assert.equal(el('bassEditor').children.length,10);
 assert.match(el('resultCount').textContent,/[1-4] soluzioni/);
});

test('in Fa maggiore il livello 1 spiega V6 e promuove il basso scritto al livello 2',()=>{
 el('clearAll').onclick();
 el('key').onchange({target:{value:'Fa maggiore'}});
 el('level').onchange({target:{value:'1'}});
 el('noteTools').children[3].onclick();
 for(const [i,y] of [244,249,244,239,259,244].entries()){
  const hit=el('staff').children[0].children.find(node=>node.attributes.class==='manualHit');
  clickQuarter(i,y-142+67*10/7);
 }
 assert.equal(el('bassEditor').children.length,6);
 el('solve').onclick();
 assert.match(el('status').textContent,/V6 sulla nota 2 \(Mi3\)/);
 const action=el('status').children.at(-1);
 assert.equal(action.textContent,'Passa al livello 2');
 action.onclick();
 assert.equal(el('level').value,'2');
 assert.equal(el('bassEditor').children.length,6);
 assert.match(el('resultCount').textContent,/[1-4] soluzioni/);
});

test('importazione MSCX mostra anteprima e inserisce senza armonizzare',async()=>{
 const xml=`<museScore><Score><Part><longName>Basso</longName><Staff id="1"/></Part><Staff id="1"><Measure><voice><KeySig><accidental>0</accidental></KeySig><TimeSig><sigN>4</sigN><sigD>4</sigD></TimeSig><Chord><durationType>quarter</durationType><Note><pitch>48</pitch></Note></Chord><Chord><durationType>quarter</durationType><Note><pitch>53</pitch></Note></Chord><Chord><durationType>quarter</durationType><Note><pitch>55</pitch></Note></Chord><Chord><durationType>quarter</durationType><Note><pitch>48</pitch></Note></Chord></voice></Measure></Staff></Score></museScore>`;
 await el('scoreFile').onchange({target:{files:[{name:'esercizio.mscx',size:xml.length,text:async()=>xml}],value:'esercizio.mscx'}});
 assert.equal(el('importPanel').hidden,false);
 assert.equal(el('reviewRows').children.length,4);
 assert.equal(el('confirmImport').disabled,false);
 el('confirmImport').onclick();
 assert.equal(el('bassEditor').children.length,4);
 assert.match(el('bassEditor').children[0].textContent,/Do3/);
 assert.match(el('status').textContent,/Importato Basso/);
 assert.equal(el('resultCount').textContent,'0 soluzioni');
});

test('evento manuale V7/V si vede in partitura, resta in Do e supera la verifica',async()=>{
 el('clearAll').onclick();el('key').onchange({target:{value:'Do maggiore'}});el('modulationMode').onchange({target:{value:'off'}});el('noteTools').children[3].onclick();
 for(const key of ['c','d','g','c'])listeners.get('keydown')({key,target:{},preventDefault(){}});
 el('tonalKind').value='tonicization';el('tonalIndex').value='2';el('tonalDegree').value='4';el('tonalFigure').value='V7';el('addTonalEvent').onclick();el('solve').onclick();
 assert.match(el('resultCount').textContent,/[1-4] soluzioni/);
 assert.match(el('tonalReading').children[0].textContent,/tonicizzazioni/);
 assert.ok(el('staff').children[0].children.some(n=>n.textContent==='V7 del V'));
 el('verify').onclick();assert.match(el('feedback').textContent,/Nessuna violazione/);
 el('tonalEvents').children[0].children[1].onclick();assert.equal(el('tonalEvents').children.length,0);
});

test('il generatore segue destinazione e ritorno; le regioni tonali sono visibili',()=>{
 el('modulationMode').onchange({target:{value:'manual'}});el('tonalDestination').onchange({target:{value:'Sol maggiore'}});el('returnHome').onchange({target:{checked:true}});el('generateMode').onclick();el('newBass').onclick();
 assert.match(el('resultCount').textContent,/[1-4] soluzioni/);
 assert.equal(el('tonalEvents').children.length,2);
 assert.match(el('tonalReading').children[0].textContent,/Do maggiore → Sol maggiore.*Sol maggiore → Do maggiore/);
 assert.ok(el('staff').children[0].children.some(n=>n.attributes.class==='tonalKeyText'));
 el('verify').onclick();assert.match(el('feedback').textContent,/Nessuna violazione/);
 el('modulationMode').onchange({target:{value:'off'}});el('secondaryEnabled').onchange({target:{checked:false}});
});

test('tonicizzazione estesa manuale resta distinta dalla modulazione ed è verificabile',()=>{
 el('clearAll').onclick();el('key').onchange({target:{value:'Do maggiore'}});el('noteTools').children[3].onclick();el('accidentalTools').children[0].onclick();
 for(const key of ['c','a','d','g','c'])listeners.get('keydown')({key,target:{},preventDefault(){}});
 el('tonalKind').value='extendedTonicization';el('tonalIndex').value='2';el('tonalConfirm').value='4';el('tonalDegree').value='4';el('addTonalEvent').onclick();
 assert.match(el('resultCount').textContent,/[1-4] soluzioni/);assert.match(el('tonalReading').children[0].textContent,/tonicizzazioni/);
 assert.ok(el('staff').children[0].children.some(n=>n.attributes.class==='tonicizationBracket'));
 el('verify').onclick();assert.match(el('feedback').textContent,/Nessuna violazione/);
});

test('modulazione guidata: due clic, proposta, ricalcolo e conferma esplicita',async()=>{
 el('clearAll').onclick();el('key').onchange({target:{value:'Do maggiore'}});el('modulationMode').onchange({target:{value:'off'}});el('secondaryEnabled').onchange({target:{checked:false}});
 const xml=`<museScore><Score><Staff id="1"><Measure><voice><TimeSig><sigN>4</sigN><sigD>4</sigD></TimeSig>${[48,57,54,55].map(p=>`<Chord><durationType>quarter</durationType><Note><pitch>${p}</pitch>${p===54?'<tpc>20</tpc>':''}</Note></Chord>`).join('')}</voice></Measure></Staff></Score></museScore>`;
 await el('scoreFile').onchange({target:{files:[{name:'modulazione.mscx',size:xml.length,text:async()=>xml}],value:''}});el('confirmImport').onclick();
 el('selectModulation').onclick();assert.match(el('modulationPrompt').textContent,/Seleziona la nota alterata/);
 assert.ok(!el('staff').children[0].children.some(n=>n.attributes.class==='manualHit'));
 el('bassEditor').children[2].onclick();assert.match(el('modulationPrompt').textContent,/seleziona la nota di arrivo/);
 el('bassEditor').children[3].onclick();assert.equal(el('modulationChoice').hidden,false);
 el('calculateModulation').onclick();assert.match(el('modulationPrompt').textContent,/Sol maggiore, confermi/);assert.equal(el('tonalEvents').children.length,0);
 el('recalculateModulation').onclick();assert.equal(el('modulationKeyMode').value,'manual');assert.equal(el('tonalEvents').children.length,0);
 el('wizardKey').value='Sol maggiore';el('calculateModulation').onclick();el('confirmModulation').onclick();assert.equal(el('resultCount').textContent,'0 soluzioni');el('solve').onclick();
 assert.equal(el('tonalEvents').children.length,1);assert.match(el('resultCount').textContent,/[1-4] soluzioni/);
 el('verify').onclick();assert.match(el('feedback').textContent,/Nessuna violazione/);
 el('selectModulation').onclick();el('cancelModulation').onclick();assert.equal(el('cancelModulation').hidden,true);
});

test('la selezione manuale rifiuta un arrivo precedente e può essere annullata',()=>{
 el('selectModulation').onclick();el('bassEditor').children[2].onclick();el('bassEditor').children[1].onclick();assert.match(el('status').textContent,/deve seguire/);el('cancelModulation').onclick();assert.equal(el('modulationChoice').hidden,true);
});

test('il calcolo lungo non blocca l editor e i risultati obsoleti sono ignorati',async()=>{
 const workers=[];globalThis.Worker=class {constructor(url){this.url=String(url);workers.push(this)}postMessage(args){this.args=args}terminate(){this.terminated=true}};
 const xml=`<museScore><Score><Staff id="1">${Array.from({length:4},()=>'<Measure><voice>'+[48,53,55,48].map(p=>`<Chord><durationType>quarter</durationType><Note><pitch>${p}</pitch></Note></Chord>`).join('')+'</voice></Measure>').join('')}</Staff></Score></museScore>`;
 await el('scoreFile').onchange({target:{files:[{name:'lungo.mscx',size:xml.length,text:async()=>xml}],value:''}});el('confirmImport').onclick();assert.equal(workers.length,0);el('solve').onclick();
 const worker=workers.at(-1);assert.ok(new URL(worker.url).pathname.endsWith('solver-worker.mjs'));assert.equal(worker.args.bass.length,16);assert.match(el('status').textContent,/Analizzo/);
 el('clearAll').onclick();assert.equal(worker.terminated,true);worker.onmessage({data:{result:{solutions:[[]]}}});assert.equal(el('bassEditor').children.length,0);assert.equal(el('resultCount').textContent,'0 soluzioni');delete globalThis.Worker;
});

async function simpleScore(){
 el('clearAll').onclick();el('key').onchange({target:{value:'Do maggiore'}});el('modulationMode').onchange({target:{value:'off'}});el('secondaryEnabled').onchange({target:{checked:false}});el('level').onchange({target:{value:'3'}});
 const xml=`<museScore><Score><Staff id="1"><Measure><voice><TimeSig><sigN>4</sigN><sigD>4</sigD></TimeSig>${[48,53,55,48].map(p=>`<Chord><durationType>quarter</durationType><Note><pitch>${p}</pitch></Note></Chord>`).join('')}</voice></Measure></Staff></Score></museScore>`;
 await el('scoreFile').onchange({target:{files:[{name:'basso.mscx',text:async()=>xml,size:xml.length}],value:''}});el('confirmImport').onclick();el('seventhEnabled').onchange({target:{checked:false}});el('solve').onclick();
}
test('vista continua include tutte le battute; pagine intere contengono più sistemi',async()=>{
 await simpleScore();for(let i=0;i<8;i++)el('addMeasure').onclick();el('scoreLayout').onchange({target:{value:'scroll'}});assert.match(el('staff').children[0].attributes['aria-label'],/Battute 1–12/);assert.equal(el('nextMeasures').hidden,true);
 el('scoreLayout').onchange({target:{value:'pages'}});assert.equal(el('staff').children.length,1);assert.equal(el('staff').children[0].className,'scorePage');assert.equal(el('staff').children[0].children.filter(n=>n.tagName==='svg').length,3);
 el('scoreLayout').onchange({target:{value:'paged'}});
});
test('mostra/nascondi cifratura conserva tutte le note e la selezione',()=>{
 el('bassEditor').children[0].onclick();const before=el('staff').children[0].children.filter(n=>n.attributes.class==='noteTarget').length;el('figuresOnly').onclick();let svg=el('staff').children[0];assert.equal(svg.children.filter(n=>n.attributes.class==='noteTarget').length,before);assert.equal(svg.children.filter(n=>n.attributes.class==='chordText'||n.attributes.class==='tonalText').length,0);assert.match(el('figuresOnly').textContent,/nascosta/);el('figuresOnly').onclick();svg=el('staff').children[0];const fig=svg.children.find(n=>n.attributes.class==='chordText');assert.ok(fig);fig.onclick();assert.match(el('selectionLabel').textContent,/Basso/);
});
test('cadenza su battuta mostra anteprima e annulla senza modificare il basso',()=>{
 const before=el('bassEditor').children.map(n=>n.textContent);el('cadenceType').value='plagal';el('selectCadence').onclick();el('staff').children[0].children.find(n=>n.attributes.class==='barLabel').onclick();assert.match(el('harmonyChanges').textContent,/IV → I/);assert.match(el('harmonyChanges').textContent,/basso/);assert.deepEqual(el('bassEditor').children.map(n=>n.textContent),before);el('cancelHarmony').onclick();assert.deepEqual(el('bassEditor').children.map(n=>n.textContent),before);assert.equal(el('harmonyAction').hidden,true);
});
test('conferma settima applica V7, la verifica passa e il ricalcolo la mantiene',()=>{
 el('bassEditor').children[2].onclick();el('addSeventh').onclick();assert.match(el('status').textContent,/Settima aggiunta: V7/);el('verify').onclick();assert.match(el('feedback').textContent,/Nessuna violazione/);el('solve').onclick();assert.ok(el('staff').children[0].children.some(n=>n.textContent==='V7'));
});
test('schermo intero usa pagine intere e può essere chiuso anche senza API nativa',async()=>{
 await el('fullscreenScore').onclick();assert.equal(el('scoreLayout').value,'pages');assert.match(el('scoreView').className,/fullscreenFallback/);listeners.get('keydown')({key:'Escape',target:{},preventDefault(){}});assert.equal(el('scoreView').className,'scoreView');el('scoreLayout').onchange({target:{value:'paged'}});
});
test('N alterna scrittura e selezione completa; copia incolla conserva tutte le voci e Backspace elimina',async()=>{
 await simpleScore();listeners.get('keydown')({key:'n',target:{},preventDefault(){}});assert.match(el('manualMode').textContent,/no/);el('bassEditor').children[0].onclick();assert.match(el('selectionLabel').textContent,/Accordo I/);const groups=el('staff').children[0].children.filter(n=>n.attributes.class==='noteTarget'&&n.attributes['aria-label']?.startsWith('Nota 1,'));assert.equal(groups.length,4);assert.ok(groups.every(g=>g.children.some(n=>n.attributes.class?.includes('selected'))));
 listeners.get('keydown')({key:'c',ctrlKey:true,target:{},preventDefault(){}});el('bassEditor').children[3].onclick();listeners.get('paste')({target:{},clipboardData:{files:[],getData:t=>t==='application/x-armonizza'?'selection':''},preventDefault(){}});assert.match(el('status').textContent,/Accordo incollato con tutte le voci/);assert.equal(el('bassEditor').children.length,4);listeners.get('keydown')({key:'Backspace',target:{},preventDefault(){}});assert.equal(el('bassEditor').children.length,3);assert.ok(el('staff').children[0].children.some(n=>n.attributes.class==='noteTarget'));listeners.get('keydown')({key:'n',target:{},preventDefault(){}});assert.match(el('manualMode').textContent,/sì/);
});
test('II viene mostrato sul comando e la settima viene aggiunta direttamente alla selezione',async()=>{
 await simpleScore();el('clearAll').onclick();el('level').onchange({target:{value:'1'}});el('noteTools').children[3].onclick();for(const key of ['c','d','g','c'])listeners.get('keydown')({key,target:{},preventDefault(){}});el('solve').onclick();listeners.get('keydown')({key:'n',target:{},preventDefault(){}});el('bassEditor').children[1].onclick();assert.match(el('addSeventh').textContent,/Re3 · II/);el('addSeventh').onclick();assert.match(el('status').textContent,/Settima aggiunta: II7/);el('verify').onclick();assert.match(el('feedback').textContent,/Nessuna violazione/);listeners.get('keydown')({key:'n',target:{},preventDefault(){}});
});
test('MusicXML e PDF chiedono se includere i gradi e consentono di annullare',()=>{
 el('musicxml').onclick();assert.equal(el('exportOptions').hidden,false);assert.match(el('exportTitle').textContent,/MusicXML/);el('exportDegrees').checked=false;el('cancelExport').onclick();assert.equal(el('exportOptions').hidden,true);el('pdf').onclick();assert.match(el('exportTitle').textContent,/PDF/);assert.equal(el('exportOptions').hidden,false);el('cancelExport').onclick();
});
test('i download reali rispettano la scelta dei gradi anche con cifratura nascosta',async()=>{
 await simpleScore();const blobs=[],old=URL.createObjectURL;URL.createObjectURL=blob=>{blobs.push(blob);return old(blob)};
 try{el('musicxml').onclick();el('exportDegrees').checked=false;await el('confirmExport').onclick();assert.doesNotMatch(await blobs.at(-1).text(),/<direction/);el('musicxml').onclick();el('exportDegrees').checked=true;await el('confirmExport').onclick();assert.match(await blobs.at(-1).text(),/<direction placement="below">/);el('figuresOnly').onclick();el('pdf').onclick();el('exportDegrees').checked=false;await el('confirmExport').onclick();assert.equal(blobs.at(-1).type,'application/pdf');assert.equal(new TextDecoder().decode((await blobs.at(-1).arrayBuffer()).slice(0,5)),'%PDF-');assert.match(el('status').textContent,/PDF esportato senza gradi/);assert.match(el('figuresOnly').textContent,/nascosta/);el('figuresOnly').onclick();}finally{URL.createObjectURL=old}
});

test('teste proporzionate, chiavi vettoriali e guide ritmiche fuori dai righi',async()=>{
 await simpleScore();const svg=el('staff').children[0];
 const clefs=svg.children.filter(n=>n.attributes.class==='clefOutline');assert.equal(clefs.length,2);assert.match(clefs[1].attributes.transform,/223.428/);
 const heads=svg.children.filter(n=>n.attributes.class==='noteTarget').flatMap(g=>g.children.filter(n=>n.tagName==='ellipse'));assert.ok(heads.length);assert.ok(heads.every(n=>Math.abs(Number(n.attributes.ry)-2.7*10/7)<1e-9));
 const guides=svg.children.filter(n=>n.attributes.class?.startsWith('beatGuide'));assert.ok(guides.length);assert.ok(guides.every(n=>Number(n.attributes.y1)>227.71428571428572));
});
test('minime mantengono il centro esatto sul rigo e un interno trasparente',()=>{
 el('clearAll').onclick();el('noteTools').children[2].onclick();const svg=()=>el('staff').children[0];const hit=svg().children.find(n=>n.attributes.class==='manualHit');hit.onclick({clientX:145.142857,clientY:227.71428571428572});
 const head=svg().children.find(n=>n.attributes.class==='noteTarget').children.find(n=>n.tagName==='ellipse');assert.equal(Number(head.attributes.cy),227.71428571428572);assert.match(head.attributes.class,/hollow/);assert.ok(Math.abs(Number(head.attributes.ry)-2.7*10/7)<1e-9);
});

test('la vista a pagina e lo scorrimento non rimpiccioliscono le note su mobile',async()=>{
 await simpleScore();for(const mode of ['paged','scroll','pages']){el('scoreLayout').onchange({target:{value:mode}});const systems=mode==='pages'?el('staff').children.flatMap(page=>page.children.filter(n=>n.tagName==='svg')):[el('staff').children[0]];for(const svg of systems){assert.equal(Number(svg.attributes['data-staff-space']),16.5);assert.equal(svg.style.width,svg.style.minWidth);const logicalWidth=Number(svg.attributes.viewBox.split(' ')[2]);assert.ok(Math.abs(parseFloat(svg.style.minWidth)/logicalWidth-1.65)<1e-9);}}el('scoreLayout').onchange({target:{value:'paged'}});
});


test('anteprima corregge un’altezza, annulla senza modificare e blocca durate sovrapposte',async()=>{
 await simpleScore();const before=el('bassEditor').children.map(x=>x.textContent);
 const xml='<museScore><Score><Staff id="1"><Measure><voice><Chord><durationType>quarter</durationType><Note><pitch>48</pitch></Note></Chord><Chord><durationType>quarter</durationType><Note><pitch>50</pitch></Note></Chord></voice></Measure></Staff></Score></museScore>';
 await el('scoreFile').onchange({target:{files:[{name:'prova.mscx',text:async()=>xml,size:xml.length}],value:''}});
 assert.equal(el('app').inert,true);const first=el('reviewRows').children[0];const octave=first.children[6].children[0];octave.value='2';octave.onchange();assert.equal(el('confirmImport').disabled,false);const duration=el('reviewRows').children[0].children[7].children[0];duration.value='whole';duration.onchange();assert.equal(el('confirmImport').disabled,true);assert.match(el('reviewValidation').textContent,/sovrapposte|metrica/);el('importCancel').onclick();assert.equal(el('app').inert,false);assert.deepEqual(el('bassEditor').children.map(x=>x.textContent),before);
});
test('basso importato resta senza armonia anche modificando metrica e tonalità',async()=>{
 const xml='<museScore><Score><Staff id="1"><Measure><voice><Chord><durationType>quarter</durationType><Note><pitch>48</pitch></Note></Chord></voice></Measure></Staff></Score></museScore>';
 await el('scoreFile').onchange({target:{files:[{name:'prova.mscx',text:async()=>xml,size:xml.length}],value:''}});el('confirmImport').onclick();el('meter').onchange({target:{value:'3/4'}});el('key').onchange({target:{value:'Do maggiore'}});assert.equal(el('resultCount').textContent,'0 soluzioni');el('solve').onclick();assert.match(el('resultCount').textContent,/[1-4] soluzioni/);
});

async function chromaticScore(pitches=[48,57,54,55]){
 el('clearAll').onclick();el('key').onchange({target:{value:'Do maggiore'}});el('modulationMode').onchange({target:{value:'off'}});
 const xml=`<museScore><Score><Staff id="1">${Array.from({length:Math.ceil(pitches.length/4)},(_,bar)=>`<Measure><voice><TimeSig><sigN>4</sigN><sigD>4</sigD></TimeSig>${pitches.slice(bar*4,bar*4+4).map(p=>`<Chord><durationType>quarter</durationType><Note><pitch>${p}</pitch>${p===54?'<tpc>20</tpc>':''}</Note></Chord>`).join('')}</voice></Measure>`).join('')}</Staff></Score></museScore>`;
 await el('scoreFile').onchange({target:{files:[{name:'cromatico.mscx',size:xml.length,text:async()=>xml}],value:''}});el('confirmImport').onclick();
}
test('rilevamento propone due tonalità senza applicarle; scelta manuale e conferma salvano quella scelta',async()=>{
 await chromaticScore();const before=el('bassEditor').children.map(x=>x.textContent);
 el('detectChromaticModulations').onclick();assert.equal(el('chromaticReview').hidden,false);
 const row=el('chromaticReviewRows').children[0];assert.match(row.children[0].textContent,/Nota 3.*Fa♯/);
 assert.deepEqual(row.children[1].children.map(x=>x.textContent),['Sol maggiore','Mi minore']);assert.equal(el('tonalEvents').children.length,0);assert.deepEqual(el('bassEditor').children.map(x=>x.textContent),before);
 row.children[1].children[1].onclick();assert.equal(row.children[3].value,'Mi minore');assert.equal(row.children[4].value,'');
 row.children[3].value='Sol maggiore';row.children[3].onchange();row.children[6].onclick();assert.equal(el('tonalEvents').children.length,1);assert.match(el('tonalEvents').children[0].children[0].textContent,/Sol maggiore/);assert.equal(el('chromaticReviewRows').children.length,0);assert.deepEqual(el('bassEditor').children.map(x=>x.textContent),before);
});
test('proposta senza arrivo resta visibile, conferma richiede arrivo e Ignora non modifica il basso',async()=>{
 await chromaticScore([48,54]);el('detectChromaticModulations').onclick();const row=el('chromaticReviewRows').children[0];assert.ok(row.children[1].children.length>0);row.children[6].onclick();assert.match(el('status').textContent,/nota di arrivo successiva/);assert.equal(el('tonalEvents').children.length,0);row.children[7].onclick();assert.equal(el('chromaticReviewRows').children.length,0);assert.equal(el('bassEditor').children.length,2);
});
test('confermare due modulazioni non riapre la prima; rilevamento ripetuto resta vuoto',async()=>{
 await chromaticScore([61,62,66,67]);el('detectChromaticModulations').onclick();
 const confirm=(number,key,arrival)=>{const row=el('chromaticReviewRows').children.find(r=>r.children[0].textContent.startsWith('Nota '+number+':'));assert.ok(row,'proposta '+number);row.children[3].value=key;row.children[3].onchange();row.children[4].value=String(arrival);row.children[4].onchange();row.children[6].onclick()};
 confirm(1,'Re minore',1);assert.ok(!el('chromaticReviewRows').children.some(r=>r.children[0].textContent.startsWith('Nota 1:')));confirm(3,'Sol maggiore',3);
 assert.equal(el('tonalEvents').children.length,2);el('detectChromaticModulations').onclick();assert.equal(el('chromaticReviewRows').children.length,0);
});
test('Ignora e alterazione locale restano esclusi quando si conferma un’altra proposta',async()=>{
 for(const local of [false,true]){await chromaticScore([54,55,61,62]);el('detectChromaticModulations').onclick();const first=el('chromaticReviewRows').children[0];if(local){first.children[5].value='local';first.children[6].onclick()}else first.children[7].onclick();
 const other=el('chromaticReviewRows').children.find(r=>r.children[0].textContent.startsWith('Nota 3:'));other.children[3].value='Re minore';other.children[3].onchange();other.children[4].value='3';other.children[4].onchange();other.children[6].onclick();el('detectChromaticModulations').onclick();assert.equal(el('chromaticReviewRows').children.length,0)}
});
test('battute con pulsanti: aggiunge, elimina quella scelta anche in scrittura e mantiene almeno una battuta',async()=>{
 await simpleScore();if(el('manualMode').textContent.includes('no'))el('manualMode').onclick();el('addMeasure').onclick();assert.match(el('measureRange').textContent,/di 5/);assert.equal(el('measureToDelete').value,'5');assert.match(el('status').textContent,/Battuta 5 aggiunta/);
 el('removeMeasure').onclick();assert.match(el('measureRange').textContent,/di 4/);assert.equal(el('bassEditor').children.length,4);
 el('measureToDelete').value='1';el('removeMeasure').onclick();assert.equal(el('bassEditor').children.length,0);assert.match(el('measureRange').textContent,/di 3/);
 for(let n=0;n<3;n++){el('measureToDelete').value='1';el('removeMeasure').onclick()}assert.match(el('measureRange').textContent,/di 1/);el('addMeasure').onclick();assert.match(el('measureRange').textContent,/di 2/);
});
test('eliminazione battute rifiuta numeri fuori intervallo senza cambiare il basso',async()=>{
 await simpleScore();const before=el('bassEditor').children.map(e=>e.textContent);for(const value of ['0','5','1.5','abc']){el('measureToDelete').value=value;el('removeMeasure').onclick();assert.match(el('status').textContent,/Scegli una battuta/);assert.deepEqual(el('bassEditor').children.map(e=>e.textContent),before);assert.match(el('measureRange').textContent,/di 4/)}
});
test('bequadro ha nome corretto ed è esplicito anche sulla nota Do in Do maggiore',()=>{
 el('clearAll').onclick();el('key').onchange({target:{value:'Do maggiore'}});el('noteTools').children[3].onclick();el('accidentalTools').children[1].onclick();assert.equal(el('accidentalTools').children[1].title,'Bequadro');listeners.get('keydown')({key:'c',target:{},preventDefault(){}});assert.match(el('bassEditor').children[0].textContent,/Do♮3/);el('detectChromaticModulations').onclick();assert.equal(el('chromaticReviewRows').children.length,0);
});
test('conferma manuale diretta e cambio della scelta non usano una proposta obsoleta',async()=>{
 await chromaticScore();el('selectModulation').onclick();el('bassEditor').children[2].onclick();el('bassEditor').children[3].onclick();el('calculateModulation').onclick();el('chooseModulationKey').onclick();el('wizardKey').value='Mi minore';el('wizardKey').onchange();el('wizardKey').value='Sol maggiore';el('wizardKey').onchange();assert.equal(el('modulationConfirmation').hidden,false);el('confirmModulation').onclick();assert.equal(el('tonalEvents').children.length,1);assert.match(el('tonalEvents').children[0].children[0].textContent,/Sol maggiore/);
});
test('confermare una proposta non interrompe il ricalcolo asincrono del basso lungo',async()=>{
 const workers=[];globalThis.Worker=class {constructor(){workers.push(this)}postMessage(args){this.args=args}terminate(){this.terminated=true}};
 try{await chromaticScore([48,57,54,...Array(13).fill(55)]);el('solve').onclick();el('detectChromaticModulations').onclick();assert.equal(workers.at(-1).terminated,true);el('chromaticReviewRows').children[0].children[6].onclick();assert.equal(workers.at(-1).terminated,undefined);assert.equal(workers.at(-1).args.tonalEvents[0].key,'Sol maggiore');el('clearAll').onclick();}finally{delete globalThis.Worker}
});

test('calcolo breve usa il worker e un messaggio di avanzamento non termina il calcolo',async()=>{
 await chromaticScore([48,55,48]);const workers=[];globalThis.Worker=class{constructor(){workers.push(this)}postMessage(args){this.args=args}terminate(){this.terminated=true}};
 try{el('solve').onclick();const w=workers.at(-1);assert.ok(w);assert.equal(w.args.bass.length,3);w.onmessage({data:{progress:{note:2,total:3}}});assert.equal(w.terminated,undefined);assert.match(el('status').textContent,/nota 2 di 3/);const{harmonizeTonal}=await import('../sito/public/app/tonal.mjs');w.onmessage({data:{result:harmonizeTonal(w.args)}});assert.equal(w.terminated,true);assert.match(el('resultCount').textContent,/[1-4] soluzioni/);}finally{delete globalThis.Worker}
});
test('diagnosi ricevuta dal worker mostra il rimedio senza ricalcolarlo sul thread dell’interfaccia',async()=>{
 await chromaticScore([48]);const workers=[];globalThis.Worker=class{constructor(){workers.push(this)}postMessage(){}terminate(){}};
 try{el('solve').onclick();workers.at(-1).onmessage({data:{progress:{phase:'diagnosis'}}});assert.match(el('status').textContent,/vincoli e le alternative/);workers.at(-1).onmessage({data:{result:{solutions:[],assessment:{message:'Il livello 2 consente la disposizione richiesta.',alternativeLevel:2}}}});assert.match(el('status').textContent,/livello 2/);assert.equal(el('status').children.at(-1).textContent,'Passa al livello 2');}finally{delete globalThis.Worker}
});

test('attivare modulazioni automatiche mantiene vivo il worker mentre apre le proposte',async()=>{
 await chromaticScore();el('solve').onclick();const workers=[];globalThis.Worker=class{constructor(){workers.push(this)}postMessage(args){this.args=args}terminate(){this.terminated=true}};
 try{el('modulationMode').onchange({target:{value:'auto'}});const w=workers.at(-1);assert.ok(w);assert.equal(w.terminated,undefined);assert.equal(el('chromaticReview').hidden,false);w.onmessage({data:{progress:{note:1,total:4}}});assert.match(el('status').textContent,/nota 1 di 4/);w.onmessage({data:{result:{solutions:[],diagnosis:'Serve confermare la destinazione tonale.'}}});assert.equal(w.terminated,true);assert.match(el('status').textContent,/confermare/);}finally{el('clearAll').onclick();delete globalThis.Worker}
});
test('interrompere il calcolo per rivedere le alterazioni elimina il messaggio Analizzo',async()=>{
 await chromaticScore();globalThis.Worker=class{postMessage(){}terminate(){this.terminated=true}};
 try{el('solve').onclick();assert.match(el('status').textContent,/Analizzo/);el('detectChromaticModulations').onclick();assert.match(el('status').textContent,/Calcolo interrotto/);}finally{el('clearAll').onclick();delete globalThis.Worker}
});
test('worker bloccato termina dopo il limite senza dichiarare impossibilità e ignora risposte tardive',async()=>{
 await chromaticScore([48,55,48]);const originalTimeout=globalThis.setTimeout,originalClear=globalThis.clearTimeout;let watchdog,cleared=false,w;
 globalThis.setTimeout=(fn,ms)=>{assert.equal(ms,90000);watchdog=fn;return {unref(){}}};globalThis.clearTimeout=()=>{cleared=true};globalThis.Worker=class{constructor(){w=this}postMessage(){}terminate(){this.terminated=true}};
 try{el('solve').onclick();watchdog();assert.equal(w.terminated,true);assert.ok(cleared);assert.match(el('status').textContent,/non significa che sia impossibile/);assert.equal(el('bassEditor').children.length,3);w.onmessage({data:{result:{solutions:[]}}});assert.match(el('status').textContent,/90 secondi/);}finally{el('clearAll').onclick();globalThis.setTimeout=originalTimeout;globalThis.clearTimeout=originalClear;delete globalThis.Worker}
});

test('recupero verificato libera le altre voci mantenendo identiche note, durate e tonalità del basso',async()=>{
 await chromaticScore([54,47]);el('key').value='Si minore';el('key').onchange({target:{value:'Si minore'}});el('modulationMode').onchange({target:{value:'manual'}});
 const before=el('bassEditor').children.map(x=>x.textContent);let w;globalThis.Worker=class{constructor(){w=this}postMessage(args){this.args=args}terminate(){this.terminated=true}};
 try{el('solve').onclick();const{harmonizeTonal}=await import('../sito/public/app/tonal.mjs');const r=harmonizeTonal({...w.args,locks:{1:{3:61}},harmonicRequests:{0:{root:4},1:{root:0}}});assert.ok(r.recovery);w.onmessage({data:{result:r}});assert.equal(el('status').children.at(-1).textContent,'Armonizza mantenendo solo il basso');el('status').children.at(-1).onclick();assert.deepEqual(el('bassEditor').children.map(x=>x.textContent),before);assert.equal(el('key').value,'Si minore');assert.match(el('resultCount').textContent,/[1-4] soluzioni/);el('verify').onclick();assert.doesNotMatch(el('feedback').textContent,/non validi|Errore/);}finally{el('clearAll').onclick();delete globalThis.Worker}
});

test('Scrivi basso invia davvero Automatico al motore e armonizza senza blocchi',async()=>{
 await chromaticScore([48,57,54,55,43,53,52,48]);el('secondaryEnabled').onchange({target:{checked:false}});let w;globalThis.Worker=class{constructor(){w=this}postMessage(args){this.args=args}terminate(){}};
 try{el('modulationMode').onchange({target:{value:'auto'}});el('solve').onclick();assert.equal(w.args.modulationMode,'auto');assert.deepEqual(w.args.locks,{});const{harmonizeTonal,tonalIssues}=await import('../sito/public/app/tonal.mjs');const r=harmonizeTonal(w.args);assert.ok(r.solutions.length,r.diagnosis);assert.ok(r.solutions.some(s=>s.some(c=>c.tonalEvent?.key==='Sol maggiore')));for(const sol of r.solutions){assert.deepEqual(sol.map(c=>c.voices[0]),w.args.bass);sol.forEach((c,i)=>assert.deepEqual(tonalIssues(sol[i-1],c,w.args.key,3),[]))}w.onmessage({data:{result:r}});assert.match(el('resultCount').textContent,/[1-4] soluzioni/);}finally{el('clearAll').onclick();delete globalThis.Worker}
});
test('confermare Sol maggiore conserva Automatico per trovare il ritorno a Do',async()=>{
 await chromaticScore([48,57,54,55,43,53,52,48]);el('secondaryEnabled').onchange({target:{checked:false}});let w;globalThis.Worker=class{constructor(){w=this}postMessage(args){this.args=args}terminate(){this.terminated=true}};
 try{el('modulationMode').onchange({target:{value:'auto'}});el('solve').onclick();const row=el('chromaticReviewRows').children.find(row=>row.children[0].textContent.includes('Nota 3'));assert.ok(row);row.children[3].value='Sol maggiore';row.children[3].onchange();row.children[6].onclick();assert.equal(w.args.modulationMode,'auto');assert.equal(w.args.tonalEvents[0].key,'Sol maggiore');assert.equal(w.terminated,undefined);const{harmonizeTonal}=await import('../sito/public/app/tonal.mjs');const r=harmonizeTonal(w.args);assert.ok(r.solutions.length,r.diagnosis);assert.ok(r.solutions.some(sol=>sol.at(-1).key==='Do maggiore'));}finally{el('clearAll').onclick();delete globalThis.Worker}
});

test('diagnosi scaricabile contiene il basso effettivo e gli eventi inviati al motore',async()=>{
 await chromaticScore([48,54,55]);let w,blob;const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;globalThis.Worker=class{constructor(){w=this}postMessage(args){this.args=args}terminate(){}};
 try{el('solve').onclick();w.onmessage({data:{result:{solutions:[],diagnosis:'Ricerca interrotta',trace:{index:1,examples:[]}}}});const button=el('status').children.find(x=>x.textContent==='Scarica diagnosi del calcolo');assert.ok(button);URL.createObjectURL=b=>{blob=b;return 'blob:diagnosi'};URL.revokeObjectURL=()=>{};button.onclick();const data=JSON.parse(await blob.text());assert.deepEqual(data.input.bass,[48,54,55]);assert.deepEqual(data.input.locks,{});assert.deepEqual(data.input.tonalEvents,w.args.tonalEvents);assert.equal(data.trace.index,1);assert.equal(data.version,'2026.10.05-ux-1');}finally{el('clearAll').onclick();delete globalThis.Worker;URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke}
});

test('generatore: 15 battute esatte e modulazione configurabile per posizione',()=>{
 el('modulationMode').onchange({target:{value:'off'}});el('returnHome').onchange({target:{checked:false}});el('generateMode').onclick();el('generateBars').onchange({target:{value:'15'}});el('meter').onchange({target:{value:'4/4'}});el('key').onchange({target:{value:'Do maggiore'}});el('newBass').onclick();assert.equal(el('bassEditor').children.length,60);assert.match(el('measureRange').textContent,/di 15$/);
 el('addGeneratedModulation').onclick();assert.equal(el('generatedModulationKey').children[0].label,'Tonalità vicine consigliate');el('generatedModulationBar').value='8';el('generatedModulationPosition').value='2';el('generatedModulationKey').value='Sol maggiore';el('saveGeneratedModulation').onclick();el('newBass').onclick();assert.equal(el('tonalEvents').children.length,1);assert.match(el('tonalEvents').children[0].children[0].textContent,/Nota 30/);assert.equal(el('bassEditor').children.length,60);
 const ref=el('tonalEvents').children[0].children[0].children.find(x=>x.attributes?.['aria-label']==='Vai alla nota 30');assert.ok(ref);ref.onclick();assert.match(el('selectionLabel').textContent,/posizione 30/);assert.match(el('measureRange').textContent,/Battute 5–8/);el('generatedModulations').children[0].children[1].onclick();el('modulationMode').onchange({target:{value:'off'}});
});
test('ascolto in schermo intero, click accordo e cambio velocità ripartono dalla selezione',async()=>{
 await chromaticScore([48,55,48]);const {PianoSampler}=await import('../sito/public/app/piano.mjs');const saved=Object.fromEntries(['load','resume','stop','chord'].map(k=>[k,PianoSampler.prototype[k]])),sounds=[];
 try{PianoSampler.prototype.load=async()=>{};PianoSampler.prototype.resume=async()=>{};PianoSampler.prototype.stop=()=>{};PianoSampler.prototype.chord=(notes,duration)=>sounds.push({notes,duration});await el('fullscreenPlay').onclick();assert.equal(sounds[0].notes[0],48);assert.equal(el('fullscreenPlay').textContent,'Ⅱ Pausa');sounds.length=0;el('bassEditor').children[1].onclick();await Promise.resolve();await Promise.resolve();assert.equal(sounds[0].notes[0],55);sounds.length=0;el('fullscreenBpm').onchange({target:{value:'120'}});await Promise.resolve();await Promise.resolve();assert.equal(sounds[0].notes[0],55);assert.equal(sounds[0].duration,0.5);assert.equal(el('bpm').value,120);el('stop').onclick();assert.equal(el('fullscreenPlay').textContent,'▶ Ascolta');}finally{el('stop').onclick();Object.assign(PianoSampler.prototype,saved)}
});
test('riferimenti nei messaggi del worker selezionano entrambe le note',async()=>{
 await chromaticScore([48,55,48]);let worker;globalThis.Worker=class{constructor(){worker=this}postMessage(){}terminate(){}};try{el('solve').onclick();worker.onmessage({data:{result:{solutions:[],assessment:{message:'Errore tra le note 2 e 3: controlla il collegamento.'}}}});const buttons=el('status').children.filter(x=>x.className==='noteReference');assert.equal(buttons.length,2);buttons[1].onclick();assert.match(el('selectionLabel').textContent,/posizione 3/);buttons[0].onclick();assert.match(el('selectionLabel').textContent,/posizione 2/);}finally{el('clearAll').onclick();delete globalThis.Worker}
});

test('tendine del nuovo studio aprono proposte, selezione e opzioni di esportazione',async()=>{
 await chromaticScore();el('modulationsPanel').open=false;el('sidebarTools').open=false;el('detectChromaticModulations').onclick();assert.equal(el('modulationsPanel').open,true);assert.equal(el('sidebarTools').open,true);el('selectionPanel').open=false;el('bassEditor').children[0].onclick();assert.equal(el('selectionPanel').open,true);el('exportMenu').open=false;el('pdf').onclick();assert.equal(el('exportMenu').open,true);assert.equal(el('exportOptions').hidden,false);el('cancelExport').onclick();
});

test('numeri 1–8 selezionano tutte le figure solo se abilitati, senza inserire note',async()=>{
 await simpleScore();const before=el('bassEditor').children.map(x=>x.textContent);el('numberShortcuts').onchange({target:{checked:true}});for(let n=1;n<=8;n++){listeners.get('keydown')({key:String(n),target:{},preventDefault(){}});assert.equal(el('noteTools').children[n-1].className,'active')}assert.deepEqual(el('bassEditor').children.map(x=>x.textContent),before);el('numberShortcuts').onchange({target:{checked:false}});listeners.get('keydown')({key:'1',target:{},preventDefault(){}});assert.equal(el('noteTools').children[7].className,'active');el('numberShortcuts').onchange({target:{checked:true}});listeners.get('keydown')({key:'1',target:{closest:()=>true},preventDefault(){throw Error('campo intercettato')}});assert.equal(el('noteTools').children[7].className,'active');el('resetAppearance').onclick();
});
test('temi indipendenti e zoom non cambiano il basso, i PDF o i valori musicali',async()=>{
 await simpleScore();const before=el('bassEditor').children.map(x=>x.textContent);el('interfaceTheme').onchange({target:{value:'dark'}});el('scoreTheme').onchange({target:{value:'light'}});assert.equal(el('app').attributes['data-interface-theme'],'dark');assert.equal(el('app').attributes['data-score-theme'],'light');el('scoreTheme').onchange({target:{value:'dark'}});assert.equal(el('app').style['--paper'],'#000000');assert.equal(el('app').style['--paper-ink'],'#f9f9f9');el('scoreZoom').onchange({target:{value:'120'}});assert.ok(Math.abs(Number(el('staff').children[0].attributes['data-staff-space'])-19.8)<1e-9);assert.deepEqual(el('bassEditor').children.map(x=>x.textContent),before);el('resetAppearance').onclick();assert.equal(el('app').attributes['data-interface-theme'],'dark');assert.equal(el('app').attributes['data-score-theme'],'light');
});
test('fullscreen sposta la stessa barra di note, pause e alterazioni e la ripristina con Escape',async()=>{
 await simpleScore();const toolbar=el('notationToolbar');await el('fullscreenScore').onclick();assert.ok(el('scoreView').children.includes(toolbar));assert.equal(typeof el('noteTools').children[0].onclick,'function');el('noteTools').children[4].onclick();assert.equal(el('noteTools').children[4].className,'active');listeners.get('keydown')({key:'Escape',target:{},preventDefault(){}});assert.ok(el('notationToolbarHome').children.includes(toolbar));el('scoreLayout').onchange({target:{value:'paged'}});el('resetAppearance').onclick();
});

test('Seleziona battute anche vuote e Backspace rimuove la battuta, distinguendo la selezione accordo',async()=>{await simpleScore();el('scoreLayout').onchange({target:{value:'paged'}});if(el('manualMode').textContent.includes('sì'))el('manualMode').onclick();let svg=el('staff').children[0];svg.children.find(n=>n.attributes['data-measure-index']==='1').onclick();assert.equal(el('selectionLabel').textContent,'Battuta 2');listeners.get('keydown')({key:'Backspace',target:{},preventDefault(){}});assert.match(el('measureRange').textContent,/di 3/);assert.equal(el('bassEditor').children.length,4);svg=el('staff').children[0];svg.children.find(n=>n.attributes['data-measure-index']==='0').onclick();listeners.get('keydown')({key:'Backspace',target:{},preventDefault(){}});assert.equal(el('bassEditor').children.length,0);assert.match(el('measureRange').textContent,/di 2/);el('manualMode').onclick();});
test('Zoom della vista modifica dimensioni reali e conserva selezione e note',async()=>{await simpleScore();el('scoreLayout').onchange({target:{value:'pages'}});const before=parseFloat(el('staff').children[0].children.find(n=>n.tagName==='svg').style.width);el('workspaceZoom').onchange({target:{value:'200'}});const after=parseFloat(el('staff').children[0].children.find(n=>n.tagName==='svg').style.width);assert.equal(after,before*2);assert.equal(el('bassEditor').children.length,4);el('resetAppearance').onclick();el('scoreLayout').onchange({target:{value:'paged'}});});

test('Genera basso: tonalità iniziale e metrica visibili e sincronizzate con i controlli musicali',()=>{el('generateMode').onclick();assert.equal(el('generatorControls').hidden,false);assert.equal(el('generateKey').options.length,30);el('generateKey').onchange({target:{value:'Re maggiore'}});assert.equal(el('key').value,'Re maggiore');assert.equal(el('generateKey').value,'Re maggiore');el('generateMeter').onchange({target:{value:'6/8'}});assert.equal(el('meter').value,'6/8');assert.equal(el('generateMeter').value,'6/8');el('key').onchange({target:{value:'Do maggiore'}});el('meter').onchange({target:{value:'4/4'}});});
test('Tasto destro nel rigo: inserisce una pausa libera e cancella una nota vicina',()=>{el('clearAll').onclick();el('scoreLayout').onchange({target:{value:'paged'}});el('noteTools').children[3].onclick();clickQuarter(0,212.71428571428572);let svg=el('staff').children[0],guides=svg.children.filter(n=>n.attributes.class?.startsWith('beatGuide')),hit=svg.children.find(n=>n.attributes.class==='manualHit');el('noteTools').children[4].onclick();hit=el('staff').children[0].children.find(n=>n.attributes.class==='manualHit');hit.oncontextmenu({clientX:Number(guides[0].attributes.x1),clientY:242,preventDefault(){}});assert.match(el('status').textContent,/Pausa inserita/);assert.equal(el('bassEditor').children.length,1);svg=el('staff').children[0];const head=svg.children.find(n=>n.attributes.class==='noteTarget').children.find(n=>n.tagName==='ellipse');svg.children.find(n=>n.attributes.class==='manualHit').oncontextmenu({clientX:Number(head.attributes.cx),clientY:Number(head.attributes.cy),preventDefault(){}});assert.equal(el('bassEditor').children.length,0);});

test('Cadenza sull’accordo selezionato calcola subito e conferma una proposta verificata',async()=>{
 await simpleScore();el('bassEditor').children[3].onclick();el('cadenceType').value='authentic';el('selectCadence').onclick();assert.equal(el('harmonyAction').hidden,false);assert.match(el('harmonyChanges').textContent,/V → I/);assert.equal(el('confirmHarmony').hidden,false);el('confirmHarmony').onclick();assert.equal(el('harmonyAction').hidden,true);assert.match(el('status').textContent,/confermata/);el('verify').onclick();assert.match(el('feedback').textContent,/Nessuna violazione/);
});
test('MSCZ attraverso Importa apre la revisione e inserisce il basso con il modulo ZIP locale',async()=>{
 const {default:JSZip}=await import('../sito/public/vendor/jszip.cjs');const old=globalThis.JSZip;globalThis.JSZip=JSZip;
 try{const zip=new JSZip();zip.file('score.mscx','<museScore version="4.0"><Score><Staff id="1"><Measure><voice><TimeSig><sigN>4</sigN><sigD>4</sigD></TimeSig><Chord><durationType>whole</durationType><Note><pitch>43</pitch></Note></Chord></voice></Measure></Staff></Score></museScore>');const bytes=await zip.generateAsync({type:'uint8array'});await el('scoreFile').onchange({target:{files:[{name:'basso.mscz',size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}],value:'basso.mscz'}});assert.equal(el('importReview').hidden,false);assert.equal(el('confirmImport').disabled,false);el('confirmImport').onclick();assert.match(el('bassEditor').children[0].textContent,/Sol2.*Semibreve/);assert.equal(el('resultCount').textContent,'0 soluzioni')}finally{globalThis.JSZip=old}
});
test('Pannello accordi stabile durante worker, doppio clic ignorato, comandi riattivati al termine',async()=>{
 await simpleScore();el('bassEditor').children[3].onclick();el('cadenceType').value='authentic';const workers=[];globalThis.Worker=class{constructor(){workers.push(this)}postMessage(args){this.args=args}terminate(){this.terminated=true}};
 const panel=el('harmonyAction'),transitions=[];let hidden=panel.hidden,scrolls=0;Object.defineProperty(panel,'hidden',{configurable:true,get:()=>hidden,set:v=>{hidden=v;transitions.push(v)}});panel.scrollIntoView=()=>scrolls++;
 try{el('chordMenu').open=true;el('selectCadence').onclick();assert.equal(el('chordMenu').open,false);assert.equal(workers.length,1);assert.equal(panel.hidden,false);assert.equal(panel.attributes['aria-busy'],'true');assert.equal(el('cadenceType').disabled,true);assert.equal(el('calculateCadence').disabled,true);assert.notEqual(el('cancelHarmony').disabled,true);
  for(let j=0;j<5;j++)workers[0].onmessage({data:{progress:{note:j+1,total:5}}});el('calculateCadence').onclick();el('addSeventh').onclick();el('selectCadence').onclick();assert.equal(workers.length,1);assert.equal(panel.hidden,false);assert.ok(!transitions.includes(true));
  const {proposeHarmonyEdit}=await import('../sito/public/app/actions.mjs');const result=proposeHarmonyEdit(workers[0].args.action);assert.ok(result.proposals.length);workers[0].onmessage({data:{result}});assert.equal(panel.hidden,false);assert.equal(el('cadenceType').disabled,false);assert.equal(el('calculateCadence').disabled,false);assert.equal(el('confirmHarmony').disabled,false);assert.equal(scrolls,1);assert.ok(!transitions.includes(true));
  el('calculateCadence').onclick();assert.equal(workers.length,2);assert.equal(panel.hidden,false);assert.ok(!transitions.includes(true));workers[0].onmessage({data:{error:'RISPOSTA OBSOLETA'}});assert.equal(panel.attributes['aria-busy'],'true');workers[1].onmessage({data:{error:'Nessuna proposta per questa selezione'}});assert.equal(panel.hidden,false);assert.match(el('harmonyPrompt').textContent,/Nessuna proposta/);assert.equal(el('calculateCadence').disabled,false);assert.equal(scrolls,1);el('cancelHarmony').onclick();assert.equal(panel.hidden,true);assert.equal(el('selectCadence').disabled,false);
 }finally{el('cancelHarmony').onclick();delete globalThis.Worker;delete panel.scrollIntoView;Object.defineProperty(panel,'hidden',{configurable:true,writable:true,value:hidden})}
});
test('Plagale su una semibreve: conferma, tre gradi visibili, basso invariato e ricalcolo persistente',async()=>{
 el('clearAll').onclick();el('key').onchange({target:{value:'Do maggiore'}});el('modulationMode').onchange({target:{value:'off'}});el('level').onchange({target:{value:'1'}});
 const xml='<museScore><Score><Staff id="1"><Measure><voice><TimeSig><sigN>4</sigN><sigD>4</sigD></TimeSig><Chord><durationType>whole</durationType><Note><pitch>48</pitch></Note></Chord></voice></Measure></Staff></Score></museScore>';await el('scoreFile').onchange({target:{files:[{name:'semibreve.mscx',text:async()=>xml}],value:''}});el('confirmImport').onclick();el('solve').onclick();el('scoreLayout').onchange({target:{value:'paged'}});const before=el('bassEditor').children[0].textContent;el('bassEditor').children[0].onclick();el('cadenceType').value='plagal';el('selectCadence').onclick();assert.match(el('harmonyChanges').textContent,/I → IV64 → I/);el('confirmHarmony').onclick();assert.equal(el('bassEditor').children.length,1);assert.equal(el('bassEditor').children[0].textContent,before);
 const check=()=>{const svg=el('staff').children[0],groups=svg.children.filter(n=>n.attributes.class==='noteTarget');assert.equal(groups.filter(g=>g.attributes['data-voice']==='0').length,1);assert.equal(groups.length,10);assert.deepEqual(svg.children.filter(n=>n.attributes.class==='chordText').map(n=>n.textContent),['I','IV64','I']);assert.ok(groups.every(g=>g.attributes['data-note-index']==='0'));el('verify').onclick();assert.match(el('feedback').textContent,/Nessuna violazione/)};check();el('solve').onclick();check();el('bassEditor').children[0].onclick();assert.match(el('chordLabel').textContent,/I → IV64 → I/);
 const {PianoSampler}=await import('../sito/public/app/piano.mjs'),saved=Object.fromEntries(['load','resume','stop','chord'].map(k=>[k,PianoSampler.prototype[k]])),sounds=[],timers=[],oldTimeout=globalThis.setTimeout;
 try{for(const k of ['load','resume','stop'])PianoSampler.prototype[k]=async()=>{};PianoSampler.prototype.chord=(p,d)=>sounds.push({p,d});globalThis.setTimeout=(f,delay)=>{timers.push({f,delay});return 0};el('fullscreenBpm').onchange({target:{value:'120'}});await el('play').onclick();assert.equal(sounds.length,4);assert.equal(timers[0].delay,500);timers.shift().f();assert.equal(sounds.length,7);assert.equal(timers[0].delay,500);timers.shift().f();assert.equal(sounds.length,10);assert.equal(timers[0].delay,1000);assert.deepEqual(sounds.filter(s=>s.p[0]===48).map(s=>s.d),[2]);el('stop').onclick();}finally{globalThis.setTimeout=oldTimeout;Object.assign(PianoSampler.prototype,saved);el('fullscreenBpm').onchange({target:{value:'84'}})}
});
test('Audit pulsanti: tutti i 52 pulsanti attivi hanno un’azione collegata',async()=>{const {readFile}=await import('node:fs/promises');const controls=JSON.parse(await readFile(new URL('../tests/fixtures/controls-audit.json',import.meta.url)));const buttons=controls.filter(c=>c.tag==='button'&&!c.retired);assert.equal(buttons.length,52);for(const b of buttons)assert.equal(typeof el(b.id).onclick,'function',b.id)});
test('Metrica incompatibile rifiutata senza cambiare il basso né bloccare la partitura',async()=>{const before=el('bassEditor').children.map(e=>e.textContent),meter=el('meter').value;assert.doesNotThrow(()=>el('meter').onchange({target:{value:'3/4'}}));assert.equal(el('meter').value,meter);assert.deepEqual(el('bassEditor').children.map(e=>e.textContent),before);assert.match(el('status').textContent,/Metrica non applicata/);for(const bad of ['0/4','4/3',''])assert.doesNotThrow(()=>el('meter').onchange({target:{value:bad}}));assert.equal(el('meter').value,meter)});
test('Modifica una voce nel secondo accordo della cadenza: nota visibile e pin dedicato, senza modificare gli altri due accordi',()=>{if(el('manualMode').textContent.includes('no'))el('manualMode').onclick();let svg=el('staff').children[0],group=svg.children.find(g=>g.attributes.class==='noteTarget'&&g.attributes['data-index']==='1'&&g.attributes['data-voice']==='1');assert.ok(group);group.onclick();const dropdown=el('noteEditor').children[0].children[0],old=Number(dropdown.value);dropdown.value=String(old+3);dropdown.onchange();svg=el('staff').children[0];const heads=svg.children.filter(g=>g.attributes.class==='noteTarget'&&g.attributes['data-voice']==='1').map(g=>g.children.find(n=>n.tagName==='ellipse').attributes.cy);assert.ok(heads[1]<heads[0]);assert.equal(heads[0],heads[2]);assert.match(el('selectionLabel').textContent,/accordo 2/);assert.equal(el('addSeventh').disabled,true);const lock=el('noteEditor').children[0].children.find(c=>c.tagName==='button'&&c.textContent.includes('Bloccata'));assert.ok(lock);lock.onclick();assert.ok(el('noteEditor').children[0].children.some(c=>c.textContent==='◇ Blocca'));});
test('Worker che non può avviarsi: errore leggibile, nessun pannello lasciato occupato',async()=>{await simpleScore();el('bassEditor').children[3].onclick();globalThis.Worker=class{constructor(){throw Error('Worker bloccato')}};try{assert.doesNotThrow(()=>el('selectCadence').onclick());assert.equal(el('harmonyAction').attributes['aria-busy'],'false');assert.equal(el('calculateCadence').disabled,false);assert.match(el('harmonyPrompt').textContent,/non può avviarsi/);el('cancelHarmony').onclick();assert.doesNotThrow(()=>el('solve').onclick());assert.match(el('status').textContent,/non può avviarsi/);}finally{delete globalThis.Worker;el('cancelHarmony').onclick()}});
test('Cancella una nota e conserva i blocchi delle voci sulle note successive',async()=>{await simpleScore();if(el('manualMode').textContent.includes('no'))el('manualMode').onclick();el('scoreLayout').onchange({target:{value:'paged'}});let g=el('staff').children[0].children.find(g=>g.attributes.class==='noteTarget'&&g.attributes['data-index']==='2'&&g.attributes['data-voice']==='1');g.onclick();let lock=el('noteEditor').children[0].children.find(n=>n.textContent==='◇ Blocca');lock.onclick();el('bassEditor').children[0].onclick();listeners.get('keydown')({key:'Backspace',target:{},preventDefault(){}});g=el('staff').children[0].children.find(g=>g.attributes.class==='noteTarget'&&g.attributes['data-index']==='1'&&g.attributes['data-voice']==='1');g.onclick();assert.ok(el('noteEditor').children[0].children.some(n=>n.textContent==='◈ Bloccata'));});
test('Pulsanti senza note: azioni disponibili non lanciano eccezioni né lasciano worker attivi',async()=>{const {readFile}=await import('node:fs/promises'),controls=JSON.parse(await readFile(new URL('../tests/fixtures/controls-audit.json',import.meta.url)));const buttons=controls.filter(c=>c.tag==='button'&&!c.retired);for(const b of buttons){el('clearAll').onclick();el('cancelExport').onclick();el('cancelHarmony').onclick();try{if(!el(b.id).disabled&&!el(b.id).hidden)await el(b.id).onclick();}catch(e){assert.fail(b.id+': '+e.message)}finally{listeners.get('keydown')({key:'Escape',target:{},preventDefault(){}});el('importCancel').onclick();}}el('clearAll').onclick();});
test('settime automatiche: scelta dei tipi, anteprima, conferma senza selezione e ricalcolo',async()=>{
 await simpleScore();el('scoreLayout').onchange({target:{value:'paged'}});if(el('figuresOnly').textContent.includes('nascosta'))el('figuresOnly').onclick();el('automaticSevenths').onclick();assert.equal(el('automaticSeventhsOptions').hidden,false,el('status').textContent);assert.equal(el('automaticSeventhDegrees').children.length,7);el('scanSevenths').onclick();assert.equal(el('harmonyAction').hidden,false);assert.match(el('harmonyChanges').textContent,/settime aggiunte/);assert.ok(el('staff').children[0].children.every(n=>n.textContent!=='V7'));el('confirmHarmony').onclick();assert.match(el('status').textContent,/Settime aggiunte/);assert.ok(el('staff').children[0].children.some(n=>n.textContent==='V7'));el('verify').onclick();assert.match(el('feedback').textContent,/Nessuna violazione/);el('solve').onclick();assert.ok(el('staff').children[0].children.some(n=>n.textContent==='V7'));
});
test('opzioni densità PDF visibili solo per PDF',()=>{el('pdf').onclick();assert.equal(el('pdfDensityOptions').hidden,false);el('cancelExport').onclick();el('musicxml').onclick();assert.equal(el('pdfDensityOptions').hidden,true);el('cancelExport').onclick();});

test('Immagini rifiutate senza richieste di rete o attivazione del riconoscimento',async()=>{
 const oldLocation=globalThis.location,oldFetch=globalThis.fetch,oldStorage=globalThis.localStorage;let stored=null,calls=0;
 try{
  globalThis.location={hostname:'armonizza-basso.manuelonthewebs.chatgpt.site',href:'https://armonizza-basso.manuelonthewebs.chatgpt.site/'};globalThis.localStorage={getItem:()=>null,setItem:(k,v)=>{stored=v}};
  globalThis.fetch=async url=>{calls++;assert.equal(url,'https://prova.netlify.app/api/omr?health=1');return new Response(JSON.stringify({available:true}),{headers:{'Content-Type':'application/json'}})};
  const {initImport}=await import('../sito/public/app/import-ui.mjs');const ui=initImport({onInsert:()=>{},onStatus:()=>{}});
  await ui.load({name:'scan.png',type:'image/png',size:100});assert.equal(calls,0);assert.equal(el('omrConnection').hidden,true);assert.equal(el('pasteImage').hidden,true);assert.match(el('importMessage').textContent,/rimosso/);ui.cancel();
  assert.equal(stored,null);assert.equal(el('confirmImport').disabled,true);
 }finally{globalThis.location=oldLocation;globalThis.fetch=oldFetch;globalThis.localStorage=oldStorage}
});




